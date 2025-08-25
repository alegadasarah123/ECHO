<<<<<<< HEAD
=======
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import requests
import time
import json

# Initialize Supabase client with anon key (for data queries)
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# Use service role key for admin operations like creating users
SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY 
SUPABASE_URL = settings.SUPABASE_URL

@api_view(['GET'])
def get_data(request):
    try:
        data = supabase.table("kutsero_profile").select("*").execute()
        return Response(data.data)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def insert_kutsero_profile(request):
    try:
        payload = {
            "kutsero_id": request.data.get("kutseroId"),  # UUID from auth.users
            "kutsero_fname": request.data.get("firstName"),
            "kutsero_mname": request.data.get("middleName"),
            "kutsero_lname": request.data.get("lastName"),
            "kutsero_dob": request.data.get("dob"),
            "kutsero_sex": request.data.get("sex"),
            "kutsero_phone_num": request.data.get("phoneNumber"),
            "kutsero_province": request.data.get("province"),
            "kutsero_city": request.data.get("city"),
            "kutsero_municipality": request.data.get("municipality"),  
            "kutsero_brgy": request.data.get("barangay"),
            "kutsero_zipcode": request.data.get("zipCode"),
            "kutsero_email": request.data.get("email"),
            "kutsero_fb": request.data.get("facebook")   
        }

        data = supabase.table("kutsero_profile").insert(payload).execute()

        if hasattr(data, 'data') and data.data:
            return Response({"message": "Kutsero profile created", "data": data.data})
        else:
            return Response({"error": "Failed to insert profile"}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def signup(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Generate username if not provided
        username = request.data.get("username")
        if not username:
            # Auto-generate username from first and last name
            first_name = request.data.get("firstName", "").strip()
            last_name = request.data.get("lastName", "").strip()
            if first_name and last_name:
                username = f"{first_name.lower()}.{last_name.lower()}"
            else:
                # Fallback: use part of email
                username = email.split('@')[0]

        # Create user in Supabase Auth
        signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        }
        payload_auth = {
            "email": email,
            "password": password
        }

        auth_response = requests.post(signup_url, json=payload_auth, headers=headers)
        auth_json = auth_response.json()
        print("Supabase Auth response:", auth_response.status_code, auth_json)

        # Accept both 200 and 201 as success
        if auth_response.status_code not in [200, 201]:
            return Response({
                "error": "Failed to create user in Supabase Auth",
                "details": auth_json
            }, status=status.HTTP_400_BAD_REQUEST)

        user_id = auth_json.get('id') or auth_json.get('user', {}).get('id')
        if not user_id:
            return Response({"error": "Supabase Auth did not return a user ID"}, status=status.HTTP_400_BAD_REQUEST)

        # STEP 1: Insert into users table first (with pending status)
        user_payload = {
            "id": user_id,  # Use the UUID from auth
            "role": "kutsero",  # Set default role
            "status": "pending",  # Default status - will be changed to "approved" when approved
        }

        insert_user_url = f"{SUPABASE_URL}/rest/v1/users"
        insert_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        user_insert_response = requests.post(insert_user_url, json=user_payload, headers=insert_headers)
        user_insert_json = user_insert_response.json()
        print("Supabase users table insert response:", user_insert_response.status_code, user_insert_json)

        if user_insert_response.status_code not in [200, 201]:
            # Delete created Auth user if users table insert fails
            delete_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
            requests.delete(delete_url, headers=headers)

            return Response({
                "error": "Failed to insert into users table",
                "details": user_insert_json
            }, status=status.HTTP_400_BAD_REQUEST)

        # STEP 2: Now insert profile info into kutsero_profile
        profile_payload = {
            "kutsero_id": user_id,
            "kutsero_username": username,  # Use generated or provided username
            "kutsero_fname": request.data.get("firstName"),
            "kutsero_mname": request.data.get("middleName"),
            "kutsero_lname": request.data.get("lastName"),
            "kutsero_dob": request.data.get("dob"),
            "kutsero_sex": request.data.get("sex"),
            "kutsero_phone_num": request.data.get("phoneNumber"),
            "kutsero_province": request.data.get("province"),
            "kutsero_city": request.data.get("city"),
            "kutsero_municipality": request.data.get("municipality"),
            "kutsero_brgy": request.data.get("barangay"),
            "kutsero_zipcode": request.data.get("zipCode"),
            "kutsero_email": email,
            "kutsero_fb": request.data.get("facebook") 
        }

        insert_profile_url = f"{SUPABASE_URL}/rest/v1/kutsero_profile"
        profile_insert_response = requests.post(insert_profile_url, json=profile_payload, headers=insert_headers)
        profile_insert_json = profile_insert_response.json()
        print("Supabase kutsero_profile insert response:", profile_insert_response.status_code, profile_insert_json)

        if profile_insert_response.status_code not in [200, 201]:
            # Cleanup: Delete both the users record and auth user if profile insert fails
            delete_user_url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}"
            requests.delete(delete_user_url, headers=insert_headers)
            
            delete_auth_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
            requests.delete(delete_auth_url, headers=headers)

            return Response({
                "error": "Failed to insert profile",
                "details": profile_insert_json
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "User registration completed successfully. Your account status is pending approval, but you can login and use the app.",
            "user": auth_json,
            "user_record": user_insert_json,
            "profile": profile_insert_json
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            "error": "Registration failed",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # 1️⃣ Login via Supabase Auth
        login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }
        payload = {"email": email.strip().lower(), "password": password}

        auth_response = requests.post(login_url, json=payload, headers=headers)
        auth_json = auth_response.json()
        print(f"Supabase Auth login response: {auth_response.status_code}")
        
        if auth_response.status_code != 200:
            error_message = auth_json.get('error_description') or auth_json.get('msg') or 'Invalid credentials'
            print(f"❌ Auth failed: {error_message}")
            return Response({"error": error_message}, status=status.HTTP_401_UNAUTHORIZED)

        # Extract authentication data
        user = auth_json.get('user', {})
        access_token = auth_json.get('access_token')
        refresh_token = auth_json.get('refresh_token')
        user_id = user.get('id')

        if not user or not access_token or not user_id:
            print("❌ Missing required auth data")
            return Response({"error": "Invalid authentication response"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        print(f"✅ Auth successful for user {user_id}")

        # 2️⃣ Get user role and status from users table
        user_role = None
        user_status = "pending"
        
        try:
            print(f"🔍 Looking up user role for ID: {user_id}")
            user_data = supabase.table("users").select("role,status").eq("id", user_id).execute()
            print(f"User query result: found {len(user_data.data) if user_data.data else 0} records")
            
            if user_data.data and len(user_data.data) > 0:
                user_record = user_data.data[0]
                user_role = user_record.get("role")
                user_status = user_record.get("status") or "pending"
                print(f"✅ Found user - role: {user_role}, status: {user_status}")
            else:
                print(f"⚠️ No user record found for {user_id}, creating default record")
                # Create missing user record with service role key
                user_payload = {
                    "id": user_id,
                    "role": "kutsero",  # Default role
                    "status": "pending"
                }
                
                insert_user_url = f"{SUPABASE_URL}/rest/v1/users"
                insert_headers = {
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                }
                
                user_insert_response = requests.post(insert_user_url, json=user_payload, headers=insert_headers)
                if user_insert_response.status_code in [200, 201]:
                    user_role = "kutsero"
                    user_status = "pending"
                    print(f"✅ Created default user record")
                else:
                    print(f"❌ Failed to create user record: {user_insert_response.json()}")
                    user_role = "kutsero"  # Fallback
                    
        except Exception as e:
            print(f"❌ Error with user role/status lookup: {e}")
            user_role = "kutsero"  # Fallback to default

        # 3️⃣ Get profile info based on role
        profile = None
        try:
            if user_role == "kutsero":
                print(f"🔍 Fetching kutsero profile for email: {email}")
                profile_data = supabase.table("kutsero_profile").select("*").eq("kutsero_email", email.strip().lower()).execute()
                profile = profile_data.data[0] if profile_data.data and len(profile_data.data) > 0 else None
                print(f"Kutsero profile found: {bool(profile)}")
                
            elif user_role == "horse_operator":
                print(f"🔍 Fetching horse operator profile for email: {email}")
                # Assuming you have a horse_operator_profile table
                profile_data = supabase.table("horse_operator_profile").select("*").eq("operator_email", email.strip().lower()).execute()
                profile = profile_data.data[0] if profile_data.data and len(profile_data.data) > 0 else None
                print(f"Horse operator profile found: {bool(profile)}")
                
        except Exception as e:
            print(f"⚠️ Error fetching profile: {e}")
            profile = None

        # 4️⃣ Validate role exists and is supported
        supported_roles = ["kutsero", "horse_operator", "admin"]
        if user_role not in supported_roles:
            print(f"❌ Unsupported role: {user_role}")
            return Response({
                "error": f"Unsupported user role: {user_role}. Please contact support."
            }, status=status.HTTP_403_FORBIDDEN)

        # 5️⃣ Check if user is suspended or rejected
        if user_status == "suspended":
            return Response({
                "error": "Your account has been suspended. Please contact support."
            }, status=status.HTTP_403_FORBIDDEN)
        elif user_status == "rejected":
            return Response({
                "error": "Your account has been rejected. Please contact support for more information."
            }, status=status.HTTP_403_FORBIDDEN)

        # 6️⃣ Return successful response with all necessary data
        response_data = {
            "message": "Login successful",
            "user": {
                "id": user_id,
                "email": user.get("email"),
                "email_confirmed_at": user.get("email_confirmed_at"),
                "created_at": user.get("created_at"),
                "updated_at": user.get("updated_at")
            },
            "profile": profile,
            "user_role": user_role,
            "user_status": user_status,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": auth_json.get('expires_in'),
            "token_type": auth_json.get('token_type', 'Bearer')
        }
        
        print(f"✅ Login successful for {email} with role {user_role} and status {user_status}")
        return Response(response_data, status=status.HTTP_200_OK)

    except requests.exceptions.RequestException as e:
        print(f"❌ Network error during login: {e}")
        return Response({
            "error": "Network error occurred. Please try again.",
            "details": str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
    except Exception as e:
        print(f"❌ Unexpected error during login: {e}")
        return Response({
            "error": "An unexpected error occurred during login",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def signup_alternative(request):
    """Alternative signup method that skips users table insert and relies on database triggers"""
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Generate username if not provided
        username = request.data.get("username")
        if not username:
            first_name = request.data.get("firstName", "").strip()
            last_name = request.data.get("lastName", "").strip()
            if first_name and last_name:
                username = f"{first_name.lower()}.{last_name.lower()}"
            else:
                username = email.split('@')[0]

        # Create user in Supabase Auth
        signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        }
        payload_auth = {
            "email": email,
            "password": password
        }

        auth_response = requests.post(signup_url, json=payload_auth, headers=headers)
        auth_json = auth_response.json()
        print("Supabase Auth response:", auth_response.status_code, auth_json)

        if auth_response.status_code not in [200, 201]:
            return Response({
                "error": "Failed to create user in Supabase Auth",
                "details": auth_json
            }, status=status.HTTP_400_BAD_REQUEST)

        user_id = auth_json.get('id') or auth_json.get('user', {}).get('id')
        if not user_id:
            return Response({"error": "Supabase Auth did not return a user ID"}, status=status.HTTP_400_BAD_REQUEST)

        # Wait for database triggers to create user record
        time.sleep(2)

        # Insert profile info into kutsero_profile
        profile_payload = {
            "kutsero_id": user_id,
            "kutsero_username": username,
            "kutsero_fname": request.data.get("firstName"),
            "kutsero_mname": request.data.get("middleName"),
            "kutsero_lname": request.data.get("lastName"),
            "kutsero_dob": request.data.get("dob"),
            "kutsero_sex": request.data.get("sex"),
            "kutsero_phone_num": request.data.get("phoneNumber"),
            "kutsero_province": request.data.get("province"),
            "kutsero_city": request.data.get("city"),
            "kutsero_municipality": request.data.get("municipality"),
            "kutsero_brgy": request.data.get("barangay"),
            "kutsero_zipcode": request.data.get("zipCode"),
            "kutsero_email": email,
            "kutsero_fb": request.data.get("facebook") 
        }

        insert_profile_url = f"{SUPABASE_URL}/rest/v1/kutsero_profile"
        insert_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        profile_insert_response = requests.post(insert_profile_url, json=profile_payload, headers=insert_headers)
        profile_insert_json = profile_insert_response.json()
        print("Supabase kutsero_profile insert response:", profile_insert_response.status_code, profile_insert_json)

        if profile_insert_response.status_code not in [200, 201]:
            # Delete created Auth user if profile insert fails
            delete_auth_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
            requests.delete(delete_auth_url, headers=headers)

            return Response({
                "error": "Failed to insert profile",
                "details": profile_insert_json
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "User registration completed successfully. Your account status is pending approval, but you can login and use the app.",
            "user": auth_json,
            "profile": profile_insert_json
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            "error": "Registration failed",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# New endpoint to update user status (for admin use)
@api_view(['POST'])
def update_user_status(request):
    """Admin endpoint to update user status from 'pending' to 'approved' or other status"""
    user_id = request.data.get("user_id")
    new_status = request.data.get("status")  # e.g., "approved", "rejected", "suspended", etc.
    
    if not user_id or not new_status:
        return Response({"error": "user_id and status are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate status values
    valid_statuses = ["pending", "approved", "rejected", "suspended", "inactive"]
    if new_status not in valid_statuses:
        return Response({
            "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Update user status
        update_url = f"{SUPABASE_URL}/rest/v1/users"
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        payload = {"status": new_status}
        
        response = requests.patch(f"{update_url}?id=eq.{user_id}", json=payload, headers=headers)
        response_json = response.json()
        
        if response.status_code in [200, 201]:
            return Response({
                "message": f"User status updated to {new_status}",
                "data": response_json
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": "Failed to update user status",
                "details": response_json
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            "error": "Failed to update user status",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Additional endpoint to get user by role (useful for admin purposes)
@api_view(['GET'])
def get_users_by_role(request):
    """Get all users filtered by role"""
    role = request.GET.get('role')
    
    if not role:
        return Response({"error": "Role parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        users_data = supabase.table("users").select("*").eq("role", role).execute()
        return Response({
            "message": f"Users with role {role}",
            "data": users_data.data,
            "count": len(users_data.data) if users_data.data else 0
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            "error": "Failed to fetch users",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Endpoint to update user role (admin only)
@api_view(['POST']) 
def update_user_role(request):
    """Admin endpoint to change a user's role"""
    user_id = request.data.get("user_id")
    new_role = request.data.get("role")
    
    if not user_id or not new_role:
        return Response({"error": "user_id and role are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate role values
    valid_roles = ["kutsero", "horse_operator", "admin"]
    if new_role not in valid_roles:
        return Response({
            "error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Update user role
        update_url = f"{SUPABASE_URL}/rest/v1/users"
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        payload = {"role": new_role}
        
        response = requests.patch(f"{update_url}?id=eq.{user_id}", json=payload, headers=headers)
        response_json = response.json()
        
        if response.status_code in [200, 201]:
            return Response({
                "message": f"User role updated to {new_role}",
                "data": response_json
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": "Failed to update user role",
                "details": response_json
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            "error": "Failed to update user role",
            "details": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
>>>>>>> a48615e9b47c1adec476d489063b5a3fc850a2dd
