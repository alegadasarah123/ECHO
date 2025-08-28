from rest_framework.decorators import api_view
from rest_framework.response import Response
from supabase import create_client, Client
from django.conf import settings
import requests
import datetime

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
    
    pending_count = sum(
        1 for u in users 
        if u["status"].strip().lower() == "pending" and u["role"] in ["Kutsero", "Horse Operator"]
    )
    
    return Response({
        "users": users,
        "pending_count": pending_count
    })


@api_view(["GET"])
def get_approved_counts(request):
    """
    Returns counts of approved KUTSERO and HORSE OPERATOR.
    """
    users = fetch_and_merge_users()

    approved_kutsero_count = sum(
        1 for u in users if u["role"].upper() == "KUTSERO" and u["status"].strip().lower() == "approved"
    )
    approved_horse_operator_count = sum(
        1 for u in users if u["role"].upper() == "HORSE OPERATOR" and u["status"].strip().lower() == "approved"
    )

    return Response({
        "approved_kutsero_count": approved_kutsero_count,
        "approved_horse_operator_count": approved_horse_operator_count,
    })


# -------------------- USER APPROVALS --------------------
@api_view(["GET"])
def get_user_approvals(request):
    """Return ALL users (pending, approved, declined)"""
    users = fetch_and_merge_users()
    return Response(users)

@api_view(["POST"])
def approve_all_users(request):
    """
    Approve all users that are currently pending.
    """
    try:
        # Update all pending users
        response = supabase.table("users").update({"status": "approved"}).eq("status", "pending").execute()
        
        updated_count = response.count if hasattr(response, "count") else len(response.data)
        return Response({
            "message": f"Approved {updated_count} user(s).",
            "approved_count": updated_count
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

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

# -------------------- DELETE DECLINED USERS --------------------

@api_view(['DELETE'])
def delete_declined_users(request):
    """
    Deletes declined users from:
      - kutsero_profile / horse_operator_profile
      - users (public.users)
      - supabase auth.users
    Expects: { "ids": ["uuid1", "uuid2"] }
    """
    ids = request.data.get("ids", [])

    if not ids:
        return Response({"error": "No user IDs provided."})

    deleted_ids = []
    skipped_ids = []

    for user_id in ids:
        # 1. Fetch user status + role
        res = supabase.table("users").select("status, role").eq("id", user_id).execute()
        if not res.data:
            skipped_ids.append(user_id)
            continue

        status_value = res.data[0]["status"]
        role_value = (res.data[0].get("role") or "").lower()

        if status_value != "declined":
            skipped_ids.append(user_id)
            continue

        # 2. Delete from child tables first
        if role_value == "kutsero":
            supabase.table("kutsero_profile").delete().eq("kutsero_id", user_id).execute()
        elif role_value == "horse operator":
            supabase.table("horse_operator_profile").delete().eq("operator_id", user_id).execute()

        # 3. Delete from users table
        supabase.table("users").delete().eq("id", user_id).execute()

        # 4. Delete from Supabase Auth
        auth_url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
        headers = {
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}"
        }
        try:
            requests.delete(auth_url, headers=headers, timeout=10)
        except Exception as e:
            print(f"⚠️ Failed to delete auth user {user_id}: {e}")

        deleted_ids.append(user_id)

    return Response(
        {"success": True, "deleted": deleted_ids, "skipped": skipped_ids},
    )

# -------------------- NOTIFICATIONS --------------------
@api_view(["GET"])
def get_notifications(request):
    """
    Fetch notifications only for Kutsero and Horse Operator.
    Insert missing notifications for pending users if not already saved.
    """

    # 1️⃣ Fetch all users
    users = fetch_and_merge_users()
    if not users:
        return Response([])

    # Build a mapping of user_id -> role
    user_roles = {u["id"]: u["role"] for u in users}

    # 2️⃣ Fetch existing notifications
    result = supabase.table("notification").select("*").order("notif_id", desc=True).execute()
    notifications_raw = result.data if result.data else []

    # 3️⃣ Manila timezone
    manila_tz = datetime.timezone(datetime.timedelta(hours=8))

    # 4️⃣ Insert missing notifications for pending users
    existing_ids = {n["id"] for n in notifications_raw}
    for u in users:
        if u["status"] == "pending" and u["role"] in ["Kutsero", "Horse Operator"] and u["id"] not in existing_ids:
            dt_ph = datetime.datetime.fromisoformat(u["created_at"].replace("Z", "+00:00")).astimezone(manila_tz) if u.get("created_at") else datetime.datetime.now(manila_tz)
            try:
                supabase.table("notification").insert({
                    "id": u["id"],
                    "notif_message": f"New {u['role']} registered: {u['name']}",
                    "notif_date": dt_ph.date().isoformat(),         # ✅ Convert date to string
                    "notif_time": dt_ph.time().strftime("%H:%M:%S") # ✅ Convert time to string
                }).execute()
            except Exception as e:
                print(f"Failed to insert notification for user {u['id']}: {e}")

    # 5️⃣ Re-fetch notifications after insert
    result = supabase.table("notification").select("*").order("notif_id", desc=True).execute()
    notifications_raw = result.data if result.data else []

    # 6️⃣ Filter notifications: only Kutsero or Horse Operator
    notifications_filtered = []
    for n in notifications_raw:
        role = user_roles.get(n["id"])
        if role in ["Kutsero", "Horse Operator"]:
            # Ensure date/time are strings for JSON
            notif_date_str = str(n['notif_date'])
            notif_time_str = str(n['notif_time'])
            date_iso = f"{notif_date_str}T{notif_time_str}+08:00"

            notifications_filtered.append({
                "id": n["notif_id"],
                "message": n["notif_message"],
                "date": date_iso,
            })

    # 7️⃣ Sort newest first
    notifications_filtered.sort(key=lambda x: x["id"] or 0, reverse=True)

    return Response(notifications_filtered)


# -------------------- NOTIFICATIONS --------------------
@api_view(["GET"])
def get_notifications(request):
    """
    Fetch notifications for Kutsero President.
    Inserts new ones for pending users if not already saved.
    Returns full notification history.
    """
    users = fetch_and_merge_users()
    pending_users = [u for u in users if u["status"] == "pending"]

    # Get existing notifications (by user id)
    existing = supabase.table("notification").select("id").execute()
    existing_ids = {row["id"] for row in existing.data} if existing.data else set()

    # Manila timezone offset
    manila_offset = datetime.timedelta(hours=8)
    manila_tz = datetime.timezone(manila_offset)

    # Insert new notifications only for pending users not in table
    for u in pending_users:
        if u["id"] not in existing_ids:
            notif_message = f"New {u['role']} registered: {u['name']}"

            # Fetch created_at from Supabase Auth
            created_at = u.get("created_at")
            if created_at:
                # Parse UTC timestamp
                dt = datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                # Convert to Manila time
                dt_ph = dt.astimezone(manila_tz)
            else:
                dt_ph = datetime.datetime.now(manila_tz)

            notif_date = dt_ph.strftime("%Y-%m-%d")
            notif_time = dt_ph.strftime("%H:%M:%S")

            supabase.table("notification").insert({
                "id": u["id"],
                "notif_message": notif_message,
                "notif_date": notif_date,
                "notif_time": notif_time,
            }).execute()

    # Fetch all notifications
    result = supabase.table("notification").select("*").order("notif_id", desc=True).execute()

    notifications = []
    if result.data:
        for row in result.data:
            # Combine date + time with PH timezone for frontend
            date_iso = f"{row['notif_date']}T{row['notif_time']}+08:00"
            notifications.append({
                "id": row["notif_id"],
                "message": row["notif_message"],
                "date": date_iso,
            })

    return Response(notifications)