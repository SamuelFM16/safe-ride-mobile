from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
import logging
import socketio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import hashlib
from passlib.context import CryptContext
from jose import JWTError, jwt
import math
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = "your-super-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()

# Create Socket.IO server
sio = socketio.AsyncServer(cors_allowed_origins="*", async_mode='asgi')
socket_app = socketio.ASGIApp(sio)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    vehicle_plate: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    vehicle_plate: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserSettings(BaseModel):
    emergency_contacts: List[str] = Field(default_factory=list)  # Phone numbers
    alert_distance_km: float = Field(default=10.0)  # Distance in kilometers

class UserSettingsUpdate(BaseModel):
    emergency_contacts: List[str] = Field(..., min_items=1, max_items=5)
    alert_distance_km: float = Field(..., ge=0.001, le=10.0)  # 1m to 10km

class DeviceBinding(BaseModel):
    user_id: str
    device_id: str
    device_name: str
    device_brand: str
    subscription_type: str
    bound_at: datetime = Field(default_factory=datetime.utcnow)

class SubscriptionUpdate(BaseModel):
    device_id: str
    device_name: str
    device_brand: str
    subscription_type: str
    expires_at: datetime

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    message: str
    latitude: float
    longitude: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    message_type: str = "text"  # text, emergency, location

class ChatMessageCreate(BaseModel):
    message: str
    latitude: float
    longitude: float
    message_type: str = "text"

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class EmergencyCreate(BaseModel):
    latitude: float
    longitude: float

class Emergency(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    vehicle_plate: str
    latitude: float
    longitude: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserLocation(BaseModel):
    user_id: str
    latitude: float
    longitude: float
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in kilometers using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    
    return distance

async def send_reset_email(email: str, reset_token: str):
    """Send password reset email (simplified version for demo)"""
    try:
        # In production, you would use a proper email service like SendGrid, AWS SES, etc.
        # For now, we'll just log the reset link
        reset_link = f"https://your-app.com/reset-password?token={reset_token}"
        
        print(f"🔐 Password Reset Request")
        print(f"📧 Email: {email}")
        print(f"🔗 Reset Link: {reset_link}")
        print(f"⏱️ Valid for 15 minutes")
        
        # TODO: Implement actual email sending
        # Example with SendGrid or similar service:
        # message = f"Click here to reset your password: {reset_link}"
        # send_email(to=email, subject="SafeRide - Reset Password", body=message)
        
        return True
    except Exception as e:
        print(f"Error sending reset email: {e}")
        return False

# Authentication endpoints
@api_router.post("/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    # Check if user exists
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a reset link will be sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=15)  # 15 minutes expiry
    
    # Store reset token in database
    await db.password_resets.insert_one({
        "email": request.email,
        "token": reset_token,
        "expires_at": expires_at,
        "used": False,
        "created_at": datetime.utcnow()
    })
    
    # Send reset email
    email_sent = await send_reset_email(request.email, reset_token)
    
    if email_sent:
        return {"message": "If the email exists, a reset link will be sent"}
    else:
        raise HTTPException(status_code=500, detail="Error sending reset email")

@api_router.post("/reset-password")
async def reset_password(request: PasswordReset):
    # Find valid reset token
    reset_record = await db.password_resets.find_one({
        "token": request.token,
        "used": False,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Update user password
    hashed_password = get_password_hash(request.new_password)
    result = await db.users.update_one(
        {"email": reset_record["email"]},
        {"$set": {"password": hashed_password}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

@api_router.post("/register", response_model=Token)
async def register(user_create: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_create.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_create.password)
    user_dict = user_create.dict()
    user_dict["password"] = hashed_password
    user_obj = User(**{k: v for k, v in user_dict.items() if k != "password"})
    
    # Save to database
    await db.users.insert_one({**user_obj.dict(), "password": hashed_password})
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    # Find user
    user_data = await db.users.find_one({"email": user_login.email})
    if not user_data or not verify_password(user_login.password, user_data["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user_obj = User(**{k: v for k, v in user_data.items() if k != "password"})
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

# Emergency endpoints
@api_router.post("/emergency", response_model=Emergency)
async def create_emergency(emergency_create: EmergencyCreate, current_user: User = Depends(get_current_user)):
    # Check if user already has an active emergency
    existing_emergency = await db.emergencies.find_one({
        "user_id": current_user.id,
        "is_active": True
    })
    
    if existing_emergency:
        raise HTTPException(status_code=400, detail="You already have an active emergency")
    
    # Create emergency
    emergency_obj = Emergency(
        user_id=current_user.id,
        user_name=current_user.name,
        vehicle_plate=current_user.vehicle_plate,
        latitude=emergency_create.latitude,
        longitude=emergency_create.longitude
    )
    
    # Save to database
    await db.emergencies.insert_one(emergency_obj.dict())
    
    # Notify nearby users via WebSocket
    await sio.emit('emergency_alert', {
        'emergency_id': emergency_obj.id,
        'user_name': emergency_obj.user_name,
        'vehicle_plate': emergency_obj.vehicle_plate,
        'latitude': emergency_obj.latitude,
        'longitude': emergency_obj.longitude,
        'created_at': emergency_obj.created_at.isoformat()
    })
    
    return emergency_obj

@api_router.get("/emergencies/nearby")
async def get_nearby_emergencies(
    latitude: float,
    longitude: float,
    current_user: User = Depends(get_current_user)
):
    # Get user's settings for alert distance
    user_settings = await db.user_settings.find_one({"user_id": current_user.id})
    alert_distance = user_settings.get("alert_distance_km", 10.0) if user_settings else 10.0
    
    # Get all active emergencies
    emergencies = await db.emergencies.find({"is_active": True}).to_list(1000)
    
    # Filter emergencies within user's preferred radius
    nearby_emergencies = []
    for emergency in emergencies:
        if emergency["user_id"] != current_user.id:  # Don't show own emergency
            distance = calculate_distance(
                latitude, longitude,
                emergency["latitude"], emergency["longitude"]
            )
            if distance <= alert_distance:  # Within user's preferred radius
                emergency_obj = Emergency(**emergency)
                nearby_emergencies.append({
                    **emergency_obj.dict(),
                    "distance_km": round(distance, 2)
                })
    
    return nearby_emergencies

# User Settings endpoints
@api_router.get("/settings", response_model=UserSettings)
async def get_user_settings(current_user: User = Depends(get_current_user)):
    settings = await db.user_settings.find_one({"user_id": current_user.id})
    
    if not settings:
        # Return default settings
        default_settings = UserSettings()
        return default_settings
    
    return UserSettings(**{k: v for k, v in settings.items() if k != "_id" and k != "user_id"})

# Device Binding endpoints
@api_router.post("/subscription/bind-device")
async def bind_device_to_subscription(
    subscription_data: SubscriptionUpdate, 
    current_user: User = Depends(get_current_user)
):
    # Check if this subscription is already bound to another device
    existing_binding = await db.device_bindings.find_one({
        "user_id": current_user.id,
        "subscription_type": subscription_data.subscription_type
    })
    
    if existing_binding and existing_binding["device_id"] != subscription_data.device_id:
        raise HTTPException(
            status_code=409, 
            detail=f"Esta assinatura já está ativa no dispositivo: {existing_binding['device_name']} ({existing_binding['device_brand']}). Cancele a assinatura no outro dispositivo primeiro."
        )
    
    # Bind device to subscription
    binding_data = DeviceBinding(
        user_id=current_user.id,
        device_id=subscription_data.device_id,
        device_name=subscription_data.device_name,
        device_brand=subscription_data.device_brand,
        subscription_type=subscription_data.subscription_type
    )
    
    await db.device_bindings.update_one(
        {"user_id": current_user.id},
        {"$set": binding_data.dict()},
        upsert=True
    )
    
    # Update user subscription
    await db.user_subscriptions.update_one(
        {"user_id": current_user.id},
        {"$set": {
            "type": subscription_data.subscription_type,
            "expires_at": subscription_data.expires_at,
            "device_id": subscription_data.device_id,
            "updated_at": datetime.utcnow()
        }},
        upsert=True
    )
    
    return {"message": "Device bound to subscription successfully"}

@api_router.get("/subscription/check-device")
async def check_device_binding(
    device_id: str,
    current_user: User = Depends(get_current_user)
):
    binding = await db.device_bindings.find_one({
        "user_id": current_user.id,
        "device_id": device_id
    })
    
    if not binding:
        raise HTTPException(status_code=404, detail="No subscription found for this device")
    
    subscription = await db.user_subscriptions.find_one({"user_id": current_user.id})
    
    return {
        "device_bound": True,
        "device_name": binding["device_name"],
        "subscription_type": binding["subscription_type"],
        "expires_at": subscription.get("expires_at") if subscription else None
    }

# Chat endpoints
@api_router.post("/chat/send", response_model=ChatMessage)
async def send_chat_message(
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user)
):
    # Create chat message
    chat_message = ChatMessage(
        user_id=current_user.id,
        user_name=current_user.name,
        message=message_data.message,
        latitude=message_data.latitude,
        longitude=message_data.longitude,
        message_type=message_data.message_type
    )
    
    # Save to database
    await db.chat_messages.insert_one(chat_message.dict())
    
    # Get user's alert distance preference
    user_settings = await db.user_settings.find_one({"user_id": current_user.id})
    alert_distance = user_settings.get("alert_distance_km", 10.0) if user_settings else 10.0
    
    # Emit to nearby users via WebSocket
    await sio.emit('new_chat_message', {
        'message_id': chat_message.id,
        'user_name': chat_message.user_name,
        'message': chat_message.message,
        'latitude': chat_message.latitude,
        'longitude': chat_message.longitude,
        'message_type': chat_message.message_type,
        'created_at': chat_message.created_at.isoformat(),
        'alert_distance_km': alert_distance
    })
    
    return chat_message

@api_router.get("/chat/nearby")
async def get_nearby_chat_messages(
    latitude: float,
    longitude: float,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    # Get user's alert distance preference
    user_settings = await db.user_settings.find_one({"user_id": current_user.id})
    alert_distance = user_settings.get("alert_distance_km", 10.0) if user_settings else 10.0
    
    # Get recent chat messages (last 24 hours)
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    
    chat_messages = await db.chat_messages.find({
        "created_at": {"$gte": twenty_four_hours_ago}
    }).sort("created_at", -1).limit(limit * 3).to_list(limit * 3)  # Get more to filter by distance
    
    # Filter messages within user's preferred radius
    nearby_messages = []
    for message in chat_messages:
        distance = calculate_distance(
            latitude, longitude,
            message["latitude"], message["longitude"]
        )
        if distance <= alert_distance:
            message_obj = ChatMessage(**message)
            nearby_messages.append({
                **message_obj.dict(),
                "distance_km": round(distance, 2)
            })
    
    # Return only the requested limit
    return nearby_messages[:limit]

@api_router.delete("/chat/{message_id}")
async def delete_chat_message(message_id: str, current_user: User = Depends(get_current_user)):
    # Only allow user to delete their own messages
    result = await db.chat_messages.delete_one({
        "id": message_id,
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found or not authorized")
    
    # Notify via WebSocket that message was deleted
    await sio.emit('chat_message_deleted', {'message_id': message_id})
    
    return {"message": "Chat message deleted"}

@api_router.post("/settings", response_model=UserSettings)
async def update_user_settings(
    settings_update: UserSettingsUpdate, 
    current_user: User = Depends(get_current_user)
):
    # Validate phone numbers format (basic validation)
    for contact in settings_update.emergency_contacts:
        if not contact.strip():
            raise HTTPException(status_code=400, detail="Contact number cannot be empty")
        
        # Basic phone number validation (remove spaces, check if it's mostly digits)
        clean_number = contact.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not clean_number.replace("+", "").isdigit() or len(clean_number) < 8:
            raise HTTPException(status_code=400, detail=f"Invalid phone number format: {contact}")
    
    settings_dict = settings_update.dict()
    settings_dict["user_id"] = current_user.id
    settings_dict["updated_at"] = datetime.utcnow()
    
    # Update or insert user settings
    await db.user_settings.update_one(
        {"user_id": current_user.id},
        {"$set": settings_dict},
        upsert=True
    )
    
    return UserSettings(**{k: v for k, v in settings_dict.items() if k != "_id" and k != "user_id" and k != "updated_at"})

@api_router.get("/user/active-emergency")
async def get_user_active_emergency(current_user: User = Depends(get_current_user)):
    # Get user's active emergency
    emergency = await db.emergencies.find_one({
        "user_id": current_user.id,
        "is_active": True
    })
    
    if not emergency:
        raise HTTPException(status_code=404, detail="No active emergency found")
    
    return Emergency(**emergency)

@api_router.post("/emergency/cancel")
async def cancel_user_emergency(current_user: User = Depends(get_current_user)):
    # Find and cancel user's active emergency
    result = await db.emergencies.update_one(
        {"user_id": current_user.id, "is_active": True},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No active emergency found")
    
    # Get the emergency ID for WebSocket notification
    emergency = await db.emergencies.find_one({
        "user_id": current_user.id,
        "is_active": False
    }, sort=[("created_at", -1)])
    
    if emergency:
        # Notify via WebSocket that emergency is resolved
        await sio.emit('emergency_resolved', {'emergency_id': emergency["id"]})
    
    return {"message": "Emergency canceled successfully"}

@api_router.post("/emergency/cancel")
async def cancel_user_emergency(current_user: User = Depends(get_current_user)):
    # Find and cancel user's active emergency
    result = await db.emergencies.update_one(
        {"user_id": current_user.id, "is_active": True},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No active emergency found")
    
    # Get the emergency ID for WebSocket notification
    emergency = await db.emergencies.find_one({
        "user_id": current_user.id,
        "is_active": False
    }, sort=[("created_at", -1)])
    
    if emergency:
        # Notify via WebSocket that emergency is resolved
        await sio.emit('emergency_resolved', {'emergency_id': emergency["id"]})
    
    return {"message": "Emergency canceled successfully"}

@api_router.delete("/emergency/{emergency_id}")
async def deactivate_emergency(emergency_id: str, current_user: User = Depends(get_current_user)):
    # Update emergency to inactive
    result = await db.emergencies.update_one(
        {"id": emergency_id, "user_id": current_user.id},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Emergency not found")
    
    # Notify via WebSocket that emergency is resolved
    await sio.emit('emergency_resolved', {'emergency_id': emergency_id})
    
    return {"message": "Emergency deactivated"}

@api_router.post("/location")
async def update_location(location: UserLocation, current_user: User = Depends(get_current_user)):
    location.user_id = current_user.id
    
    # Update or insert user location
    await db.user_locations.update_one(
        {"user_id": current_user.id},
        {"$set": location.dict()},
        upsert=True
    )
    
    return {"message": "Location updated"}

# Socket.IO events
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")

@sio.event
async def join_location_updates(sid, data):
    """Join a room for location-based updates"""
    # You could implement room-based updates here
    await sio.enter_room(sid, "location_updates")

# Include the router in the main app
app.include_router(api_router)

# Mount Socket.IO
app.mount("/socket.io", socket_app)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()