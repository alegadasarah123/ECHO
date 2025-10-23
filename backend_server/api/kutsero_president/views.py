from rest_framework.decorators import api_view
from rest_framework.response import Response
from supabase import create_client, Client
from django.conf import settings
from functools import wraps
import requests
from django.utils import timezone
import jwt
import time
import traceback
from datetime import datetime, timedelta
from rest_framework import status

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

    # Fetch core user data
    db_res = supabase.table("users").select("*").execute()
    db_users = {u["id"]: u for u in (db_res.data or [])}

    # Fetch profile tables
    kutsero_res = supabase.table("kutsero_profile").select("*").execute()
    kutsero_profiles = {kp["kutsero_id"]: kp for kp in (kutsero_res.data or [])}

    ho_res = supabase.table("horse_op_profile").select("*").execute()
    ho_profiles = {hp["op_id"]: hp for hp in (ho_res.data or [])}

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

                # ✅ KUTSERO
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
                        # ✅ Directly fetch image column from DB
                        "profilePicture": kp.get("kutsero_image")
                    }

                # ✅ HORSE OPERATOR
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
                        # ✅ Use op_image from DB
                        "profilePicture": hp.get("op_image")
                    }

                merged.append({
                    "id": user_id,
                    "email": au.get("email", ""),
                    "created_at": au.get("created_at", ""),
                    "name": full_name.strip(),
                    "contact_num": contact_num,
                    "role": role_raw,
                    "status": status,
                    "declineReason": db_u.get("decline_reason", ""), 
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

# ---------------------------- APPROVE / DECLINE USER --------------------
from django.core.mail import send_mail
import threading

def send_email_async(subject, plain_message, from_email, recipient_list, html_message):
    """Send email in a background thread."""
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
            html_message=html_message
        )
    except Exception:
        pass  # no logger, silently ignore failure


@api_view(["POST"])
@login_required
def approve_user(request, user_id):
    """Approve a user, update status, and send email asynchronously."""
    # ✅ Get Philippine time
    ph_time = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8)))

    # ✅ Get user role
    user_res = supabase.table("users").select("role").eq("id", str(user_id)).execute()
    if not user_res.data:
        return Response({"error": "User not found"}, status=404)
    role = user_res.data[0]["role"]

    # ✅ Fetch user info
    if role == "Kutsero":
        profile_res = supabase.table("kutsero_profile") \
            .select("kutsero_fname, kutsero_lname, kutsero_email") \
            .eq("kutsero_id", str(user_id)).execute()
        if not profile_res.data:
            return Response({"error": "Kutsero profile not found"}, status=404)
        data = profile_res.data[0]
        user_name = f"{data.get('kutsero_fname','')} {data.get('kutsero_lname','')}".strip()
        user_email = data.get("kutsero_email")
    elif role == "Horse Operator":
        profile_res = supabase.table("horse_op_profile") \
            .select("op_fname, op_lname, op_email") \
            .eq("op_id", str(user_id)).execute()
        if not profile_res.data:
            return Response({"error": "Operator profile not found"}, status=404)
        data = profile_res.data[0]
        user_name = f"{data.get('op_fname','')} {data.get('op_lname','')}".strip()
        user_email = data.get("op_email")
    else:
        return Response({"error": f"Unknown role: {role}"}, status=400)

    # ✅ Update status
    res = supabase.table("users").update({
        "status": "approved",
        "created_at": ph_time.isoformat()
    }).eq("id", user_id).execute()
    if not res.data:
        return Response({"error": "User not found"}, status=404)

    # ✅ Send email asynchronously
    if user_email:
        subject = "Your Account Has Been Approved"
        plain_message = f"Hello {user_name},\n\nYour account has been approved. You can now log in on your mobile app.\n\nBest regards,\nECHOSys Team"
        html_message = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
            <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
              <div style="background-color:#8B4513; padding:20px; text-align:center; color:white;">
                <h1 style="margin:0; font-size:24px;">Account Approved ✅</h1>
              </div>
              <div style="padding:30px; color:#333; font-size:16px; line-height:1.5;">
                <p>Hello {user_name},</p>
                <p>Good news! Your account has been approved by the admin. You can now open your mobile app and log in.</p>
                <div style="text-align:center; margin:30px 0;">
                  <a 
                    href="#" 
                    style="display:inline-block; background-color:#8B4513; color:white; text-decoration:none; padding:12px 25px; border-radius:6px; font-weight:bold; pointer-events:none; opacity:0.8;"
                  >
                    Open your mobile app to login
                  </a>
                </div>
                <p>Best regards,<br>ECHOSys Team</p>
              </div>
            </div>
          </body>
        </html>
        """
        threading.Thread(target=send_email_async, kwargs={
            "subject": subject,
            "plain_message": plain_message,
            "from_email": getattr(settings, "DEFAULT_FROM_EMAIL", None),
            "recipient_list": [user_email],
            "html_message": html_message
        }).start()

    return Response({
        "message": f"{role.capitalize()} approved successfully",
        "user_id": user_id,
        "role": role
    }, status=200)


@api_view(["POST"])
@login_required
def decline_user(request, user_id):
    """Decline a user, update status + reason, and send email asynchronously."""
    decline_reason = request.data.get("declineReason", "No reason provided")

    # ✅ Get user role
    user_res = supabase.table("users").select("role").eq("id", str(user_id)).execute()
    if not user_res.data:
        return Response({"error": "User not found"}, status=404)
    role = user_res.data[0]["role"]

    # ✅ Fetch user info
    if role == "Kutsero":
        profile_res = supabase.table("kutsero_profile") \
            .select("kutsero_fname, kutsero_lname, kutsero_email") \
            .eq("kutsero_id", str(user_id)).execute()
        if not profile_res.data:
            return Response({"error": "Kutsero profile not found"}, status=404)
        data = profile_res.data[0]
        user_name = f"{data.get('kutsero_fname','')} {data.get('kutsero_lname','')}".strip()
        user_email = data.get("kutsero_email")
    elif role == "Horse Operator":
        profile_res = supabase.table("horse_op_profile") \
            .select("op_fname, op_lname, op_email") \
            .eq("op_id", str(user_id)).execute()
        if not profile_res.data:
            return Response({"error": "Operator profile not found"}, status=404)
        data = profile_res.data[0]
        user_name = f"{data.get('op_fname','')} {data.get('op_lname','')}".strip()
        user_email = data.get("op_email")
    else:
        return Response({"error": f"Unknown role: {role}"}, status=400)

    # ✅ Update users table
    res = supabase.table("users").update({
        "status": "declined",
        "decline_reason": decline_reason
    }).eq("id", user_id).execute()
    if not res.data:
        return Response({"error": "User not found"}, status=404)

    # ✅ Send email asynchronously
    if user_email:
        subject = "Your Account Has Been Declined ⚠️"
        plain_message = f"Hello {user_name},\n\nWe’re sorry to inform you that your account has been declined. Reason: {decline_reason}.\n\nBest regards,\nECHOSys Team"
        html_message = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:20px;">
            <div style="max-width:600px; margin:auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
              <div style="background-color:#8B4513; padding:20px; text-align:center; color:white;">
                <h1 style="margin:0; font-size:24px;">Account Declined ⚠️</h1>
              </div>
              <div style="padding:30px; color:#333; font-size:16px; line-height:1.5;">
                <p>Hello {user_name},</p>
                <p>We’re sorry to inform you that your account request has been declined by the admin.</p>
                <p><strong>Reason:</strong> {decline_reason}</p>
                <p>Best regards,<br>ECHOSys Team</p>
              </div>
            </div>
          </body>
        </html>
        """
        threading.Thread(target=send_email_async, kwargs={
            "subject": subject,
            "plain_message": plain_message,
            "from_email": getattr(settings, "DEFAULT_FROM_EMAIL", None),
            "recipient_list": [user_email],
            "html_message": html_message
        }).start()

    return Response({
        "message": f"{role.capitalize()} declined successfully",
        "user_id": user_id,
        "role": role,
        "decline_reason": decline_reason
    }, status=200)

@api_view(["GET"])
@login_required
def get_approved_users(request):
    users = fetch_and_merge_users()
    
    allowed_roles = ["kutsero", "horse operator"]
    filtered_users = [
        u for u in users
        if u.get("role", "").strip().lower() in allowed_roles
        and u.get("status", "").strip().lower() in ["approved", "deactivated"]
    ]

    for u in filtered_users:
        u["approved_date"] = u.pop("created_at", "N/A")
    
    return Response({"users": filtered_users})

# -------------------- NOTIFICATIONS --------------------
@api_view(["GET"])
@login_required
def get_notifications(request):
    """GET pending Kutsero and Horse Operator users and INSERT them into notification table."""
    try:
        print("=== STARTING NOTIFICATION PROCESS ===")
        
        # STEP 1: GET THE FUCKING PENDING USERS
        print("Fetching pending users...")
        users_result = supabase.table("users").select("*").eq("status", "pending").in_("role", ["Kutsero", "Horse Operator"]).execute()
        pending_users = users_result.data if users_result.data else []
        print(f"Found {len(pending_users)} pending users: {[u['id'] for u in pending_users]}")
        
        if not pending_users:
            print("No pending users found, returning empty array")
            return Response([])

        # STEP 2: CHECK EXISTING NOTIFICATIONS
        user_ids = [user["id"] for user in pending_users]
        print(f"Checking existing notifications for user IDs: {user_ids}")
        existing_notifs_result = supabase.table("notification").select("id").in_("id", user_ids).execute()
        existing_user_ids = {notif["id"] for notif in (existing_notifs_result.data or [])}
        print(f"Users with existing notifications: {existing_user_ids}")

        inserted_notifications = []
        
        # STEP 3: INSERT NEW NOTIFICATIONS
        for user in pending_users:
            if user["id"] not in existing_user_ids:
                print(f"Inserting notification for user: {user['id']}")
                
                # Use current time
                current_time = datetime.now()
                
                # INSERT THE NOTIFICATION
                try:
                    insert_data = {
                        "id": user["id"],
                        "notif_message": f"New {user['role']} registered",
                        "notif_date": current_time.date().isoformat(),
                        "notif_time": current_time.time().strftime("%H:%M:%S"),
                        "notif_read": False,
                        "notification_type": "user_registration", 
                        "related_id": user["id"]
                    }
                    
                    print(f"Inserting data: {insert_data}")
                    insert_result = supabase.table("notification").insert(insert_data).execute()
                    
                    if insert_result.data:
                        new_notif = insert_result.data[0]
                        print(f"Successfully inserted notification: {new_notif}")
                        inserted_notifications.append({
                            "notif_id": new_notif["notif_id"],
                            "user_id": new_notif["id"],
                            "message": new_notif["notif_message"],
                            "date": f"{new_notif['notif_date']}T{new_notif['notif_time']}+08:00",
                            "read": new_notif.get("notif_read", False),
                            "role": user["role"]
                        })
                        print(f"SUCCESS: Notification created for user {user['id']}")
                    else:
                        print(f"Insert failed - no data returned for user {user['id']}")
                        
                except Exception as e:
                    print(f"FAILED to insert notification for user {user['id']}: {str(e)}")
                    continue
            else:
                print(f"User {user['id']} already has notification, skipping")

        print(f"Final inserted notifications: {len(inserted_notifications)}")
        return Response(inserted_notifications)

    except Exception as e:
        print(f"ERROR in get_notifications: {str(e)}")
        traceback.print_exc()
        return Response({"error": "Failed to process notifications"}, status=500)
        
# -------------------- MARK NOTIFICATION AS READ --------------------
@api_view(["POST"])
@login_required
def mark_notification_read(request, notif_id):
    """Mark a specific notification as read."""
    try:
        # Check if notification exists
        result = supabase.table("notification").select("*").eq("notif_id", notif_id).execute()
        
        if not result.data:
            return Response({"error": "Notification not found"}, status=404)
        
        # Update the notification to mark as read
        update_result = supabase.table("notification").update({
            "notif_read": True
        }).eq("notif_id", notif_id).execute()
        
        if update_result.data:
            return Response({
                "success": True, 
                "message": "Notification marked as read",
                "notif_id": notif_id
            })
        else:
            return Response({"error": "Failed to update notification"}, status=500)
            
    except Exception as e:
        print(f"Error marking notification as read: {e}")
        return Response({"error": "Internal server error"}, status=500)

# -------------------- MARK ALL NOTIFICATIONS AS READ --------------------
@api_view(["POST"])
@login_required
def mark_all_notifications_read(request):
    """Mark all notifications as read."""
    try:
        # Update all notifications to mark as read
        update_result = supabase.table("notification").update({
            "notif_read": True
        }).eq("notif_read", False).execute()
        
        return Response({
            "success": True, 
            "message": f"All notifications marked as read",
            "updated_count": len(update_result.data) if update_result.data else 0
        })
            
    except Exception as e:
        print(f"Error marking all notifications as read: {e}")
        return Response({"error": "Internal server error"}, status=500)

# ------------------------- ACTIVATE / DEACTIVATE USER ------------------------------------
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

    
# -------------------- MESSAGES --------------------
def safe_execute(query, retries=3, delay=1):
    for attempt in range(retries):
        try:
            return query.execute()
        except Exception as e:
            print(f"⚠️ Supabase query failed (attempt {attempt+1}): {e}")
            if attempt < retries - 1:
                time.sleep(delay)
            else:
                raise

def get_current_president_id(request):
    """Get the current Kutsero President user ID from JWT token"""
    try:
        token = request.COOKIES.get("access_token")
        if not token:
            return None
            
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        
        # Verify this user is actually a Kutsero President
        user_res = supabase.table("users").select("role").eq("id", user_id).execute()
        if user_res.data and user_res.data[0].get("role") == "Kutsero President":
            return user_id
        return None
    except Exception as e:
        print(f"Error getting current president ID: {e}")
        return None

@api_view(["GET"])
@login_required
def get_all_users(request):
    """Fetch all approved users (Kutsero, Horse Operators, DVMF, CTU) except the current president"""
    try:
        president_id = get_current_president_id(request)
        if not president_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # ✅ ALLOWED ROLES: Kutsero, Horse Operator, Dvmf, Dvmf-Admin, Ctu-Vetmed, Ctu-Admin
        allowed_roles = ["Kutsero", "Horse Operator", "Dvmf", "Dvmf-Admin", "Ctu-Vetmed", "Ctu-Admin"]
        
        # ✅ Step 1: Get all approved users from allowed roles except current president
        users_res = safe_execute(
            supabase.table("users")
            .select("id, role, status")
            .eq("status", "approved")
            .neq("id", president_id)
            .in_("role", allowed_roles)
        )

        users = users_res.data or []
        if not users:
            return Response([], status=status.HTTP_200_OK)

        all_users = []
        role_groups = {}

        # ✅ Step 2: Group users by role
        for u in users:
            role_groups.setdefault(u["role"], []).append(u["id"])

        profiles_map = {}

        # 🚫 VETERINARIAN REMOVED - Kutsero President cannot message veterinarians

        # 🐴 Horse Operator
        if "Horse Operator" in role_groups:
            ids = role_groups["Horse Operator"]
            res = safe_execute(
                supabase.table("horse_op_profile")
                .select("op_id, op_fname, op_mname, op_lname, op_image")
                .in_("op_id", ids)
            )
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("op_fname"), p.get("op_mname"), p.get("op_lname")])).strip()
                profiles_map[p["op_id"]] = {
                    "name": f"{full_name} (Horse Operator)",
                    "avatar": p.get("op_image")
                }

        # 🐴 Kutsero (INCLUDED - President can message Kutsero)
        if "Kutsero" in role_groups:
            ids = role_groups["Kutsero"]
            res = safe_execute(
                supabase.table("kutsero_profile")
                .select("kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_image")
                .in_("kutsero_id", ids)
            )
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("kutsero_fname"), p.get("kutsero_mname"), p.get("kutsero_lname")])).strip()
                profiles_map[p["kutsero_id"]] = {
                    "name": f"{full_name} (Kutsero)",
                    "avatar": p.get("kutsero_image")
                }

        # 🧑 DVMF + DVMF-Admin (no image)
        for role_key in ["Dvmf", "Dvmf-Admin"]:
            if role_key in role_groups:
                ids = role_groups[role_key]
                res = safe_execute(
                    supabase.table("dvmf_user_profile")
                    .select("dvmf_id, dvmf_fname, dvmf_lname")
                    .in_("dvmf_id", ids)
                )
                for p in res.data or []:
                    full_name = " ".join(filter(None, [p.get("dvmf_fname"), p.get("dvmf_lname")])).strip()
                    profiles_map[p["dvmf_id"]] = {
                        "name": f"{full_name} ({role_key})",
                        "avatar": None
                    }

        # 🎓 CTU Vetmed + CTU-Admin (no image)
        for role_key in ["Ctu-Vetmed", "Ctu-Admin"]:
            if role_key in role_groups:
                ids = role_groups[role_key]
                res = safe_execute(
                    supabase.table("ctu_vet_profile")
                    .select("ctu_id, ctu_fname, ctu_lname")
                    .in_("ctu_id", ids)
                )
                for p in res.data or []:
                    full_name = " ".join(filter(None, [p.get("ctu_fname"), p.get("ctu_lname")])).strip()
                    profiles_map[p["ctu_id"]] = {
                        "name": f"{full_name} ({role_key})",
                        "avatar": None
                    }

        # ✅ Step 4: Merge user info
        for u in users:
            uid = u["id"]
            info = profiles_map.get(uid, {"name": f"Unknown ({u['role']})", "avatar": None})
            all_users.append({
                "id": uid,
                "name": info["name"],
                "role": u["role"],
                "avatar": info["avatar"]
            })

        return Response(all_users, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error fetching users:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["GET"])
@login_required
def get_conversations(request):
    """
    Get all conversations for the current president (only users who have exchanged messages)
    """
    try:
        president_id = get_current_president_id(request)
        if not president_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # Get unique conversation partners
        conversation_partners = set()
        
        # Get users who sent messages to current president
        received_res = safe_execute(
            supabase.table("message")
            .select("user_id")
            .eq("receiver_id", president_id)
        )
        if received_res.data:
            for msg in received_res.data:
                conversation_partners.add(msg["user_id"])
                
        # Get users who received messages from current president
        sent_res = safe_execute(
            supabase.table("message")
            .select("receiver_id")
            .eq("user_id", president_id)
        )
        if sent_res.data:
            for msg in sent_res.data:
                conversation_partners.add(msg["receiver_id"])

        if not conversation_partners:
            return Response([], status=status.HTTP_200_OK)

        # Get user details - ONLY from allowed roles
        allowed_roles = ["Kutsero", "Horse Operator", "Dvmf", "Dvmf-Admin", "Ctu-Vetmed", "Ctu-Admin"]
        users_res = safe_execute(
            supabase.table("users")
            .select("id, role, status")
            .in_("id", list(conversation_partners))
            .in_("role", allowed_roles)
            .eq("status", "approved")
        )
        users = users_res.data or []
        if not users:
            return Response([], status=status.HTTP_200_OK)

        conversations = []
        
        for user in users:
            user_id = user["id"]
            role = user["role"]
            
            # Get the latest message
            messages_res = safe_execute(
                supabase.table("message")
                .select("*")
                .or_(f"and(user_id.eq.{president_id},receiver_id.eq.{user_id}),and(user_id.eq.{user_id},receiver_id.eq.{president_id})")
                .order("mes_date", desc=True)
                .limit(1)
            )
            
            latest_message = messages_res.data[0] if messages_res.data else None
            
            # Count unread messages
            unread_res = safe_execute(
                supabase.table("message")
                .select("mes_id")
                .eq("user_id", user_id)
                .eq("receiver_id", president_id)
                .eq("is_read", False)
            )
            unread_count = len(unread_res.data) if unread_res.data else 0
            
            # Get user profile info
            profile_info = get_user_profile_info(user_id, role)
            
            # Format timestamp
            timestamp = ""
            if latest_message and latest_message.get("mes_date"):
                try:
                    msg_time = datetime.fromisoformat(str(latest_message["mes_date"]))
                    local_time = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")
                    timestamp = local_time
                except Exception:
                    timestamp = str(latest_message["mes_date"])

            # ✅ CRITICAL FIX: Handle last message content with "You:" prefix
            last_message_content = ""
            last_message_is_own = False
            
            if latest_message:
                last_message_is_own = latest_message["user_id"] == president_id
                if last_message_is_own:
                    last_message_content = f"You: {latest_message['mes_content']}"
                else:
                    last_message_content = latest_message['mes_content']
            else:
                last_message_content = "No messages yet"

            conversations.append({
                'id': user_id,
                'name': profile_info["name"],
                'role': role,
                'avatar': profile_info["avatar"],
                'online': False,
                'lastMessage': last_message_content,
                'lastMessageSender': latest_message["user_id"] if latest_message else None,
                'lastMessageIsOwn': last_message_is_own,
                'timestamp': timestamp,
                'unread': unread_count,
                'has_conversation': True
            })

        # Sort by latest message timestamp
        conversations.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

        return Response(conversations, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error fetching conversations:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
def get_user_profile_info(user_id, role):
    """Helper function to get user profile info based on role"""
    try:
        # 🐴 Horse Operator
        if role == "Horse Operator":
            res = safe_execute(
                supabase.table("horse_op_profile")
                .select("op_fname, op_mname, op_lname, op_image")
                .eq("op_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("op_fname"), p.get("op_mname"), p.get("op_lname")])).strip()
                return {"name": f"{full_name} (Horse Operator)", "avatar": p.get("op_image")}

        # 🐴 Kutsero (INCLUDED)
        elif role == "Kutsero":
            res = safe_execute(
                supabase.table("kutsero_profile")
                .select("kutsero_fname, kutsero_mname, kutsero_lname, kutsero_image")
                .eq("kutsero_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("kutsero_fname"), p.get("kutsero_mname"), p.get("kutsero_lname")])).strip()
                return {"name": f"{full_name} (Kutsero)", "avatar": p.get("kutsero_image")}

        # 🧑 DVMF
        elif role == "Dvmf":
            res = safe_execute(
                supabase.table("dvmf_user_profile")
                .select("dvmf_fname, dvmf_lname")
                .eq("dvmf_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("dvmf_fname"), p.get("dvmf_lname")])).strip()
                return {"name": f"{full_name} (DVMF)", "avatar": None}

        # 🧑 DVMF Admin
        elif role == "Dvmf-Admin":
            res = safe_execute(
                supabase.table("dvmf_user_profile")
                .select("dvmf_fname, dvmf_lname")
                .eq("dvmf_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("dvmf_fname"), p.get("dvmf_lname")])).strip()
                return {"name": f"{full_name} (DVMF Admin)", "avatar": None}

        # 🎓 CTU Vetmed
        elif role == "Ctu-Vetmed":
            res = safe_execute(
                supabase.table("ctu_vet_profile")
                .select("ctu_fname, ctu_lname")
                .eq("ctu_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("ctu_fname"), p.get("ctu_lname")])).strip()
                return {"name": f"{full_name} (CTU Vetmed)", "avatar": None}

        # 🎓 CTU Admin
        elif role == "Ctu-Admin":
            res = safe_execute(
                supabase.table("ctu_vet_profile")
                .select("ctu_fname, ctu_lname")
                .eq("ctu_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("ctu_fname"), p.get("ctu_lname")])).strip()
                return {"name": f"{full_name} (CTU Admin)", "avatar": None}

    except Exception as e:
        print(f"Error getting profile info for {user_id} ({role}): {e}")

    # Fallback
    return {"name": f"User ({role})", "avatar": None}

LOCAL_OFFSET_HOURS = 8  # Manila is UTC+8

@api_view(["POST"])
@login_required
def send_message(request):
    """Send a message from the current president to another user"""
    try:
        president_id = get_current_president_id(request)
        if not president_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        receiver_id = data.get("receiver_id")
        message_content = data.get("message")

        if not receiver_id or not message_content:
            return Response({"error": "Missing receiver_id or message"}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Validate that receiver is from allowed roles
        allowed_roles = ["Kutsero", "Horse Operator", "Dvmf", "Dvmf-Admin", "Ctu-Vetmed", "Ctu-Admin"]
        receiver_res = supabase.table("users").select("role").eq("id", receiver_id).in_("role", allowed_roles).execute()
        if not receiver_res.data:
            return Response({"error": "Cannot message this user"}, status=status.HTTP_400_BAD_REQUEST)

        # Use UTC timestamp; Postgres timestamptz will store correctly
        payload = {
            "mes_content": message_content,
            "is_read": False,
            "user_id": president_id,
            "receiver_id": receiver_id
        }

        res = supabase.table("message").insert(payload).execute()

        if not res.data:
            return Response({"error": "Failed to send message"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Format the timestamp for frontend
        msg = res.data[0]
        msg_time = datetime.fromisoformat(msg["mes_date"])
        msg["mes_date"] = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")

        return Response({"message": "Message sent successfully", "data": msg}, status=status.HTTP_201_CREATED)

    except Exception as e:
        print("❌ Error sending message:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["GET"])
@login_required
def get_conversation(request, conversation_id):
    """Fetch all messages between the current president and a specific user safely, showing only local time (AM/PM)"""
    try:
        president_id = get_current_president_id(request)
        if not president_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        receiver_id = conversation_id

        # Fetch messages both ways
        data1 = (supabase.table("message")
                 .select("*")
                 .eq("user_id", president_id)
                 .eq("receiver_id", receiver_id)
                 .execute()).data or []

        data2 = (supabase.table("message")
                 .select("*")
                 .eq("user_id", receiver_id)
                 .eq("receiver_id", president_id)
                 .execute()).data or []

        all_messages = sorted(data1 + data2, key=lambda m: m["mes_date"])

        formatted_messages = []
        for msg in all_messages:
            msg_time = datetime.fromisoformat(msg["mes_date"])
            local_time = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")
            formatted_messages.append({
                "id": msg["mes_id"],
                "content": msg["mes_content"],
                "timestamp": local_time,
                "isOwn": msg["user_id"] == president_id,
                "is_read": msg["is_read"],
                "originalTimestamp": msg["mes_date"],
            })

        return Response(formatted_messages, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error fetching conversation:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)    

@api_view(["PUT"])
@login_required
def mark_messages_as_read(request, conversation_id):
    """Mark messages as read for a conversation"""
    try:
        president_id = get_current_president_id(request)
        if not president_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        print(f"🔔 Marking messages as read - president_id: {president_id}, conversation_id: {conversation_id}")

        res = (
            supabase.table("message")
            .update({"is_read": True})
            .eq("receiver_id", president_id)
            .eq("user_id", conversation_id)
            .eq("is_read", False)
            .execute()
        )

        print(f"✅ Marked {len(res.data) if res.data else 0} messages as read")

        return Response({
            "message": "Messages marked as read",
            "updated_count": len(res.data) if res.data else 0
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error marking messages as read:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -------------------- KUTSERO PROFILE ENDPOINTS --------------------
@api_view(["GET"])
@login_required
def kutsero_profile_by_id(request, user_id):
    """Get Kutsero profile by user ID"""
    try:
        res = supabase.table("kutsero_profile").select("*").eq("kutsero_id", user_id).execute()
        if res.data:
            return Response(res.data[0])
        else:
            return Response({"error": "Kutsero profile not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@login_required
def horse_operator_profile(request, user_id):
    """Get Horse Operator profile by user ID"""
    try:
        res = supabase.table("horse_op_profile").select("*").eq("op_id", user_id).execute()
        if res.data:
            return Response(res.data[0])
        else:
            return Response({"error": "Horse Operator profile not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)