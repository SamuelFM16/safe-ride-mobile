#!/bin/bash

# Function to start the frontend
start_frontend() {
    cd /app/frontend || exit 1
    echo "Starting Expo development server with CORS configuration..."
    export EXPO_TUNNEL_SUBDOMAIN="safety-ride"
    export EXPO_PACKAGER_HOSTNAME="safety-ride.preview.emergentagent.com"
    
    # Set environment variables for CORS
    export EXPO_DEV_SERVER_ALLOWED_HOSTS="app.emergent.sh,safety-ride.preview.emergentagent.com,localhost"
    export EXPO_DEV_SERVER_ORIGIN_WHITELIST="https://app.emergent.sh,https://safety-ride.preview.emergentagent.com"
    
    exec yarn start --tunnel --port 3000 --dev-client
}

# Function to start the backend
start_backend() {
    cd /app/backend || exit 1
    echo "Starting FastAPI backend server..."
    exec uvicorn server:app --host 0.0.0.0 --port 8001 --reload
}

# Check if we're running frontend or backend
if [ "$1" == "frontend" ]; then
    start_frontend
elif [ "$1" == "backend" ]; then
    start_backend
else
    echo "Usage: $0 {frontend|backend}"
    exit 1
fi