from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import requests

# Initialize Supabase client with anon key
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# Service role key for admin operations
SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY


@api_view(['GET'])
def get_data(request):
    data = supabase.table("operator_profile").select("*").range(0, 49).execute()
    return Response(data.data)


@api_view(['POST'])
def insert_operator_profile(request):
    payload = {
        "operator_id": request.data.get("operatorId"),  # This must be the UUID from auth.users
        "operator_fname": request.data.get("firstName"),
        "operator_mname": request.data.get("middleName"),
        "operator_lname": request.data.get("lastName"),
        "operator_dob": request.data.get("dob"),
        "operator_sex": request.data.get("sex"),
        "operator_phone_number": request.data.get("phoneNumber"),
        "operator_province": request.data.get("province"),
        "operator_city": request.data.get("city"),
        "operator_municipality": request.data.get("municipality"),
        "operator_brgy": request.data.get("barangay"),
        "operator_zipcode": request.data.get("zipCode"),
        "operator_street_add": request.data.get("houseAddress"),
        "operator_routefrom": request.data.get("routeFrom"),
        "operator_routeto": request.data.get("routeTo"),
        "operator_email": request.data.get("email"),
        "operator_fb": request.data.get("facebook"),
        "operator_image": request.data.get("document"),
    }

    # Must use Service Role key for bypassing RLS and inserting with foreign key
    service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    data = service_client.table("operator_profile").insert(payload).execute()

    if data.data:
        return Response({"message": "Operator profile created", "data": data.data}, status=201)
    else:
        return Response({"error": str(data.error)}, status=400)


@api_view(['POST'])
def signup(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # 0. Check if email already exists in Supabase Auth
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
        "role": "Horse Operator",
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

    # 3. Insert into operator_profile
    profile_payload = {
        "operator_id": user_id,
        "operator_fname": request.data.get("firstName"),
        "operator_mname": request.data.get("middleName"),
        "operator_lname": request.data.get("lastName"),
        "operator_dob": request.data.get("dob"),
        "operator_sex": request.data.get("sex"),
        "operator_phone_number": request.data.get("phoneNumber"),
        "operator_province": request.data.get("province"),
        "operator_city": request.data.get("city"),
        "operator_municipality": request.data.get("municipality"),
        "operator_brgy": request.data.get("barangay"),
        "operator_zipcode": request.data.get("zipCode"),
        "operator_street_add": request.data.get("houseAddress"),
        "operator_routefrom": request.data.get("routeFrom"),
        "operator_routeto": request.data.get("routeTo"),
        "operator_email": request.data.get("email"),
        "operator_fb": request.data.get("facebook"),
        "operator_image": request.data.get("document"),
    }
    insert_profile_url = f"{SUPABASE_URL}/rest/v1/operator_profile"
    profile_response = requests.post(insert_profile_url, json=profile_payload, headers=insert_users_headers)

    if profile_response.status_code not in [200, 201]:
        requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=insert_users_headers)
        requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
        return Response({"error": "Failed to insert operator profile"}, status=400)

    return Response({
        "message": "User signed up successfully",
        "auth_user": user_data,
        "app_user": users_response.json(),
        "operator_profile": profile_response.json()
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def login(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    # Supabase login URL
    login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        "apikey": settings.SUPABASE_ANON_KEY,  # Use anon key for Auth login
        "Content-Type": "application/json"
    }
    payload = {
        "email": email,
        "password": password
    }

    auth_response = requests.post(login_url, json=payload, headers=headers)

    if auth_response.status_code not in [200, 201]:
        try:
            error_details = auth_response.json()
        except ValueError:
            error_details = {"message": auth_response.text}
        return Response({
            "error": "Invalid login credentials",
            "details": error_details  # Show actual Supabase error
        }, status=status.HTTP_401_UNAUTHORIZED)

    auth_data = auth_response.json()

    # Optionally fetch user details from your users table
    user_id = auth_data.get("user", {}).get("id")
    if not user_id:
        return Response({"error": "Login failed: missing user id"}, status=status.HTTP_400_BAD_REQUEST)

    # Query app-specific user data
    user_info = supabase.table("users").select("*").eq("id", user_id).execute()
    
    return Response({
        "message": "Login successful",
        "auth_data": auth_data,  # contains access_token, refresh_token, etc.
        "user_info": user_info.data
    }, status=status.HTTP_200_OK)
