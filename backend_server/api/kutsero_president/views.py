from rest_framework.decorators import api_view
from rest_framework.response import Response
from supabase import create_client, Client
from django.conf import settings
import requests

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

SUPABASE_URL = settings.SUPABASE_URL
SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY

@api_view(["GET"])
def get_users(request):
    print("➡️ get_users called")  

    # 1. Fetch users from auth.users
    auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}"
    }
    auth_res = requests.get(auth_url, headers=headers)
    print("➡️ Auth status:", auth_res.status_code)

    auth_users = auth_res.json().get("users", [])
    print("➡️ Auth users count:", len(auth_users))

    # 2. Fetch base users table
    db_res = supabase.table("users").select("*").execute()
    db_users = {u["id"]: u for u in db_res.data or []}

    # 3. Fetch kutsero profiles
    kutsero_res = supabase.table("kutsero_profile").select("*").execute()
    kutsero_profiles = {kp["kutsero_id"]: kp for kp in kutsero_res.data or []}

    # 4. Fetch horse operator profiles
    ho_res = supabase.table("horse_operator_profile").select("*").execute()
    ho_profiles = {hp["operator_id"]: hp for hp in ho_res.data or []}

    # 5. Merge + filter roles
    allowed_roles = {"kutsero", "horse operator"}
    merged_users = []

    for au in auth_users:
        user_id = au["id"]
        if user_id in db_users:
            db_u = db_users[user_id]
            role_raw = (db_u.get("role") or "").strip()
            role = role_raw.lower()

            if role in allowed_roles:
                profile_name = ""
                profile_contact = ""

                if role == "kutsero" and user_id in kutsero_profiles:
                    kp = kutsero_profiles[user_id]
                    profile_name = " ".join(filter(None, [kp.get("kutsero_fname"), kp.get("kutsero_mname"), kp.get("kutsero_lname")]))
                    profile_contact = kp.get("kutsero_phone_num", "")

                elif role == "horse operator" and user_id in ho_profiles:
                    hp = ho_profiles[user_id]
                    profile_name = " ".join(filter(None, [hp.get("operator_fname"), hp.get("operator_mname"), hp.get("operator_lname")]))
                    profile_contact = hp.get("operator_phone_num", "")

                merged_users.append({
                    "id": user_id,
                    "email": au.get("email", ""),
                    "joined_date": au.get("created_at", ""),
                    "name": profile_name.strip(),
                    "contact_num": profile_contact,
                    "role": role_raw  # keep original casing
                })

    print("➡️ Final users count:", len(merged_users))
    return Response(merged_users)
