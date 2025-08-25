from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import requests
import time

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY

# --------------------------------------------------------------- LOGIN WEB -------------------------------------------------------------------------------------------
@api_view(['POST'])
def login(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # 1️⃣ Authenticate with Supabase Auth
    login_url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    payload = {"email": email, "password": password}

    auth_response = requests.post(login_url, json=payload, headers=headers)

    if auth_response.status_code != 200:
        try:
            error_details = auth_response.json()
        except ValueError:
            error_details = {"message": auth_response.text}
        return Response({
            "error": "Invalid login credentials",
            "details": error_details
        }, status=status.HTTP_401_UNAUTHORIZED)

    auth_data = auth_response.json()
    user_id = auth_data.get("user", {}).get("id")
    if not user_id:
        return Response({"error": "Login failed: missing user id"}, status=status.HTTP_400_BAD_REQUEST)

    # 2️⃣ Fetch role from public.users using the service role key
    service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    # Make sure you use the correct column name: often it's "id" or "user_id"
    user_query = service_client.table("users").select("role").eq("id", user_id).execute()
    role_info = user_query.data[0] if user_query.data else None
    user_role = (role_info.get("role", "general") if role_info else "general").strip()

    print(f"[LOGIN] User ID: {user_id}, Role: {user_role}")

    # ✅ Return auth info + role for frontend
    return Response({
        "message": "Login successful",
        "auth_data": auth_data,  
        "role": user_role       
    }, status=status.HTTP_200_OK)


# ------- GET VET PROFILE DATA ----------
@api_view(['GET'])
def get_data(request):
    data = supabase.table("vet_profile").select("*").execute()
    return Response(data.data)

# ------INSERT VET PROFILE DATA--------
@api_view(['POST'])
def insert_vet_profile(request):
    payload = {
        "vet_id": request.data.get("vetId"),  
        "vet_fname": request.data.get("firstName"),
        "vet_mname": request.data.get("middleName"),
        "vet_lname": request.data.get("lastName"),
        "vet_dob": request.data.get("dob"),
        "vet_sex": request.data.get("sex"),
        "vet_phone_num": request.data.get("phoneNumber"),
        "vet_province": request.data.get("province"),
        "vet_city": request.data.get("city"),
        "vet_brgy": request.data.get("barangay"),
        "vet_zipcode": request.data.get("zipCode"),
        "vet_email": request.data.get("email"),
        "vet_license_num": request.data.get("licenseNumber"),
        "vet_exp_yr": int(request.data.get("yearsOfExperience")),
        "vet_specialization": request.data.get("specialization"),
        "vet_org": request.data.get("affiliatedOrganization"),
        "vet_doc_image": request.data.get("document"),
    }

    service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    data = service_client.table("vet_profile").insert(payload).execute()

    if data.data:
        return Response({"message": "Vet profile created", "data": data.data}, status=201)
    else:
        return Response({"error": str(data.error)}, status=400)

# ---------SIGN UP VET ---- 
@api_view(['POST'])
def signup(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    check_url = f"{SUPABASE_URL}/auth/v1/admin/users?email={email}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    check_response = requests.get(check_url, headers=headers)
    if check_response.status_code == 200:
        users_list = check_response.json().get("users", [])
        if any(u.get("email") == email for u in users_list):
            return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

    # 1. Create Auth user
    signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    payload_auth = {
        "email": email,
        "password": password
    }
    auth_response = requests.post(signup_url, json=payload_auth, headers=headers)
    if auth_response.status_code not in [200, 201]:
        return Response({"error": "Sign up failed: Failed to create user in Supabase Auth"}, status=400)

    user_data = auth_response.json()
    user_id = user_data.get("id")

    # 2. Insert into public.users
    user_payload = {
        "id": user_id,
        "role": "Veterinarian",
        "status": "pending"
    }
    insert_users_url = f"{SUPABASE_URL}/rest/v1/users"
    insert_users_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    users_response = requests.post(insert_users_url, json=user_payload, headers=insert_users_headers)
    if users_response.status_code not in [200, 201]:
        requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
        return Response({"error": "Failed to insert into public.users"}, status=400)

    # 3. Insert into vet_profile
    profile_payload = {
        "vet_id": user_id,
        "vet_fname": request.data.get("firstName"),
        "vet_mname": request.data.get("middleName"),
        "vet_lname": request.data.get("lastName"),
        "vet_dob": request.data.get("dob"),
        "vet_sex": request.data.get("sex"),
        "vet_phone_num": request.data.get("phoneNumber"),
        "vet_province": request.data.get("province"),
        "vet_city": request.data.get("city"),
        "vet_brgy": request.data.get("barangay"),
        "vet_zipcode": request.data.get("zipCode"),
        "vet_email": email,
        "vet_license_num": request.data.get("licenseNumber"),
        "vet_exp_yr": int(request.data.get("yearsOfExperience") or 0),
        "vet_specialization": request.data.get("specialization"),
        "vet_org": request.data.get("affiliatedOrganization"),
        "vet_doc_image": request.data.get("document"),
    }
    insert_profile_url = f"{SUPABASE_URL}/rest/v1/vet_profile"
    profile_response = requests.post(insert_profile_url, json=profile_payload, headers=insert_users_headers)

    if profile_response.status_code not in [200, 201]:
        requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=insert_users_headers)
        requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
        return Response({"error": "Failed to insert vet profile"}, status=400)

    return Response({
        "message": "User signed up successfully",
        "auth_user": user_data,
        "app_user": users_response.json(),
        "vet_profile": profile_response.json()
    }, status=status.HTTP_201_CREATED)


#-----------------------------------------------------------------LOGIN MOBILE---------------------------------------------------------------------------------------

@api_view(['GET'])
def get_kutsero_data(request):
    data = supabase.table("kutsero_profile").select("*").execute()
    return Response(data.data)


@api_view(['POST'])
def signup_mobile(request):
    email = request.data.get("email")
    password = request.data.get("password")
    role = request.data.get("role")   # 👈 kutsero or horse_operator

    if not email or not password or not role:
        return Response({"error": "Email, password, and role are required"}, status=status.HTTP_400_BAD_REQUEST)

    # Generate username if not provided
    username = request.data.get("username")
    if not username:
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        username = f"{first_name.lower()}.{last_name.lower()}" if first_name and last_name else email.split('@')[0]

    # Create user in Supabase Auth
    signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    payload_auth = {"email": email, "password": password}
    auth_response = requests.post(signup_url, json=payload_auth, headers=headers)
    auth_json = auth_response.json()

    if auth_response.status_code not in [200, 201]:
        return Response({"error": "Failed to create user in Supabase Auth", "details": auth_json}, status=status.HTTP_400_BAD_REQUEST)

    user_id = auth_json.get('id') or auth_json.get('user', {}).get('id')
    if not user_id:
        return Response({"error": "Supabase Auth did not return a user ID"}, status=status.HTTP_400_BAD_REQUEST)

    # Insert into users table (with chosen role)
    user_payload = {
        "id": user_id,
        "role": role,      # 👈 kutsero or horse_operator
        "status": "pending",
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

    if user_insert_response.status_code not in [200, 201]:
        # Cleanup Auth user if failed
        delete_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
        requests.delete(delete_url, headers=headers)
        return Response({"error": "Failed to insert into users table", "details": user_insert_json}, status=status.HTTP_400_BAD_REQUEST)

    # Insert profile based on role
    if role == "kutsero":
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
            "kutsero_fb": request.data.get("facebook"),
        }
        insert_profile_url = f"{SUPABASE_URL}/rest/v1/kutsero_profile"

    elif role == "horse_operator":
        profile_payload = {
            "operator_id": user_id,
            "operator_username": username,
            "operator_fname": request.data.get("firstName"),
            "operator_mname": request.data.get("middleName"),
            "operator_lname": request.data.get("lastName"),
            "operator_dob": request.data.get("dob"),
            "operator_sex": request.data.get("sex"),
            "operator_phone_num": request.data.get("phoneNumber"),
            "operator_province": request.data.get("province"),
            "operator_city": request.data.get("city"),
            "operator_municipality": request.data.get("municipality"),
            "operator_brgy": request.data.get("barangay"),
            "operator_zipcode": request.data.get("zipCode"),
            "operator_email": email,
            "operator_fb": request.data.get("facebook"),
        }
        insert_profile_url = f"{SUPABASE_URL}/rest/v1/horse_operator_profile"

    else:
        return Response({"error": "Invalid role selected"}, status=status.HTTP_400_BAD_REQUEST)

    # Insert profile
    profile_insert_response = requests.post(insert_profile_url, json=profile_payload, headers=insert_headers)
    profile_insert_json = profile_insert_response.json()

    if profile_insert_response.status_code not in [200, 201]:
        # Cleanup if profile insert fails
        requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=insert_headers)
        requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
        return Response({"error": "Failed to insert profile", "details": profile_insert_json}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": "User registration completed successfully. Your account is pending approval.",
        "user": auth_json,
        "user_record": user_insert_json,
        "profile": profile_insert_json
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def login_mobile(request):
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


