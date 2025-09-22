#!/usr/bin/env python3
"""
SafeRide Backend API Tests
Tests all backend endpoints with realistic data
"""

import requests
import json
import time
from typing import Dict, Any

# Configuration
BASE_URL = "https://safety-ride.preview.emergentagent.com/api"

# Test data
TEST_USER_DATA = {
    "email": "teste@saferide.com",
    "password": "123456",
    "name": "Maria Santos",
    "vehicle_plate": "XYZ5678"
}

TEST_LOCATION = {
    "latitude": -23.5505,  # São Paulo coordinates
    "longitude": -46.6333
}

class SafeRideAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.user_data = None
        self.emergency_id = None
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status} {test_name}")
        if details:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        
        default_headers = {"Content-Type": "application/json"}
        if headers:
            default_headers.update(headers)
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=default_headers, params=data, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=default_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            print(f"   Request: {method} {url}")
            print(f"   Status: {response.status_code}")
            if response.text:
                try:
                    response_json = response.json()
                    print(f"   Response: {json.dumps(response_json, indent=2)}")
                except:
                    print(f"   Response: {response.text[:200]}...")
            
            return response
            
        except requests.exceptions.RequestException as e:
            print(f"   Request failed: {str(e)}")
            raise
    
    def test_user_registration(self) -> bool:
        """Test user registration endpoint"""
        print("\n" + "="*50)
        print("TESTING USER REGISTRATION")
        print("="*50)
        
        try:
            response = self.make_request("POST", "/register", TEST_USER_DATA)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ["access_token", "token_type", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("User Registration", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Validate user data
                user = data["user"]
                user_fields = ["id", "email", "name", "vehicle_plate"]
                missing_user_fields = [field for field in user_fields if field not in user]
                
                if missing_user_fields:
                    self.log_test("User Registration", False, f"Missing user fields: {missing_user_fields}")
                    return False
                
                # Store auth token and user data for subsequent tests
                self.auth_token = data["access_token"]
                self.user_data = user
                
                self.log_test("User Registration", True, f"User registered successfully with ID: {user['id']}")
                return True
                
            elif response.status_code == 400:
                # Check if user already exists
                error_detail = response.json().get("detail", "")
                if "already registered" in error_detail:
                    self.log_test("User Registration", True, "User already exists (expected behavior)")
                    return True
                else:
                    self.log_test("User Registration", False, f"Bad request: {error_detail}")
                    return False
            else:
                self.log_test("User Registration", False, f"Unexpected status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("User Registration", False, f"Exception: {str(e)}")
            return False
    
    def test_user_login(self) -> bool:
        """Test user login endpoint"""
        print("\n" + "="*50)
        print("TESTING USER LOGIN")
        print("="*50)
        
        # Test valid login
        try:
            login_data = {
                "email": TEST_USER_DATA["email"],
                "password": TEST_USER_DATA["password"]
            }
            
            response = self.make_request("POST", "/login", login_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ["access_token", "token_type", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Valid Login", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Store auth token if not already set
                if not self.auth_token:
                    self.auth_token = data["access_token"]
                    self.user_data = data["user"]
                
                self.log_test("Valid Login", True, "Login successful with valid credentials")
                
                # Test invalid login
                invalid_login_data = {
                    "email": TEST_USER_DATA["email"],
                    "password": "wrong_password"
                }
                
                response = self.make_request("POST", "/login", invalid_login_data)
                
                if response.status_code == 401:
                    self.log_test("Invalid Login", True, "Correctly rejected invalid credentials")
                    return True
                else:
                    self.log_test("Invalid Login", False, f"Should have returned 401, got {response.status_code}")
                    return False
                    
            else:
                self.log_test("Valid Login", False, f"Login failed with status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("User Login", False, f"Exception: {str(e)}")
            return False
    
    def test_emergency_creation(self) -> bool:
        """Test emergency creation endpoint"""
        print("\n" + "="*50)
        print("TESTING EMERGENCY CREATION")
        print("="*50)
        
        if not self.auth_token:
            self.log_test("Emergency Creation", False, "No auth token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            emergency_data = TEST_LOCATION.copy()
            
            response = self.make_request("POST", "/emergency", emergency_data, headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ["id", "user_id", "user_name", "vehicle_plate", "latitude", "longitude", "is_active"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Emergency Creation", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Store emergency ID for cleanup
                self.emergency_id = data["id"]
                
                self.log_test("Emergency Creation", True, f"Emergency created successfully with ID: {data['id']}")
                
                # Test creating multiple emergencies (should fail)
                response2 = self.make_request("POST", "/emergency", emergency_data, headers)
                
                if response2.status_code == 400:
                    error_detail = response2.json().get("detail", "")
                    if "already have an active emergency" in error_detail:
                        self.log_test("Multiple Emergency Prevention", True, "Correctly prevented multiple active emergencies")
                        return True
                    else:
                        self.log_test("Multiple Emergency Prevention", False, f"Wrong error message: {error_detail}")
                        return False
                else:
                    self.log_test("Multiple Emergency Prevention", False, f"Should have returned 400, got {response2.status_code}")
                    return False
                    
            else:
                self.log_test("Emergency Creation", False, f"Failed with status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Emergency Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_nearby_emergencies(self) -> bool:
        """Test nearby emergencies endpoint"""
        print("\n" + "="*50)
        print("TESTING NEARBY EMERGENCIES")
        print("="*50)
        
        if not self.auth_token:
            self.log_test("Nearby Emergencies", False, "No auth token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            params = TEST_LOCATION.copy()
            
            response = self.make_request("GET", "/emergencies/nearby", params, headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return a list
                if not isinstance(data, list):
                    self.log_test("Nearby Emergencies", False, "Response should be a list")
                    return False
                
                self.log_test("Nearby Emergencies", True, f"Retrieved {len(data)} nearby emergencies")
                
                # Validate structure if there are emergencies
                if data:
                    emergency = data[0]
                    required_fields = ["id", "user_id", "user_name", "vehicle_plate", "latitude", "longitude", "distance_km"]
                    missing_fields = [field for field in required_fields if field not in emergency]
                    
                    if missing_fields:
                        self.log_test("Emergency Structure", False, f"Missing fields in emergency: {missing_fields}")
                        return False
                    else:
                        self.log_test("Emergency Structure", True, "Emergency data structure is correct")
                
                return True
                
            else:
                self.log_test("Nearby Emergencies", False, f"Failed with status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Nearby Emergencies", False, f"Exception: {str(e)}")
            return False
    
    def test_location_update(self) -> bool:
        """Test location update endpoint"""
        print("\n" + "="*50)
        print("TESTING LOCATION UPDATE")
        print("="*50)
        
        if not self.auth_token:
            self.log_test("Location Update", False, "No auth token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            # Include user_id as required by the UserLocation model
            location_data = TEST_LOCATION.copy()
            location_data["user_id"] = self.user_data["id"] if self.user_data else "dummy_id"
            
            response = self.make_request("POST", "/location", location_data, headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return success message
                if "message" in data and "updated" in data["message"].lower():
                    self.log_test("Location Update", True, "Location updated successfully")
                    return True
                else:
                    self.log_test("Location Update", False, f"Unexpected response: {data}")
                    return False
                    
            else:
                self.log_test("Location Update", False, f"Failed with status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Location Update", False, f"Exception: {str(e)}")
            return False
    
    def test_get_user_settings(self) -> bool:
        """Test get user settings endpoint"""
        print("\n" + "="*50)
        print("TESTING GET USER SETTINGS")
        print("="*50)
        
        if not self.auth_token:
            self.log_test("Get User Settings", False, "No auth token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            response = self.make_request("GET", "/settings", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ["emergency_contacts", "alert_distance_km"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Get User Settings", False, f"Missing fields: {missing_fields}")
                    return False
                
                # Check default values when no settings saved
                if isinstance(data["emergency_contacts"], list) and isinstance(data["alert_distance_km"], (int, float)):
                    self.log_test("Get User Settings", True, f"Settings retrieved successfully. Default distance: {data['alert_distance_km']}km, Contacts: {len(data['emergency_contacts'])}")
                    return True
                else:
                    self.log_test("Get User Settings", False, f"Invalid data types in response: {data}")
                    return False
                    
            else:
                self.log_test("Get User Settings", False, f"Failed with status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get User Settings", False, f"Exception: {str(e)}")
            return False
    
    def test_update_user_settings(self) -> bool:
        """Test update user settings endpoint with validation"""
        print("\n" + "="*50)
        print("TESTING UPDATE USER SETTINGS")
        print("="*50)
        
        if not self.auth_token:
            self.log_test("Update User Settings", False, "No auth token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # Test 1: Valid settings update
            valid_settings = {
                "emergency_contacts": ["(11) 99999-9999", "(11) 88888-8888"],
                "alert_distance_km": 5.0
            }
            
            response = self.make_request("POST", "/settings", valid_settings, headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                if "emergency_contacts" in data and "alert_distance_km" in data:
                    if data["emergency_contacts"] == valid_settings["emergency_contacts"] and data["alert_distance_km"] == valid_settings["alert_distance_km"]:
                        self.log_test("Valid Settings Update", True, "Settings updated successfully with valid data")
                    else:
                        self.log_test("Valid Settings Update", False, f"Response data doesn't match input: {data}")
                        return False
                else:
                    self.log_test("Valid Settings Update", False, f"Missing fields in response: {data}")
                    return False
            else:
                self.log_test("Valid Settings Update", False, f"Failed with status: {response.status_code}")
                return False
            
            # Test 2: Validation - too few contacts (should fail)
            invalid_settings_few = {
                "emergency_contacts": [],
                "alert_distance_km": 5.0
            }
            
            response = self.make_request("POST", "/settings", invalid_settings_few, headers)
            
            if response.status_code == 422:  # Validation error
                self.log_test("Validation - Min Contacts", True, "Correctly rejected empty contacts list")
            else:
                self.log_test("Validation - Min Contacts", False, f"Should have returned 422, got {response.status_code}")
                return False
            
            # Test 3: Validation - too many contacts (should fail)
            invalid_settings_many = {
                "emergency_contacts": ["(11) 11111-1111", "(11) 22222-2222", "(11) 33333-3333", "(11) 44444-4444", "(11) 55555-5555", "(11) 66666-6666"],
                "alert_distance_km": 5.0
            }
            
            response = self.make_request("POST", "/settings", invalid_settings_many, headers)
            
            if response.status_code == 422:  # Validation error
                self.log_test("Validation - Max Contacts", True, "Correctly rejected too many contacts")
            else:
                self.log_test("Validation - Max Contacts", False, f"Should have returned 422, got {response.status_code}")
                return False
            
            # Test 4: Validation - invalid distance (too small)
            invalid_settings_distance_small = {
                "emergency_contacts": ["(11) 99999-9999"],
                "alert_distance_km": 0.0005  # Below minimum 0.001
            }
            
            response = self.make_request("POST", "/settings", invalid_settings_distance_small, headers)
            
            if response.status_code == 422:  # Validation error
                self.log_test("Validation - Min Distance", True, "Correctly rejected distance below minimum")
            else:
                self.log_test("Validation - Min Distance", False, f"Should have returned 422, got {response.status_code}")
                return False
            
            # Test 5: Validation - invalid distance (too large)
            invalid_settings_distance_large = {
                "emergency_contacts": ["(11) 99999-9999"],
                "alert_distance_km": 15.0  # Above maximum 10.0
            }
            
            response = self.make_request("POST", "/settings", invalid_settings_distance_large, headers)
            
            if response.status_code == 422:  # Validation error
                self.log_test("Validation - Max Distance", True, "Correctly rejected distance above maximum")
            else:
                self.log_test("Validation - Max Distance", False, f"Should have returned 422, got {response.status_code}")
                return False
            
            # Test 6: Validation - invalid phone number format
            invalid_settings_phone = {
                "emergency_contacts": ["invalid-phone"],
                "alert_distance_km": 5.0
            }
            
            response = self.make_request("POST", "/settings", invalid_settings_phone, headers)
            
            if response.status_code == 400:  # Bad request for invalid phone
                self.log_test("Validation - Invalid Phone", True, "Correctly rejected invalid phone number format")
            else:
                self.log_test("Validation - Invalid Phone", False, f"Should have returned 400, got {response.status_code}")
                return False
            
            return True
                
        except Exception as e:
            self.log_test("Update User Settings", False, f"Exception: {str(e)}")
            return False
    
    def test_nearby_emergencies_with_custom_distance(self) -> bool:
        """Test that nearby emergencies uses user's configured distance"""
        print("\n" + "="*50)
        print("TESTING NEARBY EMERGENCIES WITH CUSTOM DISTANCE")
        print("="*50)
        
        if not self.auth_token:
            self.log_test("Nearby Emergencies Custom Distance", False, "No auth token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            # First, set a custom distance (2km)
            custom_settings = {
                "emergency_contacts": ["(11) 99999-9999"],
                "alert_distance_km": 2.0
            }
            
            response = self.make_request("POST", "/settings", custom_settings, headers)
            
            if response.status_code != 200:
                self.log_test("Nearby Emergencies Custom Distance", False, "Failed to set custom distance")
                return False
            
            # Now test nearby emergencies - it should use the 2km distance
            params = TEST_LOCATION.copy()
            
            response = self.make_request("GET", "/emergencies/nearby", params, headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return a list
                if not isinstance(data, list):
                    self.log_test("Nearby Emergencies Custom Distance", False, "Response should be a list")
                    return False
                
                # Check that any returned emergencies are within 2km (our custom setting)
                for emergency in data:
                    if "distance_km" in emergency:
                        if emergency["distance_km"] > 2.0:
                            self.log_test("Nearby Emergencies Custom Distance", False, f"Emergency found beyond custom distance: {emergency['distance_km']}km > 2.0km")
                            return False
                
                self.log_test("Nearby Emergencies Custom Distance", True, f"Successfully used custom distance setting (2km). Found {len(data)} emergencies within range")
                return True
                
            else:
                self.log_test("Nearby Emergencies Custom Distance", False, f"Failed with status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Nearby Emergencies Custom Distance", False, f"Exception: {str(e)}")
            return False
    
    def cleanup_emergency(self):
        """Clean up created emergency"""
        if self.emergency_id and self.auth_token:
            try:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                response = self.make_request("DELETE", f"/emergency/{self.emergency_id}", headers=headers)
                if response.status_code == 200:
                    print(f"\n✅ Cleaned up emergency {self.emergency_id}")
                else:
                    print(f"\n⚠️  Failed to cleanup emergency {self.emergency_id}")
            except Exception as e:
                print(f"\n⚠️  Exception during cleanup: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting SafeRide Backend API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"👤 Test User: {TEST_USER_DATA['email']}")
        
        results = []
        
        # Test sequence
        results.append(("User Registration", self.test_user_registration()))
        results.append(("User Login", self.test_user_login()))
        results.append(("Get User Settings", self.test_get_user_settings()))
        results.append(("Update User Settings", self.test_update_user_settings()))
        results.append(("Emergency Creation", self.test_emergency_creation()))
        results.append(("Nearby Emergencies", self.test_nearby_emergencies()))
        results.append(("Nearby Emergencies Custom Distance", self.test_nearby_emergencies_with_custom_distance()))
        results.append(("Location Update", self.test_location_update()))
        
        # Cleanup
        self.cleanup_emergency()
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = 0
        failed = 0
        
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
            if result:
                passed += 1
            else:
                failed += 1
        
        print(f"\nTotal: {len(results)} tests")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        
        if failed == 0:
            print("\n🎉 All tests passed!")
        else:
            print(f"\n⚠️  {failed} test(s) failed")
        
        return failed == 0

def main():
    """Main test execution"""
    tester = SafeRideAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())