from rest_framework.decorators import api_view
from rest_framework.response import Response
from supabase import create_client, Client
from django.conf import settings
from functools import wraps
import requests
import datetime
import jwt
from django.utils import timezone

# -------------------- SUPABASE CLIENT --------------------
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
SUPABASE_URL = settings.SUPABASE_URL
SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY

# -------------------- AUTH HELPERS --------------------
def get_token_from_cookie(request):
    """Return the JWT or access token from the HttpOnly cookie"""
    return request.COOKIES.get("access_token")

def login_required(func):
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        token = get_token_from_cookie(request)
        if not token:
            return Response({"error": "Authentication required"}, status=401)
        # Optional: verify token with Supabase here
        return func(request, *args, **kwargs)
    return wrapper

@api_view(["GET"])
def test_cookie(request):
    token = request.COOKIES.get("access_token")
    return Response({"token_present": bool(token)})

# -------------------- CORE REUSABLE FUNCTION --------------------
def fetch_and_merge_users():
    """Fetch users from Supabase auth + db and merge profiles with details"""
    auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}"
    }
    auth_res = requests.get(auth_url, headers=headers)
    auth_users = auth_res.json().get("users", [])

    db_res = supabase.table("users").select("*").execute()
    db_users = {u["id"]: u for u in db_res.data or []}

    kutsero_res = supabase.table("kutsero_profile").select("*").execute()
    kutsero_profiles = {kp["kutsero_id"]: kp for kp in kutsero_res.data or []}

    ho_res = supabase.table("horse_op_profile").select("*").execute()
    ho_profiles = {hp["op_id"]: hp for hp in ho_res.data or []}

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
                    full_name = " ".join(filter(None, [
                        kp.get("kutsero_fname"),
                        kp.get("kutsero_mname"),
                        kp.get("kutsero_lname")
                    ]))
                    contact_num = kp.get("kutsero_phone_num", "")
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
                        "profilePicture": kp.get("profile_picture", "https://via.placeholder.com/120x120?text=Profile")
                    }
                elif role == "horse operator" and user_id in ho_profiles:
                    hp = ho_profiles[user_id]
                    full_name = " ".join(filter(None, [
                        hp.get("op_fname"),
                        hp.get("op_mname"),
                        hp.get("op_lname")
                    ]))
                    contact_num = hp.get("op_phone_num", "")
                    profile = {
                        "dateOfBirth": str(hp.get("op_dob")),
                        "sex": hp.get("op_sex"),
                        "phoneNumber": hp.get("op_phone_num"),
                        "address": ", ".join(filter(None, [
                            hp.get("op_house_add"),
                            hp.get("op_brgy"),
                            hp.get("op_municipality"),
                            hp.get("op_city"),
                            hp.get("op_province"),
                            hp.get("op_zipcode"),
                        ])),
                        "facebook": hp.get("op_fb"),
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
@login_required
def get_users(request):
    users = fetch_and_merge_users()
    pending_count = sum(
        1 for u in users if u["status"].strip().lower() == "pending" and u["role"] in ["Kutsero", "Horse Operator"]
    )
    return Response({"users": users, "pending_count": pending_count})

@api_view(["GET"])
@login_required
def get_approved_counts(request):
    users = fetch_and_merge_users()
    approved_kutsero_count = sum(
        1 for u in users if u.get("role", "").strip().lower() == "kutsero" and u.get("status", "").strip().lower() == "approved"
    )
    approved_horse_operator_count = sum(
        1 for u in users if u.get("role", "").strip().lower() == "horse operator" and u.get("status", "").strip().lower() == "approved"
    )
    return Response({
        "approved_kutsero_count": approved_kutsero_count,
        "approved_horse_operator_count": approved_horse_operator_count,
    })

@api_view(["GET"])
@login_required
def get_user_approvals(request):
    users = fetch_and_merge_users()
    return Response(users)

@api_view(["POST"])
@login_required
def approve_all_users(request):
    try:
        response = supabase.table("users").update({"status": "approved"}).eq("status", "pending").execute()
        updated_count = response.count if hasattr(response, "count") else len(response.data)
        return Response({
            "message": f"Approved {updated_count} user(s).",
            "approved_count": updated_count
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
@login_required
def approve_user(request, user_id):
    ph_time = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8)))
    res = supabase.table("users").update({
        "status": "approved",
        "created_at": ph_time.isoformat()
    }).eq("id", user_id).execute()
    if res.data:
        return Response({"message": "✅ User approved successfully", "user_id": user_id})
    return Response({"error": "User not found"}, status=404)

@api_view(["GET"])
@login_required
def get_approved_users(request):
    users = fetch_and_merge_users()
    
    # Include approved AND deactivated users for Kutsero and Horse Operator roles
    allowed_roles = ["kutsero", "horse operator"]
    filtered_users = [
        u for u in users
        if u.get("role", "").strip().lower() in allowed_roles
        and u.get("status", "").strip().lower() in ["approved", "deactivated"]
    ]

    # Add approved_date field
    for u in filtered_users:
        u["approved_date"] = u.pop("created_at", "N/A")
    
    return Response({"users": filtered_users})


@api_view(["POST"])
@login_required
def decline_user(request, user_id):
    res = supabase.table("users").update({"status": "declined"}).eq("id", user_id).execute()
    if res.data:
        return Response({"message": "⚠️ User declined successfully", "user_id": user_id})
    return Response({"error": "User not found"}, status=404)


@api_view(["GET"])
@login_required
def get_notifications(request):
    """Fetch notifications for Kutsero and Horse Operator and insert missing for pending users."""
    users = fetch_and_merge_users()
    if not users:
        return Response([])

    user_roles = {u["id"]: u["role"] for u in users}

    result = supabase.table("notification").select("*").order("notif_id", desc=True).execute()
    notifications_raw = result.data if result.data else []

    manila_tz = datetime.timezone(datetime.timedelta(hours=8))

    existing_ids = {n["id"] for n in notifications_raw}
    for u in users:
        if u["status"] == "pending" and u["role"] in ["Kutsero", "Horse Operator"] and u["id"] not in existing_ids:
            dt_ph = datetime.datetime.fromisoformat(u["created_at"].replace("Z", "+00:00")).astimezone(manila_tz) \
                if u.get("created_at") else datetime.datetime.now(manila_tz)
            try:
                supabase.table("notification").insert({
                    "id": u["id"],
                    "notif_message": f"New {u['role']} registered: {u['name']}",
                    "notif_date": dt_ph.date().isoformat(),
                    "notif_time": dt_ph.time().strftime("%H:%M:%S")
                }).execute()
            except Exception as e:
                print(f"Failed to insert notification for user {u['id']}: {e}")

    # Re-fetch notifications
    result = supabase.table("notification").select("*").order("notif_id", desc=True).execute()
    notifications_raw = result.data if result.data else []

    notifications_filtered = []
    for n in notifications_raw:
        role = user_roles.get(n["id"])
        if role in ["Kutsero", "Horse Operator"]:
            notif_date_str = str(n['notif_date'])
            notif_time_str = str(n['notif_time'])
            date_iso = f"{notif_date_str}T{notif_time_str}+08:00"
            notifications_filtered.append({
                "id": n["notif_id"],
                "message": n["notif_message"],
                "date": date_iso,
            })

    notifications_filtered.sort(key=lambda x: x["id"] or 0, reverse=True)
    return Response(notifications_filtered)

@api_view(["POST"])
@login_required
def deactivate_user(request, user_id):
    """Set user status to deactivated in public.users"""
    res = supabase.table("users").update({"status": "deactivated"}).eq("id", user_id).execute()
    
    if res.data:
        return Response({"message": "User deactivated successfully", "user_id": user_id})
    return Response({"error": "User not found"}, status=404)

@api_view(["POST"])
@login_required
def reactivate_user(request, user_id):
    """Set user status to approved in public.users"""
    res = supabase.table("users").update({"status": "approved"}).eq("id", user_id).execute()
    
    if res.data:
        return Response({"message": "User reactivated successfully", "user_id": user_id})
    return Response({"error": "User not found"}, status=404)

# ------------------------- SETTINGS ------------------------------------
@api_view(["GET"])
@login_required
def get_president_profile(request):
    try:
        # 1️⃣ Get token from cookie (adjust your cookie name!)
        token = request.COOKIES.get("access_token")  # exact cookie name set by login
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        # 2️⃣ Decode JWT to get Supabase user_id
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")  # this is the UUID
        if not user_id:
            return Response({"error": "Invalid token"}, status=401)

        # 3️⃣ Query Supabase for the profile
        res = supabase.table("kutsero_pres_profile").select("*").eq("user_id", user_id).execute()
        if not res.data:
            return Response({"error": "Profile not found"}, status=404)

        profile = res.data[0]
        return Response({
            "pres_id": profile.get("pres_id"),
            "user_id": user_id,
            "pres_email": profile.get("pres_email"),
            "pres_fname": profile.get("pres_fname", ""),
            "pres_lname": profile.get("pres_lname", ""),
            "pres_phonenum": profile.get("pres_phonenum", "")
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
@login_required
def save_president_profile(request):
    """Kutsero President updates only fname, lname, phone"""
    try:
        # 1️⃣ Get token and decode user_id
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token"}, status=401)

        # 2️⃣ Get input values
        pres_fname = request.data.get("pres_fname", "").strip()
        pres_lname = request.data.get("pres_lname", "").strip()
        pres_phonenum = request.data.get("pres_phonenum", "").strip()

        # 3️⃣ Validate required fields
        errors = {}
        if not pres_fname:
            errors["pres_fname"] = "First name is required."
        if not pres_lname:
            errors["pres_lname"] = "Last name is required."
        if not pres_phonenum:
            errors["pres_phonenum"] = "Phone number is required."
        if errors:
            return Response({"errors": errors}, status=400)

        # 4️⃣ Fetch existing profile to get email
        existing = supabase.table("kutsero_pres_profile").select("pres_email").eq("user_id", user_id).execute()
        if not existing.data:
            return Response({"error": "Profile not found; email must exist in DB"}, status=400)

        pres_email = existing.data[0]["pres_email"]

        # 5️⃣ Upsert (insert if not exists, update if exists)
        data = {
            "user_id": user_id,
            "pres_fname": pres_fname,
            "pres_lname": pres_lname,
            "pres_phonenum": pres_phonenum,
            "pres_email": pres_email,  # must include existing email
        }

        res = supabase.table("kutsero_pres_profile").upsert(
            data, on_conflict="user_id"
        ).execute()

        if res.data:
            return Response({"message": "Profile saved successfully"})
        return Response({"error": "Failed to save profile"}, status=400)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
@login_required
def update_president_profile(request):
    """
    Update Kutsero President profile:
    - fname, lname, phone, email
    - Updates both Supabase Auth email and kutsero_pres_profile
    """
    try:
        # 1️⃣ Get token from cookie
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        # 2️⃣ Decode JWT to get user_id
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id = payload.get("sub")
            if not user_id:
                return Response({"error": "Invalid token: no user_id"}, status=401)
        except Exception as e:
            return Response({"error": f"JWT decode error: {str(e)}"}, status=401)

        # 3️⃣ Get input values
        pres_fname = request.data.get("pres_fname", "").strip()
        pres_lname = request.data.get("pres_lname", "").strip()
        pres_email = request.data.get("pres_email", "").strip()
        pres_phonenum = request.data.get("pres_phonenum", "").strip()

        # 4️⃣ Validate required fields
        errors = {}
        if not pres_fname:
            errors["pres_fname"] = "First name is required."
        if not pres_lname:
            errors["pres_lname"] = "Last name is required."
        if not pres_email:
            errors["pres_email"] = "Email is required."
        if not pres_phonenum:
            errors["pres_phonenum"] = "Phone number is required."

        if errors:
            return Response({"errors": errors}, status=400)

        # 5️⃣ Update Supabase Auth email
        try:
            supabase.auth.admin.update_user_by_id(
                user_id,
                {"email": pres_email}
            )
        except Exception as e:
            return Response({"error": f"Supabase auth update failed: {str(e)}"}, status=500)

        # 6️⃣ Upsert profile
        data = {
            "user_id": user_id,
            "pres_fname": pres_fname,
            "pres_lname": pres_lname,
            "pres_email": pres_email,
            "pres_phonenum": pres_phonenum,
        }

        supabase.table("kutsero_pres_profile").upsert(
            data, on_conflict="user_id"
        ).execute()

        return Response({"message": "Profile updated successfully"})

    except Exception as e:
        return Response({"error": f"Unexpected server error: {str(e)}"}, status=500)


@api_view(["POST"])
@login_required
def change_password(request):
    """
    Change the password for the logged-in Kutsero President
    """
    try:
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token: no user_id"}, status=401)

        current_password = request.data.get("current_password", "").strip()
        new_password = request.data.get("new_password", "").strip()
        pres_email = request.data.get("email", "").strip()  # frontend just sends email

        errors = {}
        if not current_password:
            errors["current_password"] = "Current password is required."
        if not new_password:
            errors["new_password"] = "New password is required."
        if not pres_email:
            errors["email"] = "Email is required."
        if errors:
            return Response({"errors": errors}, status=400)

        # ✅ Verify current password via Supabase REST endpoint
        resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SERVICE_ROLE_KEY},
            json={"email": pres_email, "password": current_password}
        )
        verify_data = resp.json()
        if resp.status_code != 200 or "access_token" not in verify_data:
            return Response({"errors": {"current_password": "Incorrect current password"}}, status=400)

        # ✅ Update password using Admin API
        supabase.auth.admin.update_user_by_id(user_id, {"password": new_password})
        return Response({"message": "Password updated successfully"})

    except Exception as e:
        return Response({"error": f"Unexpected server error: {str(e)}"}, status=500)

    
