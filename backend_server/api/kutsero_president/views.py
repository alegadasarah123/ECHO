from rest_framework.decorators import api_view
from rest_framework.response import Response
from supabase import create_client, Client
from django.conf import settings
import requests

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

SUPABASE_URL = settings.SUPABASE_URL
SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY


# -------------------- CORE REUSABLE FUNCTION --------------------
def fetch_and_merge_users():
    """Fetch users from Supabase auth + db and merge profiles with details"""
    # 1. Fetch users from auth.users
    auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}"
    }
    auth_res = requests.get(auth_url, headers=headers)
    auth_users = auth_res.json().get("users", [])

    # 2. Fetch base users table
    db_res = supabase.table("users").select("*").execute()
    db_users = {u["id"]: u for u in db_res.data or []}

    # 3. Fetch kutsero profiles
    kutsero_res = supabase.table("kutsero_profile").select("*").execute()
    kutsero_profiles = {kp["kutsero_id"]: kp for kp in kutsero_res.data or []}

    # 4. Fetch horse operator profiles
    ho_res = supabase.table("horse_operator_profile").select("*").execute()
    ho_profiles = {hp["operator_id"]: hp for hp in ho_res.data or []}

    # 5. Merge
    allowed_roles = {"kutsero", "horse operator"}
    merged = []

    for au in auth_users:
        user_id = au["id"]
        if user_id in db_users:
            db_u = db_users[user_id]
            role_raw = (db_u.get("role") or "").strip()
            role = role_raw.lower()
            status = (db_u.get("status") or "pending").lower()

            if role in allowed_roles:
                profile = {}
                full_name = ""
                contact_num = ""

                if role == "kutsero" and user_id in kutsero_profiles:
                    kp = kutsero_profiles[user_id]
                    full_name = " ".join(filter(None, [kp.get("kutsero_fname"), kp.get("kutsero_mname"), kp.get("kutsero_lname")]))
                    contact_num = kp.get("kutsero_phone_num", "")
                    
                    # extra fields
                    profile = {
                        "dateOfBirth": kp.get("kutsero_dob"),
                        "sex": kp.get("kutsero_sex"),
                        "phoneNumber": kp.get("kutsero_phone_num"),
                        "address": ", ".join(filter(None, [
                            kp.get("kutsero_brgy"),
                            kp.get("kutsero_municipality"),
                            kp.get("kutsero_city"),
                            kp.get("kutsero_province"),
                            kp.get("kutsero_zipcode"),
                        ])),
                        "facebook": kp.get("kutsero_fb"),
                        # If you have profile picture column, use it, otherwise fallback
                        "profilePicture": kp.get("profile_picture", "https://via.placeholder.com/120x120?text=Profile")
                    }

                elif role == "horse operator" and user_id in ho_profiles:
                    hp = ho_profiles[user_id]
                    full_name = " ".join(filter(None, [hp.get("operator_fname"), hp.get("operator_mname"), hp.get("operator_lname")]))
                    contact_num = hp.get("operator_phone_num", "")

                    profile = {
                        "dateOfBirth": str(hp.get("operator_dob")),
                        "sex": hp.get("operator_sex"),
                        "phoneNumber": hp.get("operator_phone_num"),
                        "address": ", ".join(filter(None, [
                            hp.get("operator_house_add"),
                            hp.get("operator_brgy"),
                            hp.get("operator_municipality"),
                            hp.get("operator_city"),
                            hp.get("operator_province"),
                            hp.get("operator_zipcode"),
                        ])),
                        "facebook": hp.get("operator_fb"),
                        "profilePicture": hp.get("profile_picture", "https://via.placeholder.com/120x120?text=Profile")
                    }

                merged.append({
                    "id": user_id,
                    "email": au.get("email", ""),
                    "created_at": au.get("created_at", ""),
                    "name": full_name.strip(),
                    "contact_num": contact_num,
                    "role": role_raw,
                    "status": status,
                    **profile 
                })

    return merged


# -------------------- DASHBOARD USERS --------------------
@api_view(["GET"])
def get_users(request):
    users = fetch_and_merge_users()
    pending_count = sum(1 for u in users if u["status"] == "pending")
    return Response({
        "users": users,
        "pending_count": pending_count
    })


# -------------------- USER APPROVALS --------------------
@api_view(["GET"])
def get_user_approvals(request):
    """Return ALL users (pending, approved, declined)"""
    users = fetch_and_merge_users()
    return Response(users)



# -------------------- APPROVE USER --------------------
@api_view(["POST"])
def approve_user(request, user_id):
    """Set user status to approved in public.users"""
    res = supabase.table("users").update({"status": "approved"}).eq("id", user_id).execute()
    
    if res.data:
        return Response({"message": "✅ User approved successfully", "user_id": user_id})
    return Response({"error": "User not found"}, status=404)

# -------------------- DECLINE USER --------------------
@api_view(["POST"])
def decline_user(request, user_id):
    """Set user status to declined in public.users"""
    res = supabase.table("users").update({"status": "declined"}).eq("id", user_id).execute()
    
    if res.data:
        return Response({"message": "⚠️ User declined successfully", "user_id": user_id})
    return Response({"error": "User not found"}, status=404)


