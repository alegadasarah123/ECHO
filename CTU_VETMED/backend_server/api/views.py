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

# Error helper
def json_error(message, http_status=status.HTTP_400_BAD_REQUEST, details=None):
    return Response(
        {"error": message, "details": details},
        status=http_status
    )
@api_view(['POST'])
def signup(request):
    try:
        # 1️⃣ Get fields from frontend
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "").strip()
        first_name = request.data.get("firstName", "").strip()
        last_name = request.data.get("lastName", "").strip()
        phone_number = str(request.data.get("phoneNumber", "")).strip()

        if not all([email, password, first_name, last_name, phone_number]):
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

        # 2️⃣ Check if email exists in Supabase Auth
        admin_headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": CONTENT_TYPE_JSON
        }
        check_url = f"{SUPABASE_URL}/auth/v1/admin/users?email={email}"
        check_res = requests.get(check_url, headers=admin_headers)
        if check_res.status_code == 200:
            users_list = check_res.json().get("users", [])
            if any(u.get("email") == email for u in users_list):
                return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        # 3️⃣ Create user in Supabase Auth
        signup_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        payload_auth = {"email": email, "password": password}
        auth_res = requests.post(signup_url, json=payload_auth, headers=admin_headers)
        if auth_res.status_code not in [200, 201]:
            return Response({"error": "Failed to create user in Supabase Auth"}, status=400)

        user_data = auth_res.json()
        user_id = user_data.get("id")  # UUID

        # 4️⃣ Insert into public.users
        user_payload = {
            "id": user_id,
            "role": "Ctu-Vetmed",
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
            return Response({"error": "Failed to insert into public.users."}, status=400)

        # 5️⃣ Insert into ctu_vet_profile (using ctu_id as FK)
        sr_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        profile_payload = {
            "ctu_id": user_id,            # FK → users.id
            "ctu_fname": first_name,
            "ctu_lname": last_name,
            "ctu_email": email,
            "ctu_phonenum": phone_number
        }
        profile_res = sr_client.table("ctu_vet_profile").insert(profile_payload).execute()
        if not profile_res.data:
            # Rollback both users & auth user
            requests.delete(f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}", headers=insert_users_headers)
            requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=admin_headers)
            return Response({"error": "Failed to insert into ctu_vet_profile"}, status=400)

        # ✅ Success
        return Response({
            "message": "User created successfully",
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
    """
    Password login (anon key), then fetch profile using service role by user id.
    """
    try:
        email = (request.data.get("email") or "").strip()
        password = (request.data.get("password") or "").strip()

        if not email or not password:
            return json_error("Email and password are required.", status.HTTP_400_BAD_REQUEST)

        # 1️⃣ Login via Auth (anon key)
        login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = {"apikey": SUPABASE_ANON_KEY, "Content-Type": CONTENT_TYPE_JSON}
        payload = {"email": email, "password": password}
        auth_resp = requests.post(login_url, json=payload, headers=headers)

        if auth_resp.status_code not in (200, 201):
            return json_error(
                "Invalid login credentials.",
                status.HTTP_401_UNAUTHORIZED,
                details=auth_resp.text
            )

        auth_data = auth_resp.json()
        user_id = (auth_data.get("user") or {}).get("id")

        # 2️⃣ Lookup by ctu_id, not id
        profile_res = sr_client.table("ctu_vet_profile") \
                               .select("*") \
                               .eq("ctu_id", user_id) \
                               .limit(1) \
                               .execute()
        profile = profile_res.data[0] if profile_res.data else {}

        return Response(
            {
                "message": "Login successful",
                "auth_data": auth_data,
                "ctu_vet_profile": profile
            },
            status=status.HTTP_200_OK
        )

    except Exception as e:
        return json_error(
            "Internal Server Error.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=str(e)
        )

@api_view(["GET"])
def get_users(request):
    try:
        res = sr_client.table("ctu_vet_profile").select("*").execute()
        users = [
            {
                "id": row["id"],
                "firstname": row["ctu_fname"],
                "lastname": row["ctu_lname"],
                "email": row["ctu_email"],
                "phone": str(row["ctu_phonenum"]) if row.get("ctu_phonenum") else "",
                "role": row.get("role", "Vet"),
                "status": "Active"  # default since not in table
            }
            for row in (res.data or [])
        ]
        return Response({"users": users}, status=status.HTTP_200_OK)
    except Exception as e:
        return json_error("Internal Server Error.", status.HTTP_500_INTERNAL_SERVER_ERROR, details=str(e))

