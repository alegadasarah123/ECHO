from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import requests
import time

# Initialize Supabase client with anon key (for data queries)
supabase: Client = create_client(settings.SUPABASE_URL,  settings.SUPABASE_ANON_KEY)

# Use service role key for admin operations like creating users
SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY 
SUPABASE_URL = settings.SUPABASE_URL

@api_view(['GET'])
def get_data(request):
    data = supabase.table("kutsero_profile").select("*").execute()
    return Response(data.data)

@api_view(['POST'])
def insert_kutsero_profile(request):
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

    if data.status_code in [200, 201]:
        return Response({"message": "Kutsero profile created", "data": data.data})
    else:
        return Response({"error": "Failed to insert"}, status=400)


@api_view(['POST'])
def signup(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

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
        # created_at will be automatically set by the database (now() function)
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


@api_view(['POST'])
def signup_alternative(request):
    """Alternative signup method that skips users table insert"""
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

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

    # Wait a bit to allow any database triggers to create the user record
    time.sleep(1)

    # Insert profile info into kutsero_profile
    profile_payload = {
        "kutsero_id": user_id,
        "kutsero_username": request.data.get("username"),  # Add username field
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


@api_view(['POST'])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # 1️⃣ Login via Supabase Auth
    login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {"email": email, "password": password}

    auth_response = requests.post(login_url, json=payload, headers=headers)
    auth_json = auth_response.json()
    print(f"Supabase Auth login response: {auth_response.status_code}")
    
    # Log token details (without exposing the actual tokens)
    if auth_response.status_code == 200:
        access_token = auth_json.get('access_token')
        refresh_token = auth_json.get('refresh_token')
        expires_in = auth_json.get('expires_in', 'unknown')
        print(f"Token details - expires_in: {expires_in}s, has_access_token: {bool(access_token)}, has_refresh_token: {bool(refresh_token)}")

    if auth_response.status_code != 200:
        error_message = auth_json.get('error_description') or auth_json.get('msg') or 'Login failed'
        return Response({"error": error_message, "details": auth_json}, status=status.HTTP_401_UNAUTHORIZED)

    user = auth_json.get('user', {})
    access_token = auth_json.get('access_token')
    refresh_token = auth_json.get('refresh_token')
    user_id = user.get('id')

    if not user or not access_token or not user_id:
        return Response({"error": "Invalid authentication response"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 2️⃣ Get user role and status from users table
    user_role = None
    user_status = "pending"
    
    try:
        user_data = supabase.table("users").select("role,status").eq("id", user_id).execute()
        print(f"User query result: found {len(user_data.data)} records")
        
        if user_data.data:
            user_role = user_data.data[0].get("role")
            user_status = user_data.data[0].get("status") or "pending"
            print(f"Found user role: {user_role}, status: {user_status}")
        else:
            print(f"No user record found for {user_id}, creating default record")
            # Create missing user record
            user_payload = {
                "id": user_id,
                "role": "kutsero",
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
                print(f"Created default user record")
            else:
                print(f"Failed to create user record: {user_insert_response.json()}")
                
    except Exception as e:
        print(f"Error with user role/status: {e}")

    # Default to kutsero if still no role
    if not user_role:
        user_role = "kutsero"
        print(f"Defaulting to kutsero role")

    # 3️⃣ Get profile info
    profile = None
    try:
        profile_data = supabase.table("kutsero_profile").select("*").eq("kutsero_email", email).execute()
        profile = profile_data.data[0] if profile_data.data else None
        print(f"Profile found: {bool(profile)}")
    except Exception as e:
        print(f"Error fetching profile: {e}")

    # 4️⃣ Return response with all necessary data
    response_data = {
        "message": "Login successful",
        "user": user,
        "profile": profile,
        "user_role": user_role,
        "user_status": user_status,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": auth_json.get('expires_in'),
        "token_type": auth_json.get('token_type', 'Bearer')
    }
    
    print(f"Login successful for user {email} with role {user_role}")
    return Response(response_data, status=status.HTTP_200_OK)


# New endpoint to update user status (for admin use)
@api_view(['POST'])
def update_user_status(request):
    """Admin endpoint to update user status from 'pending' to 'approved' or other status"""
    user_id = request.data.get("user_id")
    new_status = request.data.get("status")  # e.g., "approved", "rejected", "suspended", etc.
    
    if not user_id or not new_status:
        return Response({"error": "user_id and status are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate status values (optional)
    valid_statuses = ["pending", "approved", "rejected", "suspended", "inactive"]
    if new_status not in valid_statuses:
        return Response({
            "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update user status
    try:
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
                "message": f"User status updated from pending to {new_status}",
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

