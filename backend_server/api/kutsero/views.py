from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import requests

# Initialize Supabase client
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


# ------------------- SIGNUP -------------------
@api_view(['POST'])
def signup(request):
    email = request.data.get("email")
    password = request.data.get("password")
    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # Generate username if not provided
    username = request.data.get("username") or email.split('@')[0]

    # Create user in Supabase Auth with email_confirmed=True
    signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    payload_auth = {
        "email": email,
        "password": password,
        "email_confirm": True
    }

    auth_response = requests.post(signup_url, json=payload_auth, headers=headers)
    auth_json = auth_response.json()

    if auth_response.status_code not in [200, 201]:
        return Response({"error": "Failed to create user in Supabase Auth", "details": auth_json}, status=400)

    user_id = auth_json.get('id') or auth_json.get('user', {}).get('id')
    if not user_id:
        return Response({"error": "Supabase Auth did not return a user ID"}, status=400)

    # Insert into users table with pending status
    user_payload = {"id": user_id, "role": "kutsero", "status": "pending"}
    insert_headers = headers.copy()
    insert_headers["Prefer"] = "return=representation"
    user_insert_response = requests.post(f"{SUPABASE_URL}/rest/v1/users", json=user_payload, headers=insert_headers)
    user_insert_json = user_insert_response.json()
    if user_insert_response.status_code not in [200, 201]:
        # Cleanup
        requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
        return Response({"error": "Failed to insert into users table", "details": user_insert_json}, status=400)

    # Insert profile
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
    profile_response = requests.post(f"{SUPABASE_URL}/rest/v1/kutsero_profile", json=profile_payload, headers=insert_headers)

    return Response({
        "message": "User registration completed. Status is pending but you can login for testing.",
        "user": auth_json,
        "user_record": user_insert_json,
        "profile": profile_response.json()
    }, status=201)


# ------------------- LOGIN -------------------
@api_view(['POST'])
def login(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # Supabase login endpoint
    login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
    payload = {"email": email, "password": password}

    auth_response = requests.post(login_url, json=payload, headers=headers)
    auth_json = auth_response.json()
    print("Supabase Auth login response:", auth_response.status_code, auth_json)

    # If login fails, return error but allow testing even if email not confirmed
    if auth_response.status_code != 200:
        error_message = (
            auth_json.get('error_description') or 
            auth_json.get('msg') or 
            auth_json.get('error') or 
            'Login failed'
        )
        if 'confirm' in error_message.lower():
            error_message = "Your account is not confirmed, but you can still log in for testing."
        return Response({"error": error_message, "details": auth_json}, status=status.HTTP_401_UNAUTHORIZED)

    # Successful login
    access_token = auth_json.get('access_token')
    refresh_token = auth_json.get('refresh_token')
    user = auth_json.get('user', {})

    if not user or not access_token:
        return Response({"error": "Invalid response from authentication server"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    user_id = user.get('id')

    # Fetch user status and role from users table
    user_status = "pending"
    user_role = None
    try:
        status_data = supabase.table("users").select("status", "role").eq("id", user_id).execute()
        if status_data.data:
            user_status = status_data.data[0].get('status', "pending")
            user_role = status_data.data[0].get('role')
    except Exception as e:
        print(f"Error checking user status or role: {e}")

    # Fetch profile from kutsero_profile table
    profile = None
    try:
        profile_data = supabase.table("kutsero_profile").select("*").eq("kutsero_email", email).execute()
        if profile_data.data:
            profile = profile_data.data[0]
    except Exception as e:
        print(f"Error fetching profile: {e}")

    return Response({
        "message": f"Login successful (status: {user_status})",
        "user": user,
        "profile": profile,
        "user_status": user_status,
        "user_role": user_role,
        "access_token": access_token,
        "refresh_token": refresh_token
    }, status=status.HTTP_200_OK)
