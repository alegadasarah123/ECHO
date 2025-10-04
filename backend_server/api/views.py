from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import requests
import datetime
import base64
import random
from datetime import datetime


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
    access_token = auth_data.get("access_token")
    user_id = auth_data.get("user", {}).get("id")
    if not access_token or not user_id:
        return Response({"error": "Login failed: missing token or user id"}, status=status.HTTP_400_BAD_REQUEST)

    # 2️⃣ Fetch role from public.users using service role key
    service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    user_query = service_client.table("users").select("role").eq("id", user_id).execute()
    role_info = user_query.data[0] if user_query.data else None
    user_role = (role_info.get("role", "general") if role_info else "general").strip()
    is_active = role_info.get("is_active", True) if role_info else True  # default True if missing

    # ❌ Prevent deactivated accounts from logging in
    if not is_active:
        return Response({"error": "Account is deactivated. Please contact admin."}, status=status.HTTP_403_FORBIDDEN)

    print(f"[LOGIN] User ID: {user_id}, Role: {user_role}")

    # 3️⃣ Set HttpOnly cookie
    response = Response({
        "message": "Login successful",
        "role": user_role
    }, status=status.HTTP_200_OK)

    # Cookie expires in 1 day
    response.set_cookie(
   key="access_token",
   value=access_token,
   httponly=True,
   secure=False,
   samesite="Lax",
   max_age=86400
)

    return response

# -------------- SIGN UP VET --------------------------------
@api_view(['POST'])
def signup_vet(request):
    try:
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "").strip()

        if not email or not password:
            return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Generate username
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        username = (
            request.data.get("username")
            or f"{first_name.lower()}.{last_name.lower()}" if first_name and last_name else email.split('@')[0]
        )

        # ---------------- Step 1: Create Supabase Auth User ----------------
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

        user_id = auth_json.get("id") or auth_json.get("user", {}).get("id")
        if not user_id:
            return Response({"error": "Supabase Auth did not return a user ID"}, status=status.HTTP_400_BAD_REQUEST)

        # ---------------- Step 2: Insert into public.users ----------------
        insert_user_url = f"{SUPABASE_URL}/rest/v1/users"
        insert_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        user_payload = {
            "id": user_id,
            "role": "Veterinarian",  # force role
            "status": "pending"
        }
        user_insert_response = requests.post(insert_user_url, json=user_payload, headers=insert_headers)
        if user_insert_response.status_code not in [200, 201]:
            requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
            return Response({"error": "Failed to insert into users table", "details": user_insert_response.json()}, status=status.HTTP_400_BAD_REQUEST)

        # ---------------- Step 3: Insert into vet_profile ----------------
        insert_profile_url = f"{SUPABASE_URL}/rest/v1/vet_profile"

        profile_payload = {
            "vet_id": user_id,
            "vet_fname": first_name or "",
            "vet_mname": request.data.get("middleName", "") or "",
            "vet_lname": last_name or "",
            "vet_dob": request.data.get("dob") or "0000-01-01",
            "vet_sex": request.data.get("sex") or "N/A",
            "vet_phone_num": request.data.get("phoneNumber") or "",
            "vet_province": request.data.get("province") or "",
            "vet_city": request.data.get("city") or "",
            "vet_brgy": request.data.get("barangay") or "",
            "vet_zipcode": request.data.get("zipCode") or "",
            "vet_email": email,
            "vet_license_num": request.data.get("licenseNumber") or "",
            "vet_exp_yr": int(request.data.get("yearsOfExperience") or 0),
            "vet_specialization": request.data.get("specialization") or "",
            "vet_org": request.data.get("affiliatedOrganization") or "",
            "created_at": datetime.datetime.utcnow().isoformat()
        }

        profile_insert_response = requests.post(insert_profile_url, json=profile_payload, headers=insert_headers)
        if profile_insert_response.status_code not in [200, 201]:
            requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=insert_headers)
            requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
            return Response({"error": "Failed to insert into vet_profile", "details": profile_insert_response.json()}, status=status.HTTP_400_BAD_REQUEST)

        # ---------------- Step 4: Success ----------------
        return Response({
            "message": "Vet registration completed successfully. Your account is pending approval.",
            "auth_user": auth_json,
            "user_record": user_insert_response.json(),
            "profile": profile_insert_response.json()
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

\
#-----------------------------------------------------------------LOGIN MOBILE---------------------------------------------------------------------------------------

@api_view(['POST'])
def signup_mobile(request):
    email = request.data.get("email")
    password = request.data.get("password")
    role = request.data.get("role")

    if not email or not password or not role:
        return Response({"error": "Email, password, and role are required"}, status=status.HTTP_400_BAD_REQUEST)

    # Generate username if not provided
    username = request.data.get("username")
    if not username:
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        username = f"{first_name.lower()}.{last_name.lower()}" if first_name and last_name else email.split('@')[0]

    # Handle profile picture upload to Supabase Storage
    profile_picture_url = None
    profile_picture_base64 = request.data.get("profilePicture")
    
    if profile_picture_base64 and profile_picture_base64.strip():
        try:
            if ";base64," in profile_picture_base64:
                # Extract format and base64 data
                format_part, imgstr = profile_picture_base64.split(";base64,")
                ext = format_part.split("/")[-1]
                
                # Generate unique filename
                timestamp = int(datetime.now().timestamp())
                file_name = f"{email.split('@')[0]}_{timestamp}_{random.randint(1000,9999)}.{ext}"
                
                # Decode base64 to bytes
                file_bytes = base64.b64decode(imgstr)
                
                # Upload to Supabase storage using REST API
                print(f"[DEBUG] Uploading profile picture: {file_name}")
                upload_url = f"{SUPABASE_URL}/storage/v1/object/kutsero_op_profile/{file_name}"
                upload_headers = {
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": f"image/{ext}",
                }
                
                upload_response = requests.post(upload_url, data=file_bytes, headers=upload_headers)
                print(f"[DEBUG] Upload status: {upload_response.status_code}")
                print(f"[DEBUG] Upload response: {upload_response.text}")
                
                if upload_response.status_code in [200, 201]:
                    # Construct public URL manually
                    profile_picture_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{file_name}"
                    print(f"[DEBUG] Profile picture URL: {profile_picture_url}")
                else:
                    print(f"[ERROR] Upload failed with status {upload_response.status_code}")
                
        except Exception as e:
            print(f"[ERROR] Profile picture upload failed: {e}")
            import traceback
            traceback.print_exc()
            profile_picture_url = None

    # Create user in Supabase Auth
    signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    payload_auth = {
        "email": email, 
        "password": password,
        "email_confirm": True  # Auto-confirm email
    }
    
    print(f"[DEBUG] Creating auth user for: {email}")
    auth_response = requests.post(signup_url, json=payload_auth, headers=headers)
    auth_json = auth_response.json()
    print(f"[DEBUG] Auth response status: {auth_response.status_code}")
    print(f"[DEBUG] Auth response: {auth_json}")

    if auth_response.status_code not in [200, 201]:
        return Response({"error": "Failed to create user in Supabase Auth", "details": auth_json}, status=status.HTTP_400_BAD_REQUEST)

    user_id = auth_json.get('id') or auth_json.get('user', {}).get('id')
    if not user_id:
        return Response({"error": "Supabase Auth did not return a user ID"}, status=status.HTTP_400_BAD_REQUEST)

    # Convert role to proper format for database
    db_role = "Kutsero" if role == "kutsero" else "Horse Operator" if role == "horse_operator" else role

    # Insert into users table
    user_payload = {
        "id": user_id,
        "role": db_role,
        "status": "pending",
    }

    insert_user_url = f"{SUPABASE_URL}/rest/v1/users"
    insert_headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    print(f"[DEBUG] Inserting into users table...")
    user_insert_response = requests.post(insert_user_url, json=user_payload, headers=insert_headers)
    user_insert_json = user_insert_response.json()
    print(f"[DEBUG] User insert status: {user_insert_response.status_code}")
    print(f"[DEBUG] User insert response: {user_insert_json}")

    if user_insert_response.status_code not in [200, 201]:
        print(f"[ERROR] Failed to insert into users table")
        delete_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
        requests.delete(delete_url, headers=headers)
        return Response({"error": "Failed to insert into users table", "details": user_insert_json}, status=status.HTTP_400_BAD_REQUEST)

    # Prepare profile payload based on role
    if role == "kutsero":
        profile_payload = {
            "kutsero_id": user_id,
            "kutsero_username": username,
            "kutsero_email": email,
        }
        
        # Add optional fields only if they have values
        optional_fields = {
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
            "kutsero_fb": request.data.get("facebook"),
            "kutsero_image": profile_picture_url,
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None and value != "":
                profile_payload[key] = value
        
        insert_profile_url = f"{SUPABASE_URL}/rest/v1/kutsero_profile"

    elif role == "horse_operator":
        profile_payload = {
            "op_id": user_id,
            "op_email": email,
            "op_province": "Cebu",  # Default value
        }
        
        # Add optional fields only if they have values
        optional_fields = {
            "op_fname": request.data.get("firstName"),
            "op_mname": request.data.get("middleName"),
            "op_lname": request.data.get("lastName"),
            "op_dob": request.data.get("dob"),
            "op_sex": request.data.get("sex"),
            "op_phone_num": request.data.get("phoneNumber"),
            "op_city": request.data.get("city"),
            "op_municipality": request.data.get("municipality"),
            "op_brgy": request.data.get("barangay"),
            "op_zipcode": request.data.get("zipCode"),
            "op_house_add": request.data.get("houseAddress"),
            "op_routefrom": request.data.get("route"),
            "op_routeto": request.data.get("to"),
            "op_fb": request.data.get("facebook"),
            "op_image": profile_picture_url,
        }
        
        # Only add non-None values
        for key, value in optional_fields.items():
            if value is not None and value != "":
                profile_payload[key] = value
        
        insert_profile_url = f"{SUPABASE_URL}/rest/v1/horse_op_profile"

    else:
        return Response({"error": "Invalid role selected"}, status=status.HTTP_400_BAD_REQUEST)

    # Insert profile
    print(f"[DEBUG] Inserting profile for {role}...")
    print(f"[DEBUG] Profile payload: {profile_payload}")
    profile_insert_response = requests.post(insert_profile_url, json=profile_payload, headers=insert_headers)
    profile_insert_json = profile_insert_response.json()
    print(f"[DEBUG] Profile insert status: {profile_insert_response.status_code}")
    print(f"[DEBUG] Profile insert response: {profile_insert_json}")

    if profile_insert_response.status_code not in [200, 201]:
        print(f"[ERROR] Failed to insert profile")
        
        # Cleanup: delete user record
        requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=insert_headers)
        
        # Cleanup: delete auth user
        requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
        
        # Cleanup uploaded image
        if profile_picture_url:
            try:
                file_name = profile_picture_url.split("/")[-1]
                delete_url = f"{SUPABASE_URL}/storage/v1/object/kutsero_op_profile/{file_name}"
                delete_headers = {
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                }
                requests.delete(delete_url, headers=delete_headers)
                print(f"[DEBUG] Cleaned up uploaded image: {file_name}")
            except Exception as e:
                print(f"[ERROR] Failed to cleanup image: {e}")
        
        return Response({"error": "Failed to insert profile", "details": profile_insert_json}, status=status.HTTP_400_BAD_REQUEST)

    print(f"[SUCCESS] User registration completed for {email}")
    return Response({
        "message": "User registration completed successfully. Your account is pending approval.",
        "user": auth_json,
        "user_record": user_insert_json,
        "profile": profile_insert_json,
        "profile_picture": profile_picture_url
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def login_mobile(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # 1️⃣ Authenticate with Supabase Auth
    login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
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
    access_token = auth_data.get("access_token")
    refresh_token = auth_data.get("refresh_token")
    user = auth_data.get("user", {})
    user_id = user.get("id")

    if not access_token or not user_id:
        return Response({"error": "Login failed: missing token or user id"}, status=status.HTTP_400_BAD_REQUEST)

    # 2️⃣ Fetch role and status from public.users using service role key
    service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    user_query = service_client.table("users").select("role, status").eq("id", user_id).execute()
    
    if not user_query.data:
        return Response({"error": "User record not found in database"}, status=status.HTTP_404_NOT_FOUND)
    
    user_info = user_query.data[0]
    user_role = user_info.get("role", "").strip()
    user_status = user_info.get("status", "pending").strip()

    print(f"[MOBILE LOGIN] User ID: {user_id}, Role: {user_role}, Status: {user_status}")

    # 3️⃣ Verify this is a mobile user (Kutsero or Horse Operator only)
    if user_role not in ["Kutsero", "Horse Operator"]:
        return Response({
            "error": "This login is only for mobile users (Kutsero or Horse Operator)"
        }, status=status.HTTP_403_FORBIDDEN)

    # 4️⃣ Check if user is approved
    if user_status != "approved":
        return Response({
            "error": f"Account is {user_status}. Please wait for admin approval.",
            "user_status": user_status
        }, status=status.HTTP_403_FORBIDDEN)

    # 5️⃣ Fetch profile based on role
    profile = None
    try:
        if user_role == "Kutsero":
            profile_data = service_client.table("kutsero_profile").select("*").eq("kutsero_id", user_id).execute()
            profile = profile_data.data[0] if profile_data.data else None
            
        elif user_role == "Horse Operator":
            profile_data = service_client.table("horse_operator_profile").select("*").eq("operator_id", user_id).execute()
            profile = profile_data.data[0] if profile_data.data else None
            
    except Exception as e:
        print(f"Error fetching profile: {e}")

    # 6️⃣ Return successful response - MUST include user_role and user_status keys
    response_data = {
        "message": "Login successful",
        "user": user,
        "profile": profile,
        "role": user_role,                    # Exact value from database
        "user_role": user_role,               # Frontend expects this key
        "status": user_status,                # Exact value from database  
        "user_status": user_status,           # Frontend expects this key
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": auth_data.get('expires_in'),
        "token_type": auth_data.get('token_type', 'Bearer')
    }
    
    print(f"Mobile login successful for user {email} with role {user_role}")
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
