from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import requests
import datetime

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

<<<<<<< Updated upstream
=======
# views.py - FIXED VERSION

@api_view(['GET'])
def get_kutsero_data(request):
    data = supabase.table("kutsero_profile").select("*").execute()
    return Response(data.data)

@api_view(['GET'])
def get_horse_operator_data(request):
    data = supabase.table("horse_operator_profile").select("*").execute()
    return Response(data.data)

# Fixed role mapping dictionary - consistent key-value pairs
ROLE_MAP = {
    "kutsero": "kutsero",
    "horse operator": "horse_operator",  # frontend might send "Horse Operator"
}

>>>>>>> Stashed changes
@api_view(['POST'])
def signup_mobile(request):
    email = request.data.get("email")
    password = request.data.get("password")
<<<<<<< Updated upstream
    role = request.data.get("role")   # 👈 kutsero or horse_operator

    if not email or not password or not role:
        return Response({"error": "Email, password, and role are required"}, status=status.HTTP_400_BAD_REQUEST)

=======
    role_input = request.data.get("role", "").strip().lower()  # normalize

    if not email or not password or not role_input:
        return Response({"error": "Email, password, and role are required"}, status=status.HTTP_400_BAD_REQUEST)

    if role_input not in ROLE_MAP:
        return Response({"error": "Invalid role selected"}, status=status.HTTP_400_BAD_REQUEST)

    role_internal = ROLE_MAP[role_input]  # "kutsero" or "horse_operator"

>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    # Convert role to proper format for database
    db_role = "Kutsero" if role == "kutsero" else "Horse Operator" if role == "horse_operator" else role

    # Insert into users table (with chosen role)
    user_payload = {
        "id": user_id,
        "role": db_role,      # 👈 "Kutsero" or "Horse Operator"
=======
    # Insert into users table
    user_payload = {
        "id": user_id,
        "role": role_internal,   # store canonical role
>>>>>>> Stashed changes
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
    if user_insert_response.status_code not in [200, 201]:
        # Cleanup Auth user if failed
        requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
        return Response({"error": "Failed to insert into users table", "details": user_insert_response.json()}, status=status.HTTP_400_BAD_REQUEST)

<<<<<<< Updated upstream
    # Insert profile based on role
    if role == "kutsero":
=======
    # Insert profile based on canonical role
    if role_internal == "kutsero":
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    elif role == "horse_operator":
=======
    elif role_internal == "horse_operator":
>>>>>>> Stashed changes
        profile_payload = {
            "op_id": user_id,
            "op_fname": request.data.get("firstName"),
            "op_mname": request.data.get("middleName"),
            "op_lname": request.data.get("lastName"),
            "op_dob": request.data.get("dob"),
            "op_sex": request.data.get("sex"),
            "op_phone_num": request.data.get("phoneNumber"),
            "op_province": request.data.get("province", "Cebu"),
            "op_city": request.data.get("city"),
            "op_municipality": request.data.get("municipality"),
            "op_brgy": request.data.get("barangay"),
            "op_zipcode": request.data.get("zipCode"),
            "op_house_add": request.data.get("houseAddress"),
            "op_routefrom": request.data.get("route"),
            "op_routeto": request.data.get("to"),
            "op_email": email,
            "op_fb": request.data.get("facebook"),
            "op_image": request.data.get("profilePicture"),
        }
        insert_profile_url = f"{SUPABASE_URL}/rest/v1/horse_op_profile"

    else:
        return Response({"error": "Invalid role selected"}, status=status.HTTP_400_BAD_REQUEST)

    profile_insert_response = requests.post(insert_profile_url, json=profile_payload, headers=insert_headers)
    if profile_insert_response.status_code not in [200, 201]:
        # Cleanup if profile insert fails
        requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=insert_headers)
        requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
        return Response({"error": "Failed to insert profile", "details": profile_insert_response.json()}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": "User registration completed successfully. Your account is pending approval.",
        "user": auth_json,
<<<<<<< Updated upstream
        "user_record": user_insert_json,
        "profile": profile_insert_json
=======
        "user_record": user_insert_response.json(),
        "profile": profile_insert_response.json(),
        "role": role_internal  # always canonical role
>>>>>>> Stashed changes
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def login_mobile(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

<<<<<<< Updated upstream
    # 1️⃣ Authenticate with Supabase Auth
    login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
=======
    # 1️⃣ Login via Supabase Auth
    login_url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
>>>>>>> Stashed changes
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    payload = {"email": email, "password": password}

    auth_response = requests.post(login_url, json=payload, headers=headers)
<<<<<<< Updated upstream
    if auth_response.status_code != 200:
        try:
            error_details = auth_response.json()
        except ValueError:
            error_details = {"message": auth_response.text}
        return Response({
            "error": "Invalid login credentials",
            "details": error_details
=======
    auth_json = auth_response.json()
    print(f"Supabase Auth login response: {auth_response.status_code}")
    print(f"Auth response headers: {dict(auth_response.headers)}")
    print(f"Auth response body: {auth_json}")

    if auth_response.status_code != 200:
        print(f"❌ Auth failed - Status: {auth_response.status_code}")
        print(f"❌ Auth error details: {auth_json}")
        
        error_message = auth_json.get('error_description') or auth_json.get('msg') or auth_json.get('message') or 'Login failed'
        
        # More specific error handling
        if auth_response.status_code == 400:
            if 'email' in str(auth_json).lower():
                error_message = "Invalid email format or email not confirmed"
            elif 'password' in str(auth_json).lower():
                error_message = "Invalid password"
            else:
                error_message = f"Bad request: {error_message}"
        elif auth_response.status_code == 401:
            error_message = "Invalid email or password"
        elif auth_response.status_code == 422:
            error_message = "Email not confirmed. Please check your email and confirm your account"
        
        return Response({
            "error": error_message, 
            "details": auth_json,
            "debug_info": {
                "status_code": auth_response.status_code,
                "email_used": email,
                "supabase_url": settings.SUPABASE_URL
            }
>>>>>>> Stashed changes
        }, status=status.HTTP_401_UNAUTHORIZED)

    auth_data = auth_response.json()
    access_token = auth_data.get("access_token")
    refresh_token = auth_data.get("refresh_token")
    user = auth_data.get("user", {})
    user_id = user.get("id")

    if not access_token or not user_id:
        return Response({"error": "Login failed: missing token or user id"}, status=status.HTTP_400_BAD_REQUEST)

<<<<<<< Updated upstream
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
=======
    # 2️⃣ Get user role and status from users table - NO DEFAULTS
    try:
        print(f"🔍 Looking for user with ID: {user_id}")
        print(f"🔍 Email from auth: {email}")
        print(f"🔍 Supabase client initialized: {supabase is not None}")
        
        # Test basic connection first
        try:
            test_query = supabase.table("users").select("count", count="exact").execute()
            print(f"🔍 Users table accessible, total count: {test_query.count}")
        except Exception as conn_e:
            print(f"❌ Cannot access users table: {conn_e}")
            raise conn_e
        
        user_data = supabase.table("users").select("*").eq("id", user_id).execute()
        
        print(f"🔍 Users table query result: {user_data}")
        print(f"🔍 Query data type: {type(user_data)}")
        print(f"🔍 Has data attribute: {hasattr(user_data, 'data')}")
        print(f"🔍 Number of records found: {len(user_data.data) if user_data.data else 0}")
        
        if not user_data.data:
            print(f"❌ No user record found for ID: {user_id}")
            
            # Let's check what columns actually exist in the users table
            try:
                # Try different possible email column names
                email_search = None
                possible_email_fields = ['email', 'user_email', 'auth_email']
                
                for email_field in possible_email_fields:
                    try:
                        email_search = supabase.table("users").select("*").eq(email_field, email).execute()
                        print(f"🔍 Email search using '{email_field}': {len(email_search.data) if email_search.data else 0} records")
                        if email_search.data:
                            break
                    except Exception as field_e:
                        print(f"❌ Field '{email_field}' doesn't exist: {field_e}")
                        continue
                
                # Also try to get the table structure
                try:
                    structure_query = supabase.table("users").select("*").limit(1).execute()
                    if structure_query.data:
                        print(f"🔍 Users table columns: {list(structure_query.data[0].keys())}")
                        
                        # Let's also see a sample record to understand the structure
                        print(f"🔍 Sample user record: {structure_query.data[0]}")
                    else:
                        print("🔍 Users table is empty, let's check structure another way")
                        
                        # Try to get all records to see structure
                        all_users = supabase.table("users").select("*").execute()
                        print(f"🔍 All users query result: {all_users}")
                        print(f"🔍 Total users in table: {len(all_users.data) if all_users.data else 0}")
                        
                except Exception as struct_e:
                    print(f"❌ Cannot get table structure: {struct_e}")
                    
                    # Let's try a different approach - describe table
                    try:
                        # This might work depending on your Supabase setup
                        table_info = supabase.rpc('describe_table', {'table_name': 'users'}).execute()
                        print(f"🔍 Table description: {table_info}")
                    except Exception as desc_e:
                        print(f"❌ Cannot describe table: {desc_e}")
                    
            except Exception as search_e:
                print(f"❌ Email search failed: {search_e}")
                email_search = None
            
            return Response({
                "error": "User account not found in system. Please contact support.",
                "debug_info": {
                    "user_id_searched": user_id,
                    "email_searched": email,
                    "found_by_id": 0,
                    "found_by_email": len(email_search.data) if email_search and email_search.data else 0,
                    "message": "User exists in auth but not in users table - needs to be created"
                }
            }, status=status.HTTP_403_FORBIDDEN)
        
        user_record = user_data.data[0]
        role_raw = user_record.get("role")
        user_status = user_record.get("status")
        
        # Check if role exists
        if not role_raw:
            print(f"❌ No role assigned for user ID: {user_id}")
            return Response({
                "error": "No role assigned to your account. Please contact support."
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if status exists
        if not user_status:
            print(f"❌ No status assigned for user ID: {user_id}")
            return Response({
                "error": "Account status not set. Please contact support."
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Normalize role
        ROLE_MAP = {
            "Kutsero": "kutsero",
            "Horse Operator": "horse_operator"
        }
        user_role = ROLE_MAP.get(role_raw)
        
        if not user_role:
            print(f"❌ Invalid role '{role_raw}' for user ID: {user_id}")
            return Response({
                "error": f"Invalid role '{role_raw}' assigned to your account. Please contact support."
            }, status=status.HTTP_403_FORBIDDEN)
        
        print(f"✅ Found user - Role: {user_role}, Status: {user_status}")
        
        # Check account status before proceeding
        status_lower = user_status.lower().strip()
        
        if status_lower == "declined" or status_lower == "decline":
            print(f"❌ Account declined for user ID: {user_id}")
            return Response({
                "error": "Your registration has been declined. Please contact support.",
                "user_status": user_status
            }, status=status.HTTP_403_FORBIDDEN)
        
        if status_lower == "pending":
            print(f"❌ Account pending for user ID: {user_id}")
            return Response({
                "error": "Your account is still pending approval. Please wait for admin approval.",
                "user_status": user_status
            }, status=status.HTTP_403_FORBIDDEN)
        
        if status_lower != "approved":
            print(f"❌ Invalid status '{user_status}' for user ID: {user_id}")
            return Response({
                "error": f"Your account status is '{user_status}'. Only approved accounts can login.",
                "user_status": user_status
            }, status=status.HTTP_403_FORBIDDEN)
        
        print(f"✅ Account approved, proceeding with login for {email}")
        
    except Exception as e:
        print(f"❌ DETAILED ERROR fetching user role/status:")
        print(f"❌ Exception type: {type(e).__name__}")
        print(f"❌ Exception message: {str(e)}")
        print(f"❌ User ID that caused error: {user_id}")
        print(f"❌ Email: {email}")
        
        import traceback
        print(f"❌ Full traceback:")
        traceback.print_exc()
        
        return Response({
            "error": "Error accessing user account. Please contact support.",
            "debug_info": {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "user_id": user_id,
                "email": email
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 3️⃣ Get profile info depending on role
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    # 6️⃣ Return successful response - MUST include user_role and user_status keys
=======
    # 4️⃣ Return response - Only for approved users
>>>>>>> Stashed changes
    response_data = {
        "message": "Login successful",
        "user": user,
        "profile": profile,
<<<<<<< Updated upstream
        "role": user_role,                    # Exact value from database
        "user_role": user_role,               # Frontend expects this key
        "status": user_status,                # Exact value from database  
        "user_status": user_status,           # Frontend expects this key
=======
        "user_role": user_role,
        "user_status": user_status,  # This will always be "approved" at this point
>>>>>>> Stashed changes
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": auth_data.get('expires_in'),
        "token_type": auth_data.get('token_type', 'Bearer')
    }
<<<<<<< Updated upstream
    
    print(f"Mobile login successful for user {email} with role {user_role}")
    return Response(response_data, status=status.HTTP_200_OK)
=======
>>>>>>> Stashed changes

    print(f"✅ Login successful for {email} as {user_role} with status {user_status}")
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