from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client
import os, requests

# Environment config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://YOUR_PROJECT.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "YOUR_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "YOUR_SERVICE_ROLE_KEY")
CONTENT_TYPE_JSON = "application/json"

# Supabase service role client
sr_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

@api_view(['POST'])
def signup(request):
    try:
        email = request.data.get("email", "").strip()
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        phone_number = str(request.data.get("phoneNumber", "")).strip()
        password = request.data.get("password", "").strip()  # 👈 added

        if not all([email, first_name, last_name, phone_number, password]):
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Admin headers
        admin_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": CONTENT_TYPE_JSON
        }

        # Check if email already exists
        check_url = f"{SUPABASE_URL}/auth/v1/admin/users?email={email}"
        check_res = requests.get(check_url, headers=admin_headers)
        if check_res.status_code == 200:
            users_list = check_res.json().get("users", [])
            if any(u.get("email") == email for u in users_list):
                return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # 1️⃣ Create user with password in Supabase Auth
        signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        payload_auth = {"email": email, "password": password}  # 👈 add password here
        auth_res = requests.post(signup_url, json=payload_auth, headers=admin_headers)
        if auth_res.status_code not in [200, 201]:
            return Response({"error": "Failed to create user in Supabase Auth"}, status=400)

        user_data = auth_res.json()
        user_id = user_data.get("id")

        # 2️⃣ Insert into public.users
        user_payload = {
            "id": user_id,
            "role": "Ctu-VetMed",
            "status": "approved"
        }
        insert_users_url = f"{SUPABASE_URL}/rest/v1/users"
        insert_users_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": CONTENT_TYPE_JSON,
            "Prefer": "return=representation"
        }
        users_res = requests.post(insert_users_url, json=user_payload, headers=insert_users_headers)
        if users_res.status_code not in [200, 201]:
            requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=admin_headers)
            return Response({"error": "Failed to insert into public.users"}, status=400)

        # 3️⃣ Insert into ctu_vet_profile (including ctu_pass)
        profile_payload = {
            "ctu_id": user_id,
            "ctu_fname": first_name,
            "ctu_lname": last_name,
            "ctu_email": email,
            "ctu_phonenum": phone_number,
            "ctu_pass": password   # 👈 added
        }
        profile_res = sr_client.table("ctu_vet_profile").insert(profile_payload).execute()
        if not profile_res.data:
            requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=insert_users_headers)
            requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=admin_headers)
            return Response({"error": "Failed to insert into ctu_vet_profile"}, status=400)

        # ✅ No need for reset email since we already created with password
        return Response({
            "message": "User created successfully.",
            "user": {
                "id": user_id,
                "email": email,
                "firstName": first_name,
                "lastName": last_name,
                "phoneNumber": phone_number
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": "Internal Server Error", "details": str(e)}, status=500)


@api_view(["POST"])
def user_login(request):
    try:
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "").strip()

        if not email or not password:
            return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Supabase Auth login endpoint
        login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": SUPABASE_ANON_KEY,  # Use anon key for login
            "Content-Type": CONTENT_TYPE_JSON
        }
        payload = {
            "email": email,
            "password": password
        }

        auth_res = requests.post(login_url, json=payload, headers=headers)

        if auth_res.status_code not in [200, 201]:
            try:
                error_details = auth_res.json()
            except ValueError:
                error_details = {"message": auth_res.text}
            return Response({
                "error": "Invalid login credentials",
                "details": error_details
            }, status=status.HTTP_401_UNAUTHORIZED)

        auth_data = auth_res.json()
        user_id = auth_data.get("user", {}).get("id")

        if not user_id:
            return Response({"error": "Login failed: missing user id"}, status=status.HTTP_400_BAD_REQUEST)

        # Optionally fetch app-specific user data
        user_info = sr_client.table("ctu_vet_profile").select("*").eq("ctu_id", user_id).execute()

        return Response({
            "message": "Login successful",
            "auth_data": auth_data,  # contains access_token, refresh_token, etc.
            "user_info": user_info.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": "Internal Server Error", "details": str(e)}, status=500)


@api_view(['GET'])
def get_vet_profiles(request):
    try:
        # Query vet_profile table
        response = sr_client.table("vet_profile").select("*").execute()

        if response.data:
            return Response(response.data, status=status.HTTP_200_OK)
        else:
            return Response({"message": "No records found"}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)