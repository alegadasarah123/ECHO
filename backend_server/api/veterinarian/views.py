from rest_framework.decorators import api_view
from rest_framework.response import Response
from supabase import create_client, Client
from django.conf import settings
from datetime import datetime, date, time
from datetime import datetime, timedelta
from functools import wraps
from rest_framework import status
import jwt 
import uuid
import requests
import traceback
import json
import random

# -------------------- SUPABASE CLIENT --------------------
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
SUPABASE_URL = settings.SUPABASE_URL
SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
sr_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

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
        return func(request, *args, **kwargs)
    return wrapper

# -------------------- GET NOTIFICATIONS --------------------
@api_view(["GET"])
@login_required
def get_notifications(request):
    """
    Get all notifications for the current vet including:
    - Today's approved appointments
    - Medical access approvals/declines (note only for declined)
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        all_notifications = []

        # Get current time in Philippine time
        current_time = datetime.now()
        ph_time = current_time

        # First, get existing notifications from notification table to check read status
        existing_notifs_res = supabase.table("notification").select("*").eq("id", vet_id).execute()
        existing_notifs = {notif['related_id']: {'notif_read': notif['notif_read'], 'notif_id': notif['notif_id']} for notif in existing_notifs_res.data or []}

        # 1. Get today's approved appointments
        today = datetime.now().date()
        today_str = today.strftime("%Y-%m-%d")
        
        today_res = supabase.table("appointment").select(
            """
            *,
            horse_profile:horse_id(
                horse_name,
                horse_op_profile:op_id(
                    op_fname,
                    op_mname,
                    op_lname
                )
            )
            """
        ).eq("vet_id", vet_id).eq("app_status", "approved").eq("app_date", today_str).execute()

        for app in today_res.data or []:
            horse = app.get("horse_profile", {})
            operator = horse.get("horse_op_profile", {})
            operator_name = " ".join(filter(None, [
                operator.get("op_fname"),
                operator.get("op_mname"),
                operator.get("op_lname"),
            ])).strip()

            notif_related_id = f"today-{app['app_id']}"
            
            # Check if notification exists and get its read status and actual notif_id
            existing_notif = existing_notifs.get(notif_related_id)
            is_read = existing_notif['notif_read'] if existing_notif else False
            actual_notif_id = existing_notif['notif_id'] if existing_notif else None

            # Insert into notification table if not exists
            if not existing_notif:
                notification_data = {
                    "id": vet_id,
                    "notif_message": f"TODAY: Appointment with {horse.get('horse_name', '')} at {app.get('app_time', '')}",
                    "notification_type": "today_appointment",
                    "related_id": notif_related_id,
                    "notif_date": ph_time.date().isoformat(),
                    "notif_time": ph_time.time().strftime("%H:%M:%S")
                }
                insert_result = supabase.table("notification").insert(notification_data).execute()
                if insert_result.data:
                    actual_notif_id = insert_result.data[0]['notif_id']

            all_notifications.append({
                "notif_id": actual_notif_id or notif_related_id,  # Use actual notif_id if available
                "related_id": notif_related_id,
                "type": "today_appointment",
                "message": f"TODAY: Appointment with {horse.get('horse_name', '')}",
                "description": f"Owner: {operator_name} | Time: {app.get('app_time', '')}",
                "date": f"{ph_time.date().isoformat()}T{ph_time.time().strftime('%H:%M:%S')}+08:00",
                "read": is_read,
                "link": "/VetAppointments",
                "data": app
            })

        # 2. Get medical access notifications (approved/declined by DVMF/CTU)
        medical_res = supabase.table("medrec_access_request").select(
            """
            *,
            horse_profile:horse_id(
                horse_name
            )
            """
        ).eq("vet_id", vet_id).in_("request_status", ["approved", "declined"]).order("approved_at", desc=True).execute()

        for req in medical_res.data or []:
            horse = req.get("horse_profile", {})
            status = req.get("request_status")
            approved_by_id = req.get("approved_by")
            
            # Since approved_by is text, we need to manually look up the user info
            approved_by_name = "System"
            
            if approved_by_id:
                # Try to find the user in different profile tables
                try:
                    # Check if it's a DVMF user
                    dvmf_res = supabase.table("dvmf_user_profile").select("*").eq("dvmf_id", approved_by_id).execute()
                    if dvmf_res.data:
                        dvmf_profile = dvmf_res.data[0]
                        approved_by_name = " ".join(filter(None, [
                            dvmf_profile.get("dvmf_fname"),
                            dvmf_profile.get("dvmf_lname")
                        ])).strip()
                    else:
                        # Check if it's a CTU user
                        ctu_res = supabase.table("ctu_vet_profile").select("*").eq("ctu_id", approved_by_id).execute()
                        if ctu_res.data:
                            ctu_profile = ctu_res.data[0]
                            approved_by_name = " ".join(filter(None, [
                                ctu_profile.get("ctu_fname"),
                                ctu_profile.get("ctu_lname")
                            ])).strip()
                        else:
                            # Check if it's a veterinarian
                            vet_res = supabase.table("vet_profile").select("*").eq("vet_id", approved_by_id).execute()
                            if vet_res.data:
                                vet_profile = vet_res.data[0]
                                approved_by_name = " ".join(filter(None, [
                                    vet_profile.get("vet_fname"),
                                    vet_profile.get("vet_mname"),
                                    vet_profile.get("vet_lname")
                                ])).strip()
                except Exception as e:
                    print(f"Error looking up approver info: {e}")
                    # If we can't find the user, use the ID as fallback
                    approved_by_name = f"{approved_by_id}"

            if status == "approved":
                message = f"Medical access APPROVED for {horse.get('horse_name', 'Unknown Horse')}"
                notif_type = "medical_access_approved"
                description = f"By: {approved_by_name}"
            else:
                message = f"Medical access DECLINED for {horse.get('horse_name', 'Unknown Horse')}"
                notif_type = "medical_access_declined"
                # Only show note for declined status
                note = req.get('note', 'No reason provided')
                description = f"By: {approved_by_name} | Note: {note}"

            notif_related_id = f"medical-{req['request_id']}"
            
            # Check if notification exists and get its read status and actual notif_id
            existing_notif = existing_notifs.get(notif_related_id)
            is_read = existing_notif['notif_read'] if existing_notif else False
            actual_notif_id = existing_notif['notif_id'] if existing_notif else None

            # Use approved_at time if available, otherwise use current Philippine time
            if req.get("approved_at"):
                approved_time = datetime.fromisoformat(req["approved_at"].replace('Z', '+00:00'))
                # Convert to Philippine time (UTC+8)
                ph_time_notif = approved_time + timedelta(hours=8)
                date_str = f"{ph_time_notif.date().isoformat()}T{ph_time_notif.time().strftime('%H:%M:%S')}+08:00"
            else:
                date_str = f"{ph_time.date().isoformat()}T{ph_time.time().strftime('%H:%M:%S')}+08:00"

            # Insert into notification table if not exists
            if not existing_notif:
                notification_data = {
                    "id": vet_id,
                    "notif_message": message,
                    "notification_type": notif_type,
                    "related_id": notif_related_id,
                    "notif_date": ph_time.date().isoformat(),
                    "notif_time": ph_time.time().strftime("%H:%M:%S")
                }
                insert_result = supabase.table("notification").insert(notification_data).execute()
                if insert_result.data:
                    actual_notif_id = insert_result.data[0]['notif_id']

            all_notifications.append({
                "notif_id": actual_notif_id or notif_related_id,  # Use actual notif_id if available
                "related_id": notif_related_id,
                "type": notif_type,
                "message": message,
                "description": description,
                "date": date_str,
                "read": is_read,
                "link": "/VetMedRecord",
                "data": req
            })

        # Sort by date (newest first)
        sorted_notifications = sorted(
            all_notifications,
            key=lambda x: x["date"],
            reverse=True
        )

        return Response({"notifications": sorted_notifications}, status=200)

    except Exception as e:
        print(f"Error fetching notifications: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

# -------------------- MARK NOTIFICATION AS READ --------------------
@api_view(["POST"])
@login_required
def mark_notification_read(request, notif_id):
    """
    Mark a specific notification as read in the database
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        print(f"🔔 Marking notification as read - vet_id: {vet_id}, notif_id: {notif_id}")
        
        # Check if it's a related_id (starts with today- or medical-) or actual notif_id (number)
        if notif_id.startswith(('today-', 'medical-')):
            # It's a related_id, find the actual notification
            check_res = supabase.table("notification").select("*").eq("related_id", notif_id).eq("id", vet_id).execute()
        else:
            # It's an actual notif_id
            check_res = supabase.table("notification").select("*").eq("notif_id", notif_id).eq("id", vet_id).execute()
        
        if not check_res.data:
            print(f"❌ Notification not found: {notif_id} for vet: {vet_id}")
            return Response({"error": "Notification not found"}, status=404)
        
        actual_notif_id = check_res.data[0]["notif_id"]
        print(f"✅ Found notification: {actual_notif_id}")
        
        # Update the notification table using the actual notif_id
        update_res = supabase.table("notification").update({"notif_read": True}).eq("notif_id", actual_notif_id).execute()
        
        if update_res.data:
            print(f"✅ Successfully marked notification as read: {actual_notif_id}")
            return Response({"message": "Notification marked as read"}, status=200)
        else:
            print(f"❌ Failed to update notification: {actual_notif_id}")
            return Response({"error": "Failed to update notification"}, status=500)

    except Exception as e:
        print(f"❌ Error marking notification as read: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

# -------------------- MARK ALL NOTIFICATIONS AS READ --------------------
@api_view(["POST"])
@login_required
def mark_all_notifications_read(request):
    """
    Mark all notifications as read for the current vet
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        print(f"🔔 Marking all notifications as read for vet: {vet_id}")
        
        # Mark all notifications as read
        res = supabase.table("notification").update({"notif_read": True}).eq("id", vet_id).eq("notif_read", False).execute()
        
        print(f"✅ Marked {len(res.data) if res.data else 0} notifications as read")
        
        return Response({
            "message": "All notifications marked as read",
            "updated_count": len(res.data) if res.data else 0
        }, status=200)

    except Exception as e:
        print(f"❌ Error marking all notifications as read: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)
    
# --------------- MESSAGES -------------------------
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

@api_view(["GET"])
@login_required
def get_all_users(request):
    """Fetch all approved users (from all profile tables) except the current vet, Kutsero, and Kutsero President"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # ✅ Step 1: Get all approved users except current vet, Kutsero, and Kutsero President
        users_res = safe_execute(
            supabase.table("users")
            .select("id, role, status")
            .eq("status", "approved")
            .neq("id", vet_id)
            .neq("role", "Kutsero")  # 🚫 Exclude Kutsero
            .neq("role", "Kutsero President")  # 🚫 ADD THIS LINE: Exclude Kutsero President
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

        # 🩺 Veterinarian
        if "Veterinarian" in role_groups:
            ids = role_groups["Veterinarian"]
            res = safe_execute(
                supabase.table("vet_profile")
                .select("vet_id, vet_fname, vet_mname, vet_lname, vet_profile_photo")
                .in_("vet_id", ids)
            )
            for p in res.data or []:
                full_name = " ".join(filter(None, [p.get("vet_fname"), p.get("vet_mname"), p.get("vet_lname")])).strip()
                profiles_map[p["vet_id"]] = {
                    "name": f"{full_name} (Veterinarian)",
                    "avatar": p.get("vet_profile_photo")
                }

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
    Get all conversations for the current vet (only users who have exchanged messages)
    Excludes Kutsero and Kutsero President users
    """
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        conversation_partners = set()

        # Fetch users who sent messages to this vet
        received_res = safe_execute(
            supabase.table("message")
            .select("user_id")
            .eq("receiver_id", vet_id)
        )
        if received_res.data:
            for msg in received_res.data:
                conversation_partners.add(msg["user_id"])

        # Fetch users who received messages from this vet
        sent_res = safe_execute(
            supabase.table("message")
            .select("receiver_id")
            .eq("user_id", vet_id)
        )
        if sent_res.data:
            for msg in sent_res.data:
                conversation_partners.add(msg["receiver_id"])

        if not conversation_partners:
            return Response([], status=status.HTTP_200_OK)

        # Allowed roles (excluding Kutsero & Kutsero President)
        allowed_roles = ["Horse Operator", "Dvmf", "Dvmf-Admin", "Ctu-Vetmed", "Ctu-Admin"]

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

            # Get latest message between vet and user
            messages_res = safe_execute(
                supabase.table("message")
                .select("*")
                .or_(
                    f"and(user_id.eq.{vet_id},receiver_id.eq.{user_id}),"
                    f"and(user_id.eq.{user_id},receiver_id.eq.{vet_id})"
                )
                .order("mes_date", desc=True)
                .limit(1)
            )
            latest_message = messages_res.data[0] if messages_res.data else None

            # Count unread messages
            unread_res = safe_execute(
                supabase.table("message")
                .select("mes_id")
                .eq("user_id", user_id)
                .eq("receiver_id", vet_id)
                .eq("is_read", False)
            )
            unread_count = len(unread_res.data) if unread_res.data else 0

            # Get profile info
            profile_info = get_user_profile_info(user_id, role)

            # Handle timestamp
            timestamp = ""
            latest_message_datetime = None
            if latest_message and latest_message.get("mes_date"):
                try:
                    msg_time = datetime.fromisoformat(str(latest_message["mes_date"]))
                    local_time = (msg_time + timedelta(hours=LOCAL_OFFSET_HOURS)).strftime("%I:%M %p")
                    timestamp = local_time
                    latest_message_datetime = msg_time
                except Exception:
                    timestamp = str(latest_message["mes_date"])
                    latest_message_datetime = datetime.now()

            # Handle message content
            last_message_content = ""
            last_message_is_own = False
            if latest_message:
                last_message_is_own = latest_message["user_id"] == vet_id
                if last_message_is_own:
                    last_message_content = f"You: {latest_message['mes_content']}"
                else:
                    last_message_content = latest_message['mes_content']
            else:
                last_message_content = "No messages yet"
                latest_message_datetime = datetime.min

            conversations.append({
                "id": user_id,
                "name": profile_info["name"],
                "role": role,
                "avatar": profile_info["avatar"],
                "online": False,
                "lastMessage": last_message_content,
                "lastMessageSender": latest_message["user_id"] if latest_message else None,
                "lastMessageIsOwn": last_message_is_own,
                "timestamp": timestamp,
                "displayTimestamp": timestamp,
                "sortTimestamp": latest_message_datetime if latest_message_datetime else datetime.min,
                "unread": unread_count,
                "has_conversation": True,
            })

        # Sort by last message time (latest first)
        conversations.sort(key=lambda x: x.get("sortTimestamp", datetime.min), reverse=True)

        return Response(conversations, status=status.HTTP_200_OK)

    except Exception as e:
        print("❌ Error fetching conversations:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        
def get_user_profile_info(user_id, role):
    """Helper function to get user profile info based on role (Kutsero excluded)"""
    try:
        # 🩺 Veterinarian
        if role == "Veterinarian":
            res = safe_execute(
                supabase.table("vet_profile")
                .select("vet_fname, vet_mname, vet_lname, vet_profile_photo")
                .eq("vet_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("vet_fname"), p.get("vet_mname"), p.get("vet_lname")])).strip()
                return {"name": f"{full_name} (Veterinarian)", "avatar": p.get("vet_profile_photo")}

        # 🐴 Horse Operator
        elif role == "Horse Operator":
            res = safe_execute(
                supabase.table("horse_op_profile")
                .select("op_fname, op_mname, op_lname, op_image")
                .eq("op_id", user_id)
            )
            if res.data:
                p = res.data[0]
                full_name = " ".join(filter(None, [p.get("op_fname"), p.get("op_mname"), p.get("op_lname")])).strip()
                return {"name": f"{full_name} (Horse Operator)", "avatar": p.get("op_image")}

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
    """Send a message from the current vet to another user"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        data = request.data
        receiver_id = data.get("receiver_id")
        message_content = data.get("message")

        if not receiver_id or not message_content:
            return Response({"error": "Missing receiver_id or message"}, status=status.HTTP_400_BAD_REQUEST)

        # Use UTC timestamp; Postgres timestamptz will store correctly
        payload = {
            "mes_content": message_content,
            "is_read": False,
            "user_id": vet_id,
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
    """Fetch all messages between the current vet and a specific user safely, showing only local time (AM/PM)"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        receiver_id = conversation_id

        # Fetch messages both ways
        data1 = (supabase.table("message")
                 .select("*")
                 .eq("user_id", vet_id)
                 .eq("receiver_id", receiver_id)
                 .execute()).data or []

        data2 = (supabase.table("message")
                 .select("*")
                 .eq("user_id", receiver_id)
                 .eq("receiver_id", vet_id)
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
                "isOwn": msg["user_id"] == vet_id,
                "is_read": msg["is_read"],  # ✅ ADD THIS LINE - Include read status
                "originalTimestamp": msg["mes_date"],  # ✅ ADD THIS LINE - Include original timestamp
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
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        print(f"🔔 Marking messages as read - vet_id: {vet_id}, conversation_id: {conversation_id}")

    
        res = (
            supabase.table("message")
            .update({"is_read": True})
            .eq("receiver_id", vet_id)
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

# -------------------- GET VETERINARIAN PROFILE BY ID --------------------
@api_view(["GET"])
@login_required
def vet_profile_by_id(request, user_id):
    """Fetch veterinarian profile by user ID for profile modal"""
    try:
        current_vet_id = get_current_vet_id(request)
        if not current_vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # Fetch veterinarian profile data
        res = supabase.table("vet_profile").select("*").eq("vet_id", user_id).execute()
        
        if not res.data:
            return Response({"error": "Veterinarian profile not found"}, status=status.HTTP_404_NOT_FOUND)

        profile = res.data[0]
        
        # Format the response with all necessary fields
        formatted_profile = {
            "vet_id": profile.get("vet_id"),
            "vet_fname": profile.get("vet_fname"),
            "vet_mname": profile.get("vet_mname"),
            "vet_lname": profile.get("vet_lname"),
            "vet_dob": profile.get("vet_dob"),
            "vet_sex": profile.get("vet_sex"),
            "vet_phone_num": profile.get("vet_phone_num"),
            "vet_street": profile.get("vet_street"),
            "vet_brgy": profile.get("vet_brgy"),
            "vet_city": profile.get("vet_city"),
            "vet_province": profile.get("vet_province"),
            "vet_zipcode": profile.get("vet_zipcode"),
            "vet_address_is_clinic": profile.get("vet_address_is_clinic"),
            "vet_clinic_street": profile.get("vet_clinic_street"),
            "vet_clinic_brgy": profile.get("vet_clinic_brgy"),
            "vet_clinic_city": profile.get("vet_clinic_city"),
            "vet_clinic_province": profile.get("vet_clinic_province"),
            "vet_clinic_zipcode": profile.get("vet_clinic_zipcode"),
            "vet_email": profile.get("vet_email"),
            "vet_exp_yr": profile.get("vet_exp_yr"),
            "vet_specialization": profile.get("vet_specialization"),
            "vet_org": profile.get("vet_org"),
            "vet_profile_photo": profile.get("vet_profile_photo"),
            "created_at": profile.get("created_at"),
        }

        return Response(formatted_profile, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"❌ Error fetching veterinarian profile: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- GET HORSE OPERATOR PROFILE BY ID --------------------
@api_view(["GET"])
@login_required
def horse_operator_profile(request, user_id):
    """Fetch horse operator profile by user ID for profile modal"""
    try:
        current_vet_id = get_current_vet_id(request)
        if not current_vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # Fetch horse operator profile data
        res = supabase.table("horse_op_profile").select("*").eq("op_id", user_id).execute()
        
        if not res.data:
            return Response({"error": "Horse operator profile not found"}, status=status.HTTP_404_NOT_FOUND)

        profile = res.data[0]
        
        # Format the response with all necessary fields
        formatted_profile = {
            "op_id": profile.get("op_id"),
            "op_fname": profile.get("op_fname"),
            "op_mname": profile.get("op_mname"),
            "op_lname": profile.get("op_lname"),
            "op_dob": profile.get("op_dob"),
            "op_sex": profile.get("op_sex"),
            "op_phone_num": profile.get("op_phone_num"),
            "op_province": profile.get("op_province"),
            "op_city": profile.get("op_city"),
            "op_municipality": profile.get("op_municipality"),
            "op_brgy": profile.get("op_brgy"),
            "op_zipcode": profile.get("op_zipcode"),
            "op_house_add": profile.get("op_house_add"),
            "op_email": profile.get("op_email"),
            "op_image": profile.get("op_image"),
            "created_at": profile.get("created_at"),
        }

        return Response(formatted_profile, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"❌ Error fetching horse operator profile: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -------------------- GET DVMF PROFILE BY ID --------------------
@api_view(["GET"])
@login_required
def dvmf_profile_by_id(request, user_id):
    """Fetch DVMF admin profile by user ID for profile modal"""
    try:
        current_vet_id = get_current_vet_id(request)
        if not current_vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # Fetch DVMF profile data
        res = supabase.table("dvmf_user_profile").select("*").eq("dvmf_id", user_id).execute()
        
        if not res.data:
            return Response({"error": "DVMF profile not found"}, status=status.HTTP_404_NOT_FOUND)

        profile = res.data[0]
        
        # Format the response with all necessary fields
        formatted_profile = {
            "dvmf_id": profile.get("dvmf_id"),
            "dvmf_fname": profile.get("dvmf_fname"),
            "dvmf_lname": profile.get("dvmf_lname"),
            "dvmf_email": profile.get("dvmf_email"),
            "dvmf_phonenum": profile.get("dvmf_phonenum"),
            "dvmf_role": profile.get("dvmf_role"),
        }

        return Response(formatted_profile, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"❌ Error fetching DVMF profile: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- GET CTU VETMED PROFILE BY ID --------------------
@api_view(["GET"])
@login_required
def ctu_profile_by_id(request, user_id):
    """Fetch CTU VetMed profile by user ID for profile modal"""
    try:
        current_vet_id = get_current_vet_id(request)
        if not current_vet_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

        # Fetch CTU VetMed profile data
        res = supabase.table("ctu_vet_profile").select("*").eq("ctu_id", user_id).execute()
        
        if not res.data:
            return Response({"error": "CTU VetMed profile not found"}, status=status.HTTP_404_NOT_FOUND)

        profile = res.data[0]
        
        # Format the response with all necessary fields
        formatted_profile = {
            "ctu_id": profile.get("ctu_id"),
            "ctu_fname": profile.get("ctu_fname"),
            "ctu_lname": profile.get("ctu_lname"),
            "ctu_email": profile.get("ctu_email"),
            "ctu_phonenum": profile.get("ctu_phonenum"),
            "ctu_role": profile.get("ctu_role"),
            "created_at": profile.get("created_at"),
        }

        return Response(formatted_profile, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"❌ Error fetching CTU VetMed profile: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# --------------- PROFILE -------------------------
def get_current_vet_id(request):
    """Extract current vet_id from access_token cookie"""
    access_token = request.COOKIES.get("access_token")
    if not access_token:
        return None
    try:
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        return decoded.get("sub")
    except Exception:
        return None


@api_view(["GET"])
@login_required
def vet_profile(request):
    """Fetch the profile of the currently logged-in veterinarian"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        res = supabase.table("vet_profile").select("*").eq("vet_id", vet_id).execute()
        data = res.data or []

        if len(data) == 0:
            return Response({"error": "Profile not found"}, status=404)

        profile = data[0]

        # ✅ Safe full name
        full_name = " ".join(filter(None, [
            profile.get("vet_fname"),
            profile.get("vet_mname"),
            profile.get("vet_lname"),
        ])).strip()

        profile["full_name"] = full_name

        return Response({"profile": profile}, status=200)

    except Exception:
        # 🚫 No console print
        # ✅ Clean and safe response
        return Response({"error": "Internal server error"}, status=500)


@api_view(["PUT"])
@login_required
def update_vet_profile(request):
    """Update the profile data for the logged-in vet"""
    current_vet_id = get_current_vet_id(request)
    if not current_vet_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    update_data = request.data

    # Only allow updating certain fields
    allowed_fields = [
        "vet_fname", "vet_mname", "vet_lname", "vet_dob", "vet_sex",
        "vet_phone_num", "vet_email", "vet_province", "vet_city", 
        "vet_brgy", "vet_zipcode", "vet_specialization", "vet_org", 
        "vet_license_num", "vet_exp_yr"
    ]
    data_to_update = {k: v for k, v in update_data.items() if k in allowed_fields}

    if not data_to_update:
        return Response({"error": "No valid fields to update"}, status=status.HTTP_400_BAD_REQUEST)

    result = supabase.table("vet_profile").update(data_to_update).eq("vet_id", current_vet_id).execute()

    if not result.data:
        return Response({"error": "Failed to update profile"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"message": "Profile updated successfully", "profile": result.data[0]}, status=status.HTTP_200_OK)
    

# ---------------- UPDATE PROFILE PHOTO ----------------
@api_view(["PUT"])
@login_required
def update_profile_photo(request):
    """
    Update veterinarian profile photo:
    ✅ Validates file type & size
    ✅ Deletes old photo from Supabase storage ONLY if new image is provided
    ✅ Uploads new photo to 'vet_profile' bucket
    ✅ Updates database with new URL
    """
    current_vet_id = get_current_vet_id(request)
    if not current_vet_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # ---------------- Step 1: Validate incoming file ----------------
        profile_photo_file = request.FILES.get('profile_photo')
        if not profile_photo_file:
            return Response({"error": "No profile photo provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type
        if not profile_photo_file.content_type.startswith('image/'):
            return Response({"error": "File must be an image"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file size (max 5MB)
        if profile_photo_file.size > 5 * 1024 * 1024:
            return Response({"error": "File size must be less than 5MB"}, status=status.HTTP_400_BAD_REQUEST)

        # ---------------- Step 2: Fetch old profile photo ----------------
        current_profile = supabase.table("vet_profile").select("vet_profile_photo").eq("vet_id", current_vet_id).execute()
        
        old_photo_url = None
        if current_profile.data and len(current_profile.data) > 0:
            old_photo_url = current_profile.data[0].get('vet_profile_photo')

        # ---------------- Step 3: Delete old photo ONLY if new image is provided ----------------
        if old_photo_url and profile_photo_file:  # Only delete if we have a new file
            try:
                old_filename = old_photo_url.split('/')[-1].split('?')[0]
                if old_filename and current_vet_id in old_filename:
                    sr_client.storage.from_("vet_profile").remove([old_filename])
                    print(f"[DEBUG] Deleted old profile photo: {old_filename}")
                else:
                    print(f"[DEBUG] Skipping deletion of default/placeholder image: {old_filename}")
            except Exception as e:
                print(f"[WARNING] Failed to delete old profile photo: {e}")

        # ---------------- Step 4: Upload new photo ----------------
        timestamp = int(datetime.now().timestamp())
        file_extension = profile_photo_file.name.split('.')[-1] if '.' in profile_photo_file.name else 'jpg'
        file_name = f"{current_vet_id}_profile_{timestamp}_{random.randint(1000,9999)}.{file_extension}"

        file_content = profile_photo_file.read()

        upload_res = sr_client.storage.from_("vet_profile").upload(
            file_name,
            file_content,
            {"content-type": profile_photo_file.content_type}
        )

        # ---------------- Step 5: Get public URL ----------------
        public_url = sr_client.storage.from_("vet_profile").get_public_url(file_name)

        # ---------------- Step 6: Update DB record ----------------
        update_data = {"vet_profile_photo": public_url}
        result = supabase.table("vet_profile").update(update_data).eq("vet_id", current_vet_id).execute()

        if not result.data:
            return Response({"error": "Failed to update profile in database"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # ---------------- Step 7: Success response ----------------
        return Response({
            "message": "Profile photo updated successfully",
            "profile_picture_url": public_url,
            "profile": result.data[0]
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[ERROR] Profile photo update failed: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ---------------- DELETE PROFILE PHOTO ----------------
@api_view(["DELETE"])
@login_required
def delete_profile_photo(request):
    """
    Delete veterinarian profile photo:
    ✅ Checks if user has a profile photo
    ✅ Deletes photo from Supabase storage
    ✅ Updates database to remove photo URL
    ✅ Returns success message
    """
    current_vet_id = get_current_vet_id(request)
    if not current_vet_id:
        return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # ---------------- Step 1: Fetch current profile photo ----------------
        current_profile = supabase.table("vet_profile").select("vet_profile_photo").eq("vet_id", current_vet_id).execute()
        
        if not current_profile.data or len(current_profile.data) == 0:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        current_photo_url = current_profile.data[0].get('vet_profile_photo')
        
        # ---------------- Step 2: Check if there's a photo to delete ----------------
        if not current_photo_url:
            return Response({"error": "No profile photo to delete"}, status=status.HTTP_400_BAD_REQUEST)

        # ---------------- Step 3: Extract filename and validate it's user's photo ----------------
        photo_filename = current_photo_url.split('/')[-1].split('?')[0]
        
        # Safety check: Only delete photos that belong to this user
        if not photo_filename or str(current_vet_id) not in photo_filename:
            print(f"[DEBUG] Skipping deletion - photo doesn't belong to user or is default: {photo_filename}")
            # Still update the database to remove the URL, but don't delete from storage
            update_data = {"vet_profile_photo": ""}
            result = supabase.table("vet_profile").update(update_data).eq("vet_id", current_vet_id).execute()
            
            if not result.data:
                return Response({"error": "Failed to update profile in database"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                "message": "Profile photo reference removed successfully",
                "profile": result.data[0]
            }, status=status.HTTP_200_OK)

        # ---------------- Step 4: Delete photo from Supabase storage ----------------
        try:
            delete_result = sr_client.storage.from_("vet_profile").remove([photo_filename])
            print(f"[DEBUG] Successfully deleted profile photo: {photo_filename}")
        except Exception as e:
            print(f"[WARNING] Failed to delete photo from storage: {e}")
            # Continue with database update even if storage deletion fails

        # ---------------- Step 5: Update database to remove photo URL ----------------
        update_data = {"vet_profile_photo": ""}
        result = supabase.table("vet_profile").update(update_data).eq("vet_id", current_vet_id).execute()

        if not result.data:
            return Response({"error": "Failed to update profile in database"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # ---------------- Step 6: Success response ----------------
        return Response({
            "message": "Profile photo deleted successfully",
            "profile": result.data[0]
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[ERROR] Profile photo deletion failed: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- GET ALL RELEVANT APPOINTMENTS --------------------
@api_view(["GET"])
@login_required
def get_all_appointments(request):
    """
    Fetch all appointments for the logged-in veterinarian with statuses:
    approved, pending, declined, or cancelled, including horse and operator info.
    Dates are formatted as MM-DD-YYYY (numeric month-day-year).
    Includes operator profile image and names for initials fallback.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch appointments with statuses approved, pending, declined, or cancelled
        res = supabase.table("appointment").select(
            """
            *,
            horse_profile:horse_id(
                horse_name,
                horse_breed,
                horse_age,
                horse_op_profile:op_id(
                    op_fname,
                    op_mname,
                    op_lname,
                    op_phone_num,
                    op_image
                )
            )
            """
        ).eq("vet_id", vet_id).in_("app_status", ["approved", "pending", "declined", "cancelled"]).execute()

        if not res.data:
            return Response({"appointments": []}, status=200)

        formatted_appointments = []

        for app in res.data:
            horse = app.get("horse_profile", {})
            operator = horse.get("horse_op_profile", {})
            operator_name = " ".join(filter(None, [
                operator.get("op_fname"),
                operator.get("op_mname"),
                operator.get("op_lname")
            ]))
            operator_phone = operator.get("op_phone_num", "")
            operator_profile_image = operator.get("op_image", "")

            try:
                app_date_obj = datetime.strptime(str(app.get("app_date")), "%Y-%m-%d")
                formatted_app_date = app_date_obj.strftime("%m-%d-%Y") 
            except Exception:
                formatted_app_date = str(app.get("app_date"))

            formatted_appointments.append({
                "app_id": app.get("app_id"),
                "app_service": app.get("app_service"),
                "app_date": formatted_app_date,
                "app_time": app.get("app_time"),
                "app_complain": app.get("app_complain"),
                "app_status": app.get("app_status"),
                "decline_reason": app.get("decline_reason", ""),
                "horse_name": horse.get("horse_name", ""),
                "horse_breed": horse.get("horse_breed", ""),
                "horse_age": horse.get("horse_age", ""),
                "operator_name": operator_name,
                "operator_phone": operator_phone,
                "operator_profile_image": operator_profile_image,
                "operator_first_name": operator.get("op_fname", ""),
                "operator_last_name": operator.get("op_lname", ""),
            })

        return Response({"appointments": formatted_appointments}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
        
# -------------------- GET APPROVED APPOINTMENTS WITH FOLLOWUPS AND COMPLETED --------------------
@api_view(["GET"])
@login_required
def get_approved_appointments(request):
    """
    Returns all approved, follow-up, AND completed appointments for the logged-in veterinarian
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Get appointments where app_status is 'approved', 'Follow-up', OR 'Completed'
        res = supabase.table("appointment").select(
            """
            *,
            horse_profile:horse_id(
                horse_id,
                horse_name,
                horse_breed,
                horse_age,
                horse_op_profile:op_id(
                    op_fname,
                    op_mname,
                    op_lname,
                    op_phone_num
                )
            )
            """
        ).eq("vet_id", vet_id).in_("app_status", ["approved", "Follow-up", "Completed"]).execute()

        if not res.data:
            return Response({"appointments": []}, status=200)

        appointments = []

        for app in res.data:
            horse = app.get("horse_profile", {})
            operator = horse.get("horse_op_profile", {})
            operator_name = " ".join(filter(None, [
                operator.get("op_fname"),
                operator.get("op_mname"),
                operator.get("op_lname"),
            ])).strip()

            # Format the appointment date as MM-DD-YYYY
            try:
                app_date_obj = datetime.strptime(str(app.get("app_date")), "%Y-%m-%d")
                formatted_app_date = app_date_obj.strftime("%m-%d-%Y")
            except Exception:
                formatted_app_date = str(app.get("app_date"))

            appointments.append({
                "app_id": app.get("app_id"),
                "app_service": app.get("app_service"),
                "app_date": formatted_app_date,
                "app_time": app.get("app_time"),
                "app_complain": app.get("app_complain"),
                "app_status": app.get("app_status"),  # THIS IS IMPORTANT!
                "horse_name": horse.get("horse_name", ""),
                "horse_breed": horse.get("horse_breed", ""),
                "horse_age": horse.get("horse_age", ""),
                "operator_name": operator_name,
                "operator_phone": operator.get("op_phone_num", ""),
                "horse_id": horse.get("horse_id"),
                "followup_of": app.get("followup_of"),  # In case you need it
            })

        return Response({"appointments": appointments}, status=200)

    except Exception as e:
        print(f"Error fetching appointments: {str(e)}")
        return Response({"error": str(e)}, status=500)
        
# -------------------- APPROVE APPOINTMENT --------------------
@api_view(["PUT"])
@login_required
def approve_appointment(request, app_id):
    """
    Approve a pending appointment by updating its status to 'approved'.
    Only the vet assigned to the appointment can approve it.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch the appointment first
        res = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        if not res.data:
            return Response({"error": "Appointment not found"}, status=404)

        appointment = res.data[0]

        # Ensure this appointment belongs to the logged-in vet
        if appointment.get("vet_id") != vet_id:
            return Response({"error": "Not authorized to approve this appointment"}, status=403)

        # Only allow approval if status is pending
        if appointment.get("app_status") != "pending":
            return Response({"error": f"Cannot approve an appointment with status '{appointment.get('app_status')}'"}, status=400)

        # Update the appointment status to approved
        update_res = supabase.table("appointment").update({"app_status": "approved"}).eq("app_id", app_id).execute()
        if not update_res.data:
            return Response({"error": "Failed to update appointment status"}, status=500)

        return Response({"message": "Appointment approved successfully", "appointment": update_res.data[0]}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
# -------------------- DECLINE APPOINTMENT --------------------
@api_view(["PUT"])
@login_required
def decline_appointment(request, app_id):
    """
    Decline a pending appointment by updating its status to 'declined'.
    Only the vet assigned to the appointment can decline it.
    Expects JSON body: { "reason": "Vet reason or choice" }
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    reason = request.data.get("reason", "").strip()
    if not reason:
        return Response({"error": "Decline reason is required"}, status=400)

    try:
        # Fetch the appointment first
        res = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        if not res.data:
            return Response({"error": "Appointment not found"}, status=404)

        appointment = res.data[0]

        # Ensure this appointment belongs to the logged-in vet
        if appointment.get("vet_id") != vet_id:
            return Response({"error": "Not authorized to decline this appointment"}, status=403)

        # Only allow declining if status is pending
        if appointment.get("app_status") != "pending":
            return Response({"error": f"Cannot decline an appointment with status '{appointment.get('app_status')}'"}, status=400)

        # Update the appointment status and decline reason
        update_res = supabase.table("appointment").update({
            "app_status": "declined",
            "decline_reason": reason
        }).eq("app_id", app_id).execute()

        if not update_res.data:
            return Response({"error": "Failed to update appointment status"}, status=500)

        return Response({"message": "Appointment declined successfully", "appointment": update_res.data[0]}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
    


# -------------------- GET_APPOINTMENT_DETAILS TO INCLUDE MEDICAL RECORDS --------------------
@api_view(["GET"])
@login_required
def get_appointment_details(request, app_id):
    """Fetch appointment + horse + owner + med records"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        res = supabase.table("appointment").select(
            """
            *,
            horse_profile:horse_id(
                horse_id,
                horse_name,
                horse_breed,
                horse_dob,
                horse_age,
                horse_sex,
                horse_weight,
                horse_height,
                horse_color,
                horse_image,
                horse_op_profile:op_id(
                    op_id,
                    op_fname,
                    op_mname,
                    op_lname,
                    op_dob,
                    op_sex,
                    op_phone_num,
                    op_email,
                    op_province,
                    op_city,
                    op_municipality,
                    op_brgy,
                    op_zipcode,
                    op_house_add
                )
            )
            """
        ).eq("app_id", app_id).eq("vet_id", vet_id).execute()

        data = res.data or []
        if len(data) == 0:
            return Response({"error": "Appointment not found"}, status=404)

        appointment = data[0]
        horse = appointment.get("horse_profile", {}) or {}
        owner = horse.get("horse_op_profile", {}) or {}
        horse_id = horse.get("horse_id")

        # ✅ Safe date format
        def format_date_mmddyyyy(date_str):
            try:
                return datetime.strptime(str(date_str), "%Y-%m-%d").strftime("%m-%d-%Y")
            except Exception:
                return str(date_str) if date_str else None

        horse_info = {
            "id": horse_id,
            "name": horse.get("horse_name"),
            "breed": horse.get("horse_breed"),
            "dob": format_date_mmddyyyy(horse.get("horse_dob")),
            "age": horse.get("horse_age"),
            "sex": horse.get("horse_sex"),
            "weight": horse.get("horse_weight"),
            "height": horse.get("horse_height"),
            "color": horse.get("horse_color"),
            "image": horse.get("horse_image"),
        }

        owner_info = {
            "id": owner.get("op_id"),
            "firstName": owner.get("op_fname"),
            "middleName": owner.get("op_mname"),
            "lastName": owner.get("op_lname"),
            "dob": format_date_mmddyyyy(owner.get("op_dob")),
            "sex": owner.get("op_sex"),
            "phone": owner.get("op_phone_num"),
            "email": owner.get("op_email"),
            "address": ", ".join(filter(None, [
                owner.get("op_house_add"),
                owner.get("op_brgy"),
                owner.get("op_municipality"),
                owner.get("op_city"),
                owner.get("op_province"),
                owner.get("op_zipcode"),
            ]))
        }

        # ✅ Medical Records
        med_res = supabase.table("horse_medical_record").select(
            """
            *,
            vet_profile:medrec_vet_id(
                vet_fname,
                vet_mname,
                vet_lname
            )
            """
        ).eq("medrec_horse_id", horse_id).order("medrec_date", desc=True).execute()

        med_data = med_res.data or []
        medical_records = []

        for record in med_data:
            vet = record.get("vet_profile", {}) or {}
            vet_name = " ".join(filter(None, [
                vet.get("vet_fname"),
                vet.get("vet_mname"),
                vet.get("vet_lname"),
            ])).strip()

            medical_records.append({
                "id": record.get("medrec_id"),
                "date": format_date_mmddyyyy(record.get("medrec_date")),
                "heartRate": record.get("medrec_heart_rate"),
                "respRate": record.get("medrec_resp_rate"),
                "temperature": record.get("medrec_body_temp"),
                "clinicalSigns": record.get("medrec_clinical_signs"),
                "diagnosticProtocol": record.get("medrec_diagnostic_protocol"),
                "labResult": record.get("medrec_lab_results"),
                "labImage": record.get("medrec_lab_img"),
                "diagnosis": record.get("medrec_diagnosis"),
                "prognosis": record.get("medrec_prognosis"),
                "recommendation": record.get("medrec_recommendation"),
                "veterinarian": vet_name or "Unknown Veterinarian"
            })

        return Response({
            "appointment": appointment,
            "horseInfo": horse_info,
            "ownerInfo": owner_info,
            "medicalRecords": medical_records
        }, status=200)

    except Exception:
        # 🚫 No console print
        # ✅ Clean response (safe for production)
        return Response({"error": "Internal server error"}, status=500)
    
# -------------------- CHECK HORSE ACCESS --------------------
@api_view(["GET"])
@login_required
def check_horse_access(request, horse_id):
    """
    Check if the logged-in vet has access to a horse's medical records.
    Returns:
        - has_access: True if access is approved
        - access_requested: True if a pending request exists
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Check if approved
        approved_res = supabase.table("medrec_access_request")\
            .select("*")\
            .eq("horse_id", horse_id)\
            .eq("vet_id", vet_id)\
            .eq("request_status", "approved")\
            .execute()

        # Check if pending request exists
        pending_res = supabase.table("medrec_access_request")\
            .select("*")\
            .eq("horse_id", horse_id)\
            .eq("vet_id", vet_id)\
            .eq("request_status", "pending")\
            .execute()

        return Response({
            "has_access": bool(approved_res.data),
            "access_requested": bool(pending_res.data)
        }, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# -------------------- REQUEST ACCESS TO HORSE --------------------
@api_view(["POST"])
@login_required
def request_horse_access(request, horse_id):
    """
    Create a pending access request for the logged-in vet to a horse.
    Ensures:
        - No duplicate requests
        - Works even if the horse has no medical records yet
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        horse_id_str = str(horse_id)
        vet_id_str = str(vet_id)

        # Check if already approved
        approved_res = supabase.table("medrec_access_request")\
            .select("*")\
            .eq("horse_id", horse_id_str)\
            .eq("vet_id", vet_id_str)\
            .eq("request_status", "approved")\
            .execute()
        if approved_res.data:
            return Response({"detail": "Already has access"}, status=400)

        # Check if a pending request exists
        pending_res = supabase.table("medrec_access_request")\
            .select("*")\
            .eq("horse_id", horse_id_str)\
            .eq("vet_id", vet_id_str)\
            .eq("request_status", "pending")\
            .execute()
        if pending_res.data:
            return Response({"detail": "Access request already sent"}, status=400)

        # Insert new pending request
        new_request = {
            "request_id": str(uuid.uuid4()),
            "horse_id": horse_id_str,
            "vet_id": vet_id_str,
            "request_status": "pending",
            "requested_at": datetime.utcnow().isoformat()
        }

        insert_res = supabase.table("medrec_access_request").insert(new_request).execute()

        return Response({"message": "Access request sent"}, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# -------------------- GET HORSE DETAILS --------------------
@api_view(["GET"])
@login_required
def get_horse_details(request, horse_id):
    """
    Fetch detailed horse information including owner details.
    Used for medical records access.
    """
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        print(f"🐎 Fetching horse details for horse_id: {horse_id}")

        # Fetch horse details with owner information
        res = supabase.table("horse_profile").select(
            """
            *,
            horse_op_profile:op_id(
                op_id,
                op_fname,
                op_mname,
                op_lname,
                op_dob,
                op_sex,
                op_phone_num,
                op_email,
                op_province,
                op_city,
                op_municipality,
                op_brgy,
                op_zipcode,
                op_house_add
            )
            """
        ).eq("horse_id", horse_id).execute()

        if not res.data:
            return Response({"error": "Horse not found"}, status=404)

        horse_data = res.data[0]
        horse = horse_data.get("horse_profile", {}) or horse_data  # Handle nested structure
        owner = horse.get("horse_op_profile", {}) or {}

        # ✅ Safe date format
        def format_date_mmddyyyy(date_str):
            try:
                return datetime.strptime(str(date_str), "%Y-%m-%d").strftime("%m-%d-%Y")
            except Exception:
                return str(date_str) if date_str else None

        # Format horse information
        horse_info = {
            "id": horse.get("horse_id"),
            "name": horse.get("horse_name"),
            "breed": horse.get("horse_breed"),
            "dob": format_date_mmddyyyy(horse.get("horse_dob")),
            "age": horse.get("horse_age"),
            "sex": horse.get("horse_sex"),
            "weight": horse.get("horse_weight"),
            "height": horse.get("horse_height"),
            "color": horse.get("horse_color"),
            "image": horse.get("horse_image"),
            "status": horse.get("horse_status"),
        }

        # Format owner information
        owner_info = {
            "id": owner.get("op_id"),
            "firstName": owner.get("op_fname"),
            "middleName": owner.get("op_mname"),
            "lastName": owner.get("op_lname"),
            "dob": format_date_mmddyyyy(owner.get("op_dob")),
            "sex": owner.get("op_sex"),
            "phone": owner.get("op_phone_num"),
            "email": owner.get("op_email"),
            "address": ", ".join(filter(None, [
                owner.get("op_house_add"),
                owner.get("op_brgy"),
                owner.get("op_municipality"),
                owner.get("op_city"),
                owner.get("op_province"),
                owner.get("op_zipcode"),
            ])),
            "province": owner.get("op_province"),
            "city": owner.get("op_city"),
            "municipality": owner.get("op_municipality"),
            "barangay": owner.get("op_brgy"),
            "zipcode": owner.get("op_zipcode"),
            "houseAddress": owner.get("op_house_add"),
        }

        return Response({
            "horse": horse_info,
            "owner": owner_info
        }, status=200)

    except Exception as e:
        print(f"❌ Error fetching horse details: {str(e)}")
        traceback.print_exc()
        return Response({"error": "Internal server error"}, status=500)

# -------------------- GET MEDICAL RECORDS FOR A HORSE --------------------
@api_view(["GET"])
@login_required
def get_horse_medical_records(request, horse_id):
    try:
        print("🐎 Fetching medical records for horse_id:", horse_id)
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        res = supabase.table("horse_medical_record").select(
            """
            *,
            vet_profile:medrec_vet_id(
                vet_fname,
                vet_mname,
                vet_lname
            )
            """
        ).eq("medrec_horse_id", horse_id).order("medrec_date", desc=True).execute()

        if hasattr(res, "error") and res.error:
            return Response({"error": str(res.error)}, status=500)

        formatted_records = []
        for record in res.data or []:
            vet = record.get("vet_profile") or {}
            vet_name = " ".join(filter(None, [
                vet.get("vet_fname"),
                vet.get("vet_mname"),
                vet.get("vet_lname")
            ])).strip() or "Unknown Veterinarian"

            # SIMPLIFIED APPROACH: Handle array or single value
            lab_images = record.get("medrec_lab_img") or []
            processed_lab_images = []
            
            print(f"[DEBUG] Raw lab_images data: {lab_images}")
            print(f"[DEBUG] Type of lab_images: {type(lab_images)}")
            
            # If it's a string, try to parse it as JSON array
            if isinstance(lab_images, str):
                try:
                    # Try to parse as JSON array
                    import json
                    parsed = json.loads(lab_images)
                    if isinstance(parsed, list):
                        lab_images = parsed
                    else:
                        lab_images = [lab_images]  # Convert single string to array
                except:
                    # If not valid JSON, treat as single URL
                    lab_images = [lab_images]
            
            # Ensure we have a list
            if not isinstance(lab_images, list):
                lab_images = [lab_images] if lab_images else []
            
            # Process each URL
            for lab_image_url in lab_images:
                if lab_image_url and str(lab_image_url).strip():
                    url_str = str(lab_image_url).strip()
                    
                    # Clean any quotes or brackets
                    url_str = url_str.replace('"', '').replace("'", '').replace('[', '').replace(']', '')
                    
                    if url_str and not url_str.startswith(('http://', 'https://')):
                        # Extract filename
                        if '/' in url_str:
                            filename = url_str.split('/')[-1]
                        else:
                            filename = url_str
                        
                        # Construct full URL
                        full_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{filename}"
                        processed_lab_images.append(full_url)
                    elif url_str:
                        processed_lab_images.append(url_str)
            
            print(f"[DEBUG] Processed {len(processed_lab_images)} lab files: {processed_lab_images}")

            formatted_records.append({
                "id": record.get("medrec_id"),
                "date": record.get("medrec_date"),
                "created_at": record.get("created_at"),
                "followUpDate": record.get("medrec_followup_date"),
                "followUpTime": record.get("medrec_followup_time"),  
                "parentMedrecId": record.get("parent_medrec_id"),
                "heartRate": record.get("medrec_heart_rate"),
                "respRate": record.get("medrec_resp_rate"),
                "temperature": record.get("medrec_body_temp"),
                "clinicalSigns": record.get("medrec_clinical_signs"),
                "diagnosticProtocol": record.get("medrec_diagnostic_protocol"),
                "labResult": record.get("medrec_lab_results"),
                "labImages": processed_lab_images,  # This is the array
                "diagnosis": record.get("medrec_diagnosis"),
                "prognosis": record.get("medrec_prognosis"),
                "recommendation": record.get("medrec_recommendation"),
                "horseStatus": record.get("medrec_horsestatus"),
                "veterinarian": vet_name,
            })

        return Response({"medicalRecords": formatted_records}, status=200)

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return Response({"error": str(e)}, status=500)
    
# -------------------- GET SINGLE MEDICAL RECORD --------------------
@api_view(["GET"])
@login_required
def get_medical_record(request, medrec_id):
    """
    Fetch a single medical record by ID with all details including treatments and lab files
    Simplified version with network error handling
    """
    try:
        print(f"🔍 Fetching single medical record: {medrec_id}")
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        # Try with retry logic for network issues
        max_retries = 3
        record_res = None
        last_error = None
        
        for attempt in range(max_retries):
            try:
                print(f"📡 Attempt {attempt + 1}/{max_retries} to fetch record...")
                # SIMPLIFIED: Remove complex join, get basic data first
                record_res = supabase.table("horse_medical_record")\
                    .select("*")\
                    .eq("medrec_id", medrec_id)\
                    .eq("medrec_vet_id", vet_id)\
                    .execute()
                
                # If we get here, query succeeded
                print(f"✅ Query successful on attempt {attempt + 1}")
                break
                
            except Exception as e:
                last_error = e
                print(f"⚠️ Attempt {attempt + 1} failed: {str(e)[:100]}")
                if attempt < max_retries - 1:
                    # Wait before retrying (exponential backoff: 1, 2, 4 seconds)
                    wait_time = 2 ** attempt
                    print(f"⏳ Waiting {wait_time}s before retry...")
                    import time
                    time.sleep(wait_time)
                else:
                    print(f"❌ All {max_retries} attempts failed")
                    raise last_error

        if hasattr(record_res, "error") and record_res.error:
            return Response({"error": str(record_res.error)}, status=500)
            
        if not record_res.data:
            return Response({"error": "Medical record not found or unauthorized"}, status=404)

        record = record_res.data[0]
        
        # Get associated treatments (with its own retry logic)
        treatments = []
        try:
            treatments_res = supabase.table("horse_treatment")\
                .select("*")\
                .eq("medrec_id", medrec_id)\
                .execute()
            treatments = treatments_res.data or []
            print(f"✅ Found {len(treatments)} treatments")
        except Exception as e:
            print(f"⚠️ Could not fetch treatments: {e}")
            # Continue without treatments
        
        # Get vet name separately (simpler query)
        vet_name = "Unknown Veterinarian"
        try:
            vet_res = supabase.table("vet_profile")\
                .select("vet_fname, vet_mname, vet_lname")\
                .eq("vet_id", vet_id)\
                .limit(1)\
                .execute()
            if vet_res.data:
                vet = vet_res.data[0]
                vet_name = " ".join(filter(None, [
                    vet.get("vet_fname"),
                    vet.get("vet_mname"),
                    vet.get("vet_lname")
                ])).strip()
            print(f"✅ Found vet: {vet_name}")
        except Exception as e:
            print(f"⚠️ Could not fetch vet profile: {e}")
        
        # ✅ FIXED: Use the same lab image processing logic as get_horse_medical_records
        lab_images = record.get("medrec_lab_img") or []
        processed_lab_images = []
        
        print(f"[DEBUG] Raw lab_images data: {lab_images}")
        print(f"[DEBUG] Type of lab_images: {type(lab_images)}")
        
        # If it's a string, try to parse it as JSON array
        if isinstance(lab_images, str):
            try:
                # Try to parse as JSON array
                import json
                parsed = json.loads(lab_images)
                if isinstance(parsed, list):
                    lab_images = parsed
                else:
                    lab_images = [lab_images]  # Convert single string to array
            except:
                # If not valid JSON, treat as single URL
                lab_images = [lab_images]
        
        # Ensure we have a list
        if not isinstance(lab_images, list):
            lab_images = [lab_images] if lab_images else []
        
        # Process each URL
        for lab_image_url in lab_images:
            if lab_image_url and str(lab_image_url).strip():
                url_str = str(lab_image_url).strip()
                
                # Clean any quotes or brackets
                url_str = url_str.replace('"', '').replace("'", '').replace('[', '').replace(']', '')
                
                if url_str and not url_str.startswith(('http://', 'https://')):
                    # Extract filename
                    if '/' in url_str:
                        filename = url_str.split('/')[-1]
                    else:
                        filename = url_str
                    
                    # Remove query params if any
                    filename = filename.split('?')[0]
                    
                    # Construct full URL
                    full_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{filename}"
                    processed_lab_images.append(full_url)
                elif url_str:
                    processed_lab_images.append(url_str)
        
        print(f"[DEBUG] Processed {len(processed_lab_images)} lab files: {processed_lab_images}")

        # Format dates for frontend
        def format_date_mmddyyyy(date_str):
            try:
                return datetime.strptime(str(date_str)[:10], "%Y-%m-%d").strftime("%m-%d-%Y")
            except Exception:
                return str(date_str)[:10] if date_str else None

        formatted_record = {
            "id": record.get("medrec_id"),
            "horse_id": record.get("medrec_horse_id"),
            "date": format_date_mmddyyyy(record.get("medrec_date")),
            "created_at": record.get("created_at"),
            "followUpDate": format_date_mmddyyyy(record.get("medrec_followup_date")),
            "followUpTime": record.get("medrec_followup_time"),
            "parentMedrecId": record.get("parent_medrec_id"),
            "heartRate": record.get("medrec_heart_rate"),
            "respRate": record.get("medrec_resp_rate"),
            "temperature": record.get("medrec_body_temp"),
            "clinicalSigns": record.get("medrec_clinical_signs"),
            "diagnosticProtocol": record.get("medrec_diagnostic_protocol"),
            "labResult": record.get("medrec_lab_results"),
            "labImages": processed_lab_images,  # ✅ Now using the clean array
            "diagnosis": record.get("medrec_diagnosis"),
            "prognosis": record.get("medrec_prognosis"),
            "recommendation": record.get("medrec_recommendation"),
            "horseStatus": record.get("medrec_horsestatus"),
            "healthStatus": record.get("medrec_horsestatus"),
            "veterinarian": vet_name,
            "treatments": treatments
        }

        print(f"✅ Successfully fetched and formatted record {medrec_id}")
        return Response({"record": formatted_record}, status=200)

    except Exception as e:
        print(f"❌ Critical error fetching medical record: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return a user-friendly error
        error_msg = str(e)
        if "socket" in error_msg.lower() or "connection" in error_msg.lower() or "10035" in error_msg:
            return Response({
                "error": "Network connection failed",
                "message": "Could not connect to database. Please check your internet connection and try again."
            }, status=503)
        else:
            return Response({
                "error": "Failed to fetch medical record",
                "message": str(e)
            }, status=500)
            
# -------------------- GET TREATMENT RECORDS FOR A HORSE --------------------
@api_view(["GET"])
@login_required
def get_horse_treatment_records(request, horse_id):
    import traceback

    try:
        print("💊 Fetching ONLY treatment records for horse_id:", horse_id)

        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        # Step 1: Fetch medrec_ids for this horse WITH DATE
        medrec_res = supabase.table("horse_medical_record") \
            .select("medrec_id, medrec_diagnosis, medrec_date") \
            .eq("medrec_horse_id", horse_id) \
            .execute()

        if hasattr(medrec_res, "error") and medrec_res.error:
            print("🔥 Error fetching medrec_ids:", medrec_res.error)
            return Response({"error": str(medrec_res.error)}, status=500)

        # Map medrec_id → diagnosis + date
        medrec_map = {
            row["medrec_id"]: {
                "diagnosis": row.get("medrec_diagnosis"),
                "date": row.get("medrec_date")
            }
            for row in (medrec_res.data or [])
        }

        medrec_ids = list(medrec_map.keys())
        print("📋 Found medrec_ids with diagnosis and date:", medrec_map)

        if not medrec_ids:
            return Response({"treatmentRecords": []}, status=200)

        # Step 2: Fetch treatments linked to those medrec_ids
        res = supabase.table("horse_treatment").select(
            """
            treatment_id,
            medrec_id,
            treatment_name,
            treatment_dosage,
            treatment_duration,
            treatment_outcome
            """
        ).in_("medrec_id", medrec_ids).order("treatment_id", desc=True).execute()

        if hasattr(res, "error") and res.error:
            print("🔥 Supabase error fetching treatments:", res.error)
            return Response({"error": str(res.error)}, status=500)

        treatments = []
        for t in res.data or []:
            medrec_info = medrec_map.get(t.get("medrec_id"), {})
            treatments.append({
                "id": t.get("treatment_id"),
                "medrecId": t.get("medrec_id"),
                "diagnosis": medrec_info.get("diagnosis"),
                "date": medrec_info.get("date"), 
                "medication": t.get("treatment_name"),
                "dosage": t.get("treatment_dosage"),
                "duration": t.get("treatment_duration"),
                "outcome": t.get("treatment_outcome"),
            })

        print("✅ Returning treatments:", treatments)
        return Response({"treatmentRecords": treatments}, status=200)

    except Exception as e:
        print("🔥 Exception in get_horse_treatment_records:", str(e))
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
@login_required
def add_medical_record(request):
    try:
        print(f"🚨 [DEBUG] Starting medical record creation - SINGLE REQUEST")
        
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        horse_id = request.POST.get("horse_id")
        app_id = request.POST.get("app_id")

        def safe_get(field):
            val = request.POST.get(field)
            return val if val not in [None, "", "null"] else None

        # NEW FIELDS
        horse_status = safe_get("healthStatus")
        followup_date = safe_get("followUpDate")
        followup_time = safe_get("followUpTime")

        if not horse_id or not app_id:
            return Response({"error": "Missing horse_id or app_id"}, status=400)

        # Prevent duplicate for same horse/vet/day
        today = date.today().isoformat()
        existing = (
            supabase.table("horse_medical_record")
            .select("medrec_id")
            .eq("medrec_horse_id", horse_id)
            .eq("medrec_vet_id", vet_id)
            .eq("medrec_date", today)
            .execute()
        )
        if existing.data:
            return Response({"error": "Medical record already created today"}, status=400)

        # ---------------- File Upload ----------------
        lab_files_urls = []
        lab_files = request.FILES.getlist("lab_files")

        for lab_file in lab_files:
            try:
                import datetime, random
                timestamp = int(datetime.datetime.now().timestamp())
                ext = lab_file.name.split(".")[-1]
                file_name = f"{horse_id}_lab_{timestamp}_{random.randint(1000,9999)}.{ext}"

                sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    lab_file.read(),
                    {
                        "content-type": lab_file.content_type,
                        "x-upsert": "true",
                    },
                )

                url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                if "?" in url:
                    url = url.split("?")[0]

                lab_files_urls.append(url)
            except:
                pass

        # Base64 legacy
        lab_image_base64 = safe_get("labImageBase64")
        lab_image_name = safe_get("labImageName") or "lab.jpg"
        lab_image_type = safe_get("labImageType") or "image/jpeg"

        if lab_image_base64:
            try:
                import base64, random, datetime

                timestamp = int(datetime.datetime.now().timestamp())
                ext = lab_image_name.split(".")[-1]
                file_name = f"{horse_id}_lab_{timestamp}_{random.randint(1000,9999)}.{ext}"

                file_content = base64.b64decode(lab_image_base64)

                sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    file_content,
                    {"content-type": lab_image_type, "x-upsert": "true"},
                )

                url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                if "?" in url:
                    url = url.split("?")[0]

                lab_files_urls.append(url)
            except:
                pass

        final_lab_files = lab_files_urls if lab_files_urls else None

        # ---------------- Create Medical Record ----------------
        medrec_id = str(uuid.uuid4())
        record_data = {
            "medrec_id": medrec_id,
            "medrec_horse_id": horse_id,
            "medrec_vet_id": vet_id,
            "medrec_date": safe_get("date") or today,
            "medrec_followup_date": followup_date,
            "medrec_followup_time": followup_time,
            "medrec_heart_rate": safe_get("heartRate"),
            "medrec_resp_rate": safe_get("respRate"),
            "medrec_body_temp": safe_get("temperature"),
            "medrec_clinical_signs": safe_get("clinicalSigns"),
            "medrec_diagnostic_protocol": safe_get("diagnosticProtocol"),
            "medrec_lab_results": safe_get("labResult"),
            "medrec_lab_img": final_lab_files,
            "medrec_diagnosis": safe_get("diagnosis"),
            "medrec_prognosis": safe_get("prognosis"),
            "medrec_recommendation": safe_get("recommendation"),
            "medrec_horsestatus": horse_status,
        }

        supabase.table("horse_medical_record").insert(record_data).execute()

        # ---------------- Update Horse Status ----------------
        if horse_status:
            supabase.table("horse_profile").update(
                {"horse_status": horse_status}
            ).eq("horse_id", horse_id).execute()

        # ---------------- Insert Treatments ----------------
        treatments_raw = safe_get("treatments")
        treatment_records = []

        if treatments_raw:
            treatments = json.loads(treatments_raw)
            for t in treatments:
                treatment_records.append({
                    "treatment_id": str(uuid.uuid4()),
                    "medrec_id": medrec_id,
                    "treatment_name": t.get("name") or t.get("medication"),
                    "treatment_dosage": t.get("dosage"),
                    "treatment_duration": t.get("duration"),
                    "treatment_outcome": t.get("outcome"),
                })

            if treatment_records:
                supabase.table("horse_treatment").insert(treatment_records).execute()

        # ---------------- FOLLOW-UP AUTO CREATION ----------------
        if followup_date and followup_time:
            print("➡️ [DEBUG] Creating follow-up appointment...")

            # GET original appointment details including complain
            original_app = (
                supabase.table("appointment")
                .select(
                    "user_id, horse_id, app_service, vet_id, app_complain"
                )
                .eq("app_id", app_id)
                .single()
                .execute()
            )

            og = original_app.data

            followup_app_id = str(uuid.uuid4())

            new_followup = {
                "app_id": followup_app_id,
                "app_service": og["app_service"],
                "app_date": followup_date,
                "app_time": followup_time,
                "app_status": "Follow-up",
                "app_complain": og["app_complain"],   # FIXED
                "user_id": og["user_id"],
                "horse_id": og["horse_id"],
                "vet_id": og["vet_id"],
                "followup_of": app_id,                 # Link follow-up
            }

            supabase.table("appointment").insert(new_followup).execute()
            
            # Update original appointment to "Follow-up Scheduled"
            supabase.table("appointment").update(
                {"app_status": "Follow-up Scheduled"}
            ).eq("app_id", app_id).execute()
            
        else:
            # WHEN THERE IS NO FOLLOWUP SET BY THE VET, MAKE THE APP STATUS COMPLETED!
            print("➡️ [DEBUG] No follow-up set. Marking appointment as 'Completed'")
            supabase.table("appointment").update(
                {"app_status": "Completed"}
            ).eq("app_id", app_id).execute()

        return Response({
            "message": "Medical record added successfully",
            "medrec_id": medrec_id,
            "treatments": treatment_records,
            "lab_files": lab_files_urls,
            "followup_date": followup_date,
            "followup_time": followup_time,
            "app_status_updated": "Completed" if not (followup_date and followup_time) else "Follow-up Scheduled"
        }, status=201)

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return Response({"error": str(e)}, status=500)

# -------------------- UPDATE MEDICAL RECORD --------------------
@api_view(["POST"])
@login_required
def update_medical_record(request):
    """
    Update an existing medical record.
    Handles:
    - Updating all medical record fields
    - Adding new lab files (deletes old ones if replaced)
    - Updating treatments
    - Preserving existing approved access
    """
    try:
        print(f"🚨 [DEBUG] Starting medical record UPDATE")
        
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        medrec_id = request.POST.get("medrec_id")
        horse_id = request.POST.get("horse_id")
        app_id = request.POST.get("app_id")

        def safe_get(field):
            val = request.POST.get(field)
            return val if val not in [None, "", "null"] else None

        # NEW FIELDS
        horse_status = safe_get("healthStatus")
        followup_date = safe_get("followUpDate")
        followup_time = safe_get("followUpTime")

        if not medrec_id or not horse_id:
            return Response({"error": "Missing medrec_id or horse_id"}, status=400)

        # Check if the medical record exists and belongs to this vet
        existing_res = supabase.table("horse_medical_record")\
            .select("*")\
            .eq("medrec_id", medrec_id)\
            .eq("medrec_vet_id", vet_id)\
            .execute()
        
        if not existing_res.data:
            return Response({"error": "Medical record not found or unauthorized"}, status=404)

        existing_record = existing_res.data[0]
        
        # Get existing lab files to preserve them
        existing_lab_files_raw = existing_record.get("medrec_lab_img") or []
        
        # Parse existing files (they might be stored as JSON string)
        existing_lab_files = []
        if existing_lab_files_raw:
            try:
                if isinstance(existing_lab_files_raw, str):
                    # Try to parse JSON string
                    try:
                        parsed = json.loads(existing_lab_files_raw)
                        if isinstance(parsed, list):
                            existing_lab_files = parsed
                        elif isinstance(parsed, str):
                            existing_lab_files = [parsed]
                        else:
                            existing_lab_files = [str(parsed)]
                    except json.JSONDecodeError:
                        # If not JSON, check if it's a single URL
                        if existing_lab_files_raw.startswith(('http://', 'https://')):
                            existing_lab_files = [existing_lab_files_raw]
                        else:
                            existing_lab_files = []
                elif isinstance(existing_lab_files_raw, list):
                    existing_lab_files = existing_lab_files_raw
            except Exception as e:
                print(f"⚠️ Error parsing existing lab files: {e}")
                existing_lab_files = []
        
        print(f"📁 Existing lab files: {existing_lab_files}")
        
        # Get files to keep from request (these are the files user wants to keep)
        keep_files_json = safe_get("existing_lab_files")
        files_to_keep = []
        if keep_files_json:
            try:
                files_to_keep = json.loads(keep_files_json)
                print(f"📁 Files user wants to keep: {files_to_keep}")
            except Exception as e:
                print(f"⚠️ Error parsing keep_files_json: {e}")
                pass
        
        # Files to delete = existing files that are NOT in files_to_keep
        files_to_delete = []
        final_existing_files = []
        
        for existing_file in existing_lab_files:
            keep_this_file = False
            
            # Check if user wants to keep this file
            for keep_item in files_to_keep:
                if isinstance(keep_item, dict):
                    # Check by file_path or ID
                    keep_file_path = keep_item.get('file_path') or keep_item.get('id') or str(keep_item)
                    if keep_file_path and existing_file and (keep_file_path in str(existing_file) or str(keep_item) in str(existing_file)):
                        keep_this_file = True
                        break
                else:
                    # Check by string match
                    if str(keep_item) in str(existing_file):
                        keep_this_file = True
                        break
            
            if keep_this_file:
                final_existing_files.append(existing_file)
                print(f"✅ Keeping existing file: {existing_file}")
            else:
                files_to_delete.append(existing_file)
                print(f"🗑️ Marking for deletion: {existing_file}")
        
        # ---------------- Delete old files from storage ----------------
        deleted_files = []
        for file_url in files_to_delete:
            try:
                # Extract filename from URL
                if file_url.startswith(('http://', 'https://')):
                    # Extract from Supabase URL format
                    # Format: https://project.supabase.co/storage/v1/object/public/Lab_results/filename.ext
                    parts = file_url.split('/')
                    if 'Lab_results' in parts:
                        lab_results_index = parts.index('Lab_results')
                        if lab_results_index + 1 < len(parts):
                            filename = parts[lab_results_index + 1]
                            # Remove query params if any
                            filename = filename.split('?')[0]
                            
                            # Delete from Supabase storage
                            try:
                                sr_client.storage.from_("Lab_results").remove([filename])
                                deleted_files.append(filename)
                                print(f"✅ Deleted file from storage: {filename}")
                            except Exception as delete_error:
                                print(f"⚠️ Failed to delete {filename} from storage: {delete_error}")
                else:
                    # Might be just a filename
                    filename = file_url.split('/')[-1].split('?')[0]
                    try:
                        sr_client.storage.from_("Lab_results").remove([filename])
                        deleted_files.append(filename)
                        print(f"✅ Deleted file from storage: {filename}")
                    except Exception as delete_error:
                        print(f"⚠️ Failed to delete {filename} from storage: {delete_error}")
                        
            except Exception as e:
                print(f"⚠️ Error processing file deletion for {file_url}: {e}")
        
        # ---------------- Handle New Lab Files Upload ----------------
        new_lab_files_urls = []
        lab_files = request.FILES.getlist("lab_files")

        for lab_file in lab_files:
            try:
                timestamp = int(datetime.now().timestamp())
                ext = lab_file.name.split(".")[-1] if '.' in lab_file.name else 'bin'
                file_name = f"{horse_id}_lab_{timestamp}_{random.randint(1000,9999)}.{ext}"

                sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    lab_file.read(),
                    {
                        "content-type": lab_file.content_type,
                        "x-upsert": "true",
                    },
                )

                url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                if "?" in url:
                    url = url.split("?")[0]

                new_lab_files_urls.append(url)
                print(f"✅ Uploaded new file: {file_name}")
            except Exception as e:
                print(f"❌ Failed to upload new lab file: {e}")
                continue

        # Base64 legacy support (optional)
        lab_image_base64 = safe_get("labImageBase64")
        lab_image_name = safe_get("labImageName") or "lab.jpg"
        lab_image_type = safe_get("labImageType") or "image/jpeg"

        if lab_image_base64:
            try:
                import base64
                timestamp = int(datetime.now().timestamp())
                ext = lab_image_name.split(".")[-1] if '.' in lab_image_name else 'jpg'
                file_name = f"{horse_id}_lab_{timestamp}_{random.randint(1000,9999)}.{ext}"

                file_content = base64.b64decode(lab_image_base64)

                sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    file_content,
                    {"content-type": lab_image_type, "x-upsert": "true"},
                )

                url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                if "?" in url:
                    url = url.split("?")[0]

                new_lab_files_urls.append(url)
                print(f"✅ Uploaded base64 image: {file_name}")
            except Exception as e:
                print(f"❌ Failed to upload base64 lab image: {e}")

        # Combine kept existing files and new files
        final_lab_files = final_existing_files + new_lab_files_urls
        if not final_lab_files:
            final_lab_files = None
        
        print(f"📁 Final lab files after update: {final_lab_files}")

        # ---------------- Update Medical Record ----------------
        update_data = {
            "medrec_heart_rate": safe_get("heartRate"),
            "medrec_resp_rate": safe_get("respRate"),
            "medrec_body_temp": safe_get("temperature"),
            "medrec_clinical_signs": safe_get("clinicalSigns"),
            "medrec_diagnostic_protocol": safe_get("diagnosticProtocol"),
            "medrec_lab_results": safe_get("labResult"),
            "medrec_lab_img": final_lab_files,
            "medrec_diagnosis": safe_get("diagnosis"),
            "medrec_prognosis": safe_get("prognosis"),
            "medrec_recommendation": safe_get("recommendation"),
            "medrec_horsestatus": horse_status,
            "medrec_followup_date": followup_date,
            "medrec_followup_time": followup_time,
            "updated_at": datetime.now().isoformat()        
        }

        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}

        print(f"📝 Updating medical record {medrec_id} with data: {update_data}")

        update_res = supabase.table("horse_medical_record")\
            .update(update_data)\
            .eq("medrec_id", medrec_id)\
            .execute()

        if not update_res.data:
            return Response({"error": "Failed to update medical record"}, status=500)

        # ---------------- Update Horse Status ----------------
        if horse_status:
            supabase.table("horse_profile").update(
                {"horse_status": horse_status}
            ).eq("horse_id", horse_id).execute()

        # ---------------- Handle Treatments ----------------
        treatments_raw = safe_get("treatments")
        
        if treatments_raw:
            try:
                # First, delete existing treatments for this record
                supabase.table("horse_treatment")\
                    .delete()\
                    .eq("medrec_id", medrec_id)\
                    .execute()
                
                # Insert new treatments
                treatments = json.loads(treatments_raw)
                treatment_records = []
                
                for t in treatments:
                    treatment_records.append({
                        "treatment_id": str(uuid.uuid4()),
                        "medrec_id": medrec_id,
                        "treatment_name": t.get("name") or t.get("medication"),
                        "treatment_dosage": t.get("dosage"),
                        "treatment_duration": t.get("duration"),
                        "treatment_outcome": t.get("outcome"),
                    })

                if treatment_records:
                    supabase.table("horse_treatment").insert(treatment_records).execute()
                    print(f"✅ Updated {len(treatment_records)} treatments")
                    
            except Exception as e:
                print(f"⚠️ Failed to process treatments: {e}")

        # ---------------- Update Schedule Availability ----------------
        schedule_id = safe_get("scheduleId")
        if schedule_id:
            try:
                supabase.table("appointment_slot").update({
                    "available": False
                }).eq("slot_id", schedule_id).execute()
            except Exception as e:
                print(f"⚠️ Failed to update schedule availability: {e}")

        print(f"🎉 [DEBUG] SUCCESS: Updated medical record {medrec_id}")

        return Response({
            "message": "Medical record updated successfully",
            "medrec_id": medrec_id,
            "treatments_updated": True if treatments_raw else False,
            "lab_files_added": len(new_lab_files_urls),
            "lab_files_kept": len(final_existing_files),
            "lab_files_deleted": len(deleted_files),
            "horse_status": horse_status,
            "followup_date": followup_date,
            "followup_time": followup_time,
        }, status=200)

    except Exception as e:
        print(f"❌ ERROR updating medical record: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)
        
# -------------------- CREATE FOLLOW-UP MEDICAL RECORD --------------------
@api_view(["POST"])
@login_required
def create_followup_record(request):
    try:
        print("🚨 [DEBUG] Starting follow-up record creation")

        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        horse_id = request.POST.get("horseId")
        previous_record_id = request.POST.get("previousRecordId")
        schedule_id = request.POST.get("scheduleId")

        # 🧠 Utility: safely handle empty/nullable inputs
        def safe_get(field):
            val = request.POST.get(field)
            return val if val not in [None, "", "null"] else None

        # 🆕 Fields for follow-up
        horse_status = safe_get("horseStatus")
        followup_date = safe_get("followUpDate")
        followup_time = safe_get("followUpTime")

        # ✅ Validate required fields
        if not horse_id or not previous_record_id:
            return Response({"error": "Missing horse_id or previous_record_id"}, status=400)

        # ---------------- Handle Multiple Lab Files Upload ----------------
        lab_files_urls = []
        lab_files = request.FILES.getlist('lab_files')
        print(f"[DEBUG] Number of lab files received: {len(lab_files)}")

        for lab_file in lab_files:
            try:
                import datetime, random

                timestamp = int(datetime.datetime.now().timestamp())
                file_extension = lab_file.name.split('.')[-1] if '.' in lab_file.name else 'bin'
                file_name = f"{horse_id}_followup_{timestamp}_{random.randint(1000,9999)}.{file_extension}"

                # Upload to Supabase
                upload_res = sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    lab_file.read(),
                    {"content-type": lab_file.content_type, "x-upsert": "true"}
                )

                # Build public URL manually
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                if '?' in public_url:
                    public_url = public_url.split('?')[0]

                lab_files_urls.append(public_url)
                print(f"[DEBUG] Lab file uploaded: {public_url}")

            except Exception as e:
                import logging
                logging.exception(f"Lab file upload failed: {e}")
                continue

        # ---------------- Handle Base64 Image Upload (Optional) ----------------
        lab_image_base64 = safe_get("labImageBase64")
        lab_image_name = safe_get("labImageName") or "lab_image.jpg"
        lab_image_type = safe_get("labImageType") or "image/jpeg"

        if lab_image_base64:
            try:
                import base64, datetime, random

                timestamp = int(datetime.datetime.now().timestamp())
                file_extension = lab_image_name.split('.')[-1] if '.' in lab_image_name else 'jpg'
                file_name = f"{horse_id}_followup_{timestamp}_{random.randint(1000,9999)}.{file_extension}"

                file_content = base64.b64decode(lab_image_base64)

                upload_res = sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    file_content,
                    {"content-type": lab_image_type, "x-upsert": "true"}
                )

                public_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                if '?' in public_url:
                    public_url = public_url.split('?')[0]

                lab_files_urls.append(public_url)
                print(f"[DEBUG] Lab image uploaded via base64: {public_url}")
            except Exception as e:
                import logging
                logging.exception(f"Lab image base64 upload failed: {e}")

        # Final combined file list
        final_lab_files = lab_files_urls if lab_files_urls else None

        # ---------------- Create Follow-up Medical Record ----------------
        medrec_id = str(uuid.uuid4())
        record_data = {
            "medrec_id": medrec_id,
            "medrec_horse_id": horse_id,
            "medrec_vet_id": vet_id,
            "medrec_date": date.today().isoformat(),
            "medrec_followup_date": followup_date,
            "medrec_followup_time": followup_time,
            "medrec_heart_rate": safe_get("heartRate"),
            "medrec_resp_rate": safe_get("respRate"),
            "medrec_body_temp": safe_get("temperature"),
            "medrec_clinical_signs": safe_get("clinicalSigns"),
            "medrec_diagnostic_protocol": safe_get("diagnosticProtocol"),
            "medrec_lab_results": safe_get("labResult"),
            "medrec_lab_img": final_lab_files,
            "medrec_diagnosis": safe_get("diagnosis"),
            "medrec_prognosis": safe_get("prognosis"),
            "medrec_recommendation": safe_get("recommendation"),
            "medrec_horsestatus": horse_status,
            "parent_medrec_id": previous_record_id,  # link to original record
        }

        print(f"✅ [DEBUG] Creating follow-up medical record with ID: {medrec_id}")

        medrec_res = supabase.table("horse_medical_record").insert(record_data).execute()
        if not medrec_res.data:
            return Response({"error": "Failed to add follow-up record"}, status=500)

        # ---------------- Update Horse Status ----------------
        if horse_status:
            supabase.table("horse_profile").update({
                "horse_status": horse_status
            }).eq("horse_id", horse_id).execute()

        # ---------------- Handle New Treatments ----------------
        treatments_raw = safe_get("treatments")
        treatment_records = []

        if treatments_raw:
            try:
                treatments = json.loads(treatments_raw)
                for t in treatments:
                    treatment_records.append({
                        "treatment_id": str(uuid.uuid4()),
                        "medrec_id": medrec_id,
                        "treatment_name": t.get("medication"),
                        "treatment_dosage": t.get("dosage"),
                        "treatment_duration": t.get("duration"),
                        "treatment_outcome": t.get("outcome", "ongoing"),
                    })
                if treatment_records:
                    supabase.table("horse_treatment").insert(treatment_records).execute()
            except Exception as e:
                print(f"⚠️ Failed to process treatments: {e}")

        # ---------------- Update Existing Treatment Outcomes ----------------
        treatment_outcomes_raw = safe_get("treatmentOutcomes")
        if treatment_outcomes_raw:
            try:
                treatment_outcomes = json.loads(treatment_outcomes_raw)
                for treatment_id, outcome in treatment_outcomes.items():
                    supabase.table("horse_treatment").update({
                        "treatment_outcome": outcome
                    }).eq("treatment_id", treatment_id).execute()
            except Exception as e:
                print(f"⚠️ Failed to update treatment outcomes: {e}")

        # ---------------- Update Schedule Availability ----------------
        if schedule_id:
            try:
                supabase.table("schedule_slots").update({
                    "available": False
                }).eq("id", schedule_id).execute()
            except Exception as e:
                print(f"⚠️ Failed to update schedule availability: {e}")

        print(f"🎉 [DEBUG] SUCCESS: Created follow-up record {medrec_id}")

        # ✅ Success Response
        return Response({
            "message": "Follow-up record created successfully",
            "medrec_id": medrec_id,
            "lab_files_urls": lab_files_urls,
            "treatments_added": len(treatment_records),
            "horse_status": horse_status,
            "followup_date": followup_date,
            "followup_time": followup_time,
        }, status=201)

    except Exception as e:
        import logging
        logging.exception("❌ Error in create_followup_record")
        return Response({"error": str(e)}, status=500)

# -------------------- UPDATE TREATMENT OUTCOME --------------------
@api_view(["PATCH"])
@login_required
def update_treatment_outcome(request, treatment_id):
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        # Get the outcome from request data
        outcome = request.data.get('outcome')
        
        if not outcome:
            return Response({"error": "Outcome is required"}, status=400)

        # Validate outcome value
        valid_outcomes = ['ongoing', 'completed', 'discontinued', 'cancelled']
        if outcome not in valid_outcomes:
            return Response({"error": f"Invalid outcome. Must be one of: {', '.join(valid_outcomes)}"}, status=400)

        # Update the treatment outcome
        update_res = supabase.table("horse_treatment").update({
            "treatment_outcome": outcome,
            "updated_at": datetime.datetime.now().isoformat()
        }).eq("treatment_id", treatment_id).execute()

        if not update_res.data:
            return Response({"error": "Treatment not found or update failed"}, status=404)

        return Response(
            {
                "message": "Treatment outcome updated successfully",
                "treatment_id": treatment_id,
                "outcome": outcome
            },
            status=200
        )

    except Exception as e:
        import logging
        logging.exception(f"Error updating treatment outcome for {treatment_id}")
        return Response({"error": str(e)}, status=500)
    
# --------------------- CHECK FOLLOWUP RECORD---------------
@api_view(["GET"])
@login_required
def check_followup_record(request, parent_medrec_id):
    """
    Check if a follow-up record already exists for a given parent medical record ID
    """
    try:
        print(f"🔍 Checking follow-up records for parent_medrec_id: {parent_medrec_id}")
        
        
        res = supabase.table("horse_medical_record")\
            .select("medrec_id")\
            .eq("parent_medrec_id", parent_medrec_id)\
            .execute()
        
        followup_exists = len(res.data) > 0 if res.data else False
        
        print(f"✅ Follow-up exists: {followup_exists} for parent_medrec_id: {parent_medrec_id}")
        
        return Response({
            "followup_exists": followup_exists,
            "parent_medrec_id": parent_medrec_id,
            "count": len(res.data) if res.data else 0
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ Error checking follow-up record: {str(e)}")
        traceback.print_exc()
        return Response({"error": f"Error checking follow-up record: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --------------------- GET FOLLOWUP RECORDS ---------------
@api_view(["GET"])
@login_required
def get_followup_records(request, parent_medrec_id):
    """
    Get all follow-up records for a given parent medical record ID
    """
    try:
        print(f"🔍 Getting follow-up records for parent_medrec_id: {parent_medrec_id}")
        
        res = supabase.table("horse_medical_record")\
            .select(
                """
                *,
                vet_profile:medrec_vet_id(
                    vet_fname,
                    vet_mname,
                    vet_lname
                )
                """
            )\
            .eq("parent_medrec_id", parent_medrec_id)\
            .order("medrec_date", desc=True)\
            .execute()
        
        followup_records = []
        for record in res.data if res.data else []:
            # Format the follow-up record similar to parent records
            vet = record.get("vet_profile") or {}
            vet_name = " ".join(filter(None, [
                vet.get("vet_fname"),
                vet.get("vet_mname"),
                vet.get("vet_lname")
            ])).strip() or "Unknown Veterinarian"

            # Process lab images similar to parent records
            lab_images = record.get("medrec_lab_img") or []
            processed_lab_images = []
            
            if isinstance(lab_images, list):
                for lab_image_url in lab_images:
                    if lab_image_url:
                        if not lab_image_url.startswith(('http://', 'https://')):
                            filename = lab_image_url.split('/')[-1] if '/' in lab_image_url else lab_image_url
                            lab_image_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{filename}"
                        processed_lab_images.append(lab_image_url)
            elif lab_images:
                lab_image_url = lab_images
                if not lab_image_url.startswith(('http://', 'https://')):
                    filename = lab_image_url.split('/')[-1] if '/' in lab_image_url else lab_image_url
                    lab_image_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{filename}"
                processed_lab_images.append(lab_image_url)

            formatted_record = {
                "id": record.get("medrec_id"),
                "date": record.get("medrec_date"),
                "followUpDate": record.get("medrec_followup_date"),
                "parentMedrecId": record.get("parent_medrec_id"),
                "heartRate": record.get("medrec_heart_rate"),
                "respRate": record.get("medrec_resp_rate"),
                "temperature": record.get("medrec_body_temp"),
                "clinicalSigns": record.get("medrec_clinical_signs"),
                "diagnosticProtocol": record.get("medrec_diagnostic_protocol"),
                "labResult": record.get("medrec_lab_results"),
                "labImages": processed_lab_images,
                "diagnosis": record.get("medrec_diagnosis"),
                "prognosis": record.get("medrec_prognosis"),
                "recommendation": record.get("medrec_recommendation"),
                "horseStatus": record.get("medrec_horsestatus"),
                "veterinarian": vet_name,
            }
            followup_records.append(formatted_record)
        
        print(f"✅ Found {len(followup_records)} follow-up records for parent_medrec_id: {parent_medrec_id}")
        
        return Response({
            "followup_records": followup_records,
            "parent_medrec_id": parent_medrec_id,
            "count": len(followup_records)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ Error getting follow-up records: {str(e)}")
        traceback.print_exc()
        return Response({"error": f"Error getting follow-up records: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -------------------------------------------- VETERINARIAN SCHEDULE MANAGEMENT -------------------------------------
def convert_to_24h(time_str):
    """Convert 'HH:MM AM/PM' to 'HH:MM' (24-hour format)."""
    return datetime.strptime(time_str, "%I:%M %p").strftime("%H:%M")


def get_weekday_number(day_name):
    """Map weekday names to Python weekday numbers (Mon=0 ... Sun=6)."""
    days = {
        "Monday": 0, "Tuesday": 1, "Wednesday": 2,
        "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6
    }
    return days.get(day_name, -1)


def delete_past_unbooked_slots(vet_id):
    """🧹 Delete ONLY past UNBOOKED appointment slots. KEEP booked ones."""
    today = date.today().isoformat()
    try:
        # Get all schedule IDs for this vet
        schedule_res = supabase.table("vet_schedule") \
            .select("sched_id") \
            .eq("vet_id", vet_id) \
            .execute()
        
        schedule_ids = [sched["sched_id"] for sched in schedule_res.data] if schedule_res.data else []
        
        if not schedule_ids:
            print(f"⚠️ No schedules found for vet_id={vet_id}")
            return 0
        
        # Delete ONLY unbooked past slots
        response = supabase.table("appointment_slot") \
            .delete() \
            .in_("sched_id", schedule_ids) \
            .lte("slot_date", today) \
            .eq("is_booked", False) \
            .execute()
            
        deleted_count = len(response.data) if response.data else 0
        print(f"🗑️ Deleted {deleted_count} past UNBOOKED slots for vet_id={vet_id}")
        return deleted_count
        
    except Exception as e:
        print("⚠️ Error deleting past unbooked slots:", e)
        return 0

def generate_slots_for_schedule(sched_id, day_of_week, start_time, end_time, slot_duration):
    """
    Legacy function - now calls generate_slots_for_year for backward compatibility
    """
    print(f"⚠️ Using legacy function, switching to yearly generation")
    generate_slots_for_year(sched_id, day_of_week, start_time, end_time, slot_duration)
def generate_slots_for_year(sched_id, day_of_week, start_time, end_time, slot_duration):
    """
    Generate or update appointment slots for all occurrences of a specific weekday for 1 year.
    Preserves booked slots and avoids duplicates.
    """
    try:
        today = date.today()
        start_date = today + timedelta(days=1)
        end_date = start_date + timedelta(days=365)

        day_map = {"Monday":0,"Tuesday":1,"Wednesday":2,"Thursday":3,"Friday":4,"Saturday":5,"Sunday":6}
        target_weekday = day_map.get(day_of_week)
        if target_weekday is None:
            print(f"❌ Invalid day: {day_of_week}")
            return

        start_minutes = start_time.hour * 60 + start_time.minute
        end_minutes = end_time.hour * 60 + end_time.minute
        if end_minutes <= start_minutes:
            print(f"❌ Invalid time range {start_time}-{end_time}")
            return

        # Fetch existing slots for this schedule and day
        existing_slots_res = supabase.table("appointment_slot") \
            .select("slot_id, slot_date, start_time, end_time, is_booked") \
            .eq("sched_id", sched_id) \
            .gte("slot_date", start_date.isoformat()) \
            .execute()

        existing_slots = existing_slots_res.data if existing_slots_res.data else []

        existing_map = {
            (s["slot_date"], s["start_time"], s["end_time"]): s
            for s in existing_slots
        }

        slots_to_insert = []
        slots_to_update = []

        current_date = start_date

        while current_date <= end_date:
            if current_date.weekday() == target_weekday:
                date_str = current_date.isoformat()
                slot_start_minute = start_minutes

                while slot_start_minute + slot_duration <= end_minutes:
                    # Skip lunch break 12:00–13:00
                    if 720 <= slot_start_minute < 780:
                        slot_start_minute = 780
                        continue

                    slot_end_minute = slot_start_minute + slot_duration
                    slot_start = f"{slot_start_minute//60:02d}:{slot_start_minute%60:02d}:00"
                    slot_end = f"{slot_end_minute//60:02d}:{slot_end_minute%60:02d}:00"

                    key = (date_str, slot_start, slot_end)
                    if key in existing_map:
                        # Slot exists: update only if not booked
                        slot = existing_map[key]
                        if not slot["is_booked"]:
                            slots_to_update.append({
                                "slot_id": slot["slot_id"],
                                "start_time": slot_start,
                                "end_time": slot_end
                            })
                    else:
                        slots_to_insert.append({
                            "sched_id": sched_id,
                            "slot_date": date_str,
                            "start_time": slot_start,
                            "end_time": slot_end,
                            "is_booked": False
                        })

                    slot_start_minute += slot_duration

                current_date += timedelta(days=7)
            else:
                current_date += timedelta(days=1)

        # Batch insert new slots
        if slots_to_insert:
            batch_size = 500
            for i in range(0, len(slots_to_insert), batch_size):
                supabase.table("appointment_slot").insert(slots_to_insert[i:i + batch_size]).execute()

        # Batch update existing slots (if needed)
        for slot in slots_to_update:
            supabase.table("appointment_slot").update({
                "start_time": slot["start_time"],
                "end_time": slot["end_time"]
            }).eq("slot_id", slot["slot_id"]).execute()

        print(f"✅ Generated {len(slots_to_insert)} new slots, updated {len(slots_to_update)} slots for {day_of_week}")

    except Exception as e:
        print(f"❌ Error generating slots for {day_of_week}: {e}")
        import traceback
        traceback.print_exc()

def slot_exists(sched_id, slot_date, start_time, end_time):
    """Check if slot exists – SAFE version"""
    try:
        res = supabase.table("appointment_slot") \
            .select("slot_id") \
            .eq("sched_id", sched_id) \
            .eq("slot_date", slot_date) \
            .eq("start_time", start_time) \
            .eq("end_time", end_time) \
            .execute()
        return len(res.data) > 0
    except:
        return False

@api_view(["POST"])
@login_required
def add_schedule(request):
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    schedules = request.data.get("schedules", [])
    if not schedules:
        return Response({"error": "No schedules provided"}, status=400)

    try:
        # Get existing schedules for this vet
        existing_res = supabase.table("vet_schedule").select("*").eq("vet_id", vet_id).execute()
        existing_schedules = existing_res.data if existing_res.data else []

        # Convert existing to dict by day for fast check
        existing_by_day = {s["day_of_week"]: s for s in existing_schedules}

        keep_ids = []
        response_entries = []

        # Track days already processed in this request to prevent duplicates
        processed_days = set()

        for sched in schedules:
            day = sched.get("day_of_week")
            start_time = convert_to_24h(sched.get("startTime"))
            end_time = convert_to_24h(sched.get("endTime"))
            slot_duration = int(sched.get("slot_duration", 60))

            if not all([day, start_time, end_time]):
                continue

            # Skip if this day is already processed in this request
            if day in processed_days:
                continue
            processed_days.add(day)

            # CASE 1: Day already exists in DB
            if day in existing_by_day:
                existing = existing_by_day[day]
                sched_id = existing["sched_id"]

                # Check for booked slots
                future_slots = supabase.table("appointment_slot") \
                    .select("slot_id, is_booked") \
                    .eq("sched_id", sched_id) \
                    .gte("slot_date", date.today().isoformat()) \
                    .execute()

                booked = [s["slot_id"] for s in future_slots.data if s["is_booked"]]

                if booked:
                    # BOOKED: update only times, set unavailable
                    supabase.table("vet_schedule").update({
                        "start_time": start_time,
                        "end_time": end_time,
                        "slot_duration": slot_duration,
                        "is_available": False
                    }).eq("sched_id", sched_id).execute()
                    start_t = datetime.strptime(start_time, "%H:%M").time()
                    end_t = datetime.strptime(end_time, "%H:%M").time()
                    generate_slots_for_year(sched_id, day, start_t, end_t, slot_duration)
                else:
                    # NOT BOOKED: delete old slots & regenerate
                    supabase.table("appointment_slot").delete().eq("sched_id", sched_id).execute()
                    supabase.table("vet_schedule").update({
                        "start_time": start_time,
                        "end_time": end_time,
                        "slot_duration": slot_duration,
                        "is_available": True
                    }).eq("sched_id", sched_id).execute()
                    start_t = datetime.strptime(start_time, "%H:%M").time()
                    end_t = datetime.strptime(end_time, "%H:%M").time()
                    generate_slots_for_year(sched_id, day, start_t, end_t, slot_duration)

                keep_ids.append(sched_id)
                response_entries.append({
                    "sched_id": sched_id,
                    "day_of_week": day,
                    "start_time": start_time,
                    "end_time": end_time,
                    "slot_duration": slot_duration,
                    "is_available": False if booked else True
                })

            # CASE 2: New day -> insert new record
            else:
                sched_id = str(uuid.uuid4())
                supabase.table("vet_schedule").insert({
                    "sched_id": sched_id,
                    "vet_id": vet_id,
                    "day_of_week": day,
                    "start_time": start_time,
                    "end_time": end_time,
                    "slot_duration": slot_duration,
                    "is_available": True
                }).execute()
                start_t = datetime.strptime(start_time, "%H:%M").time()
                end_t = datetime.strptime(end_time, "%H:%M").time()
                generate_slots_for_year(sched_id, day, start_t, end_t, slot_duration)

                keep_ids.append(sched_id)
                response_entries.append({
                    "sched_id": sched_id,
                    "day_of_week": day,
                    "start_time": start_time,
                    "end_time": end_time,
                    "slot_duration": slot_duration,
                    "is_available": True
                })

        # DELETE OLD DAYS NOT IN NEW INPUT
        for existing in existing_schedules:
            if existing["sched_id"] not in keep_ids:
                sched_id = existing["sched_id"]

                # Only delete if no booked slots
                future_slots = supabase.table("appointment_slot") \
                    .select("slot_id, is_booked") \
                    .eq("sched_id", sched_id) \
                    .gte("slot_date", date.today().isoformat()) \
                    .execute()
                booked = [s["slot_id"] for s in future_slots.data if s["is_booked"]]

                if not booked:
                    supabase.table("appointment_slot").delete().eq("sched_id", sched_id).execute()
                    supabase.table("vet_schedule").delete().eq("sched_id", sched_id).execute()

        return Response({
            "message": "Schedule updated successfully",
            "schedules": response_entries
        }, status=201)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)


# -------------------- GET VET SCHEDULES --------------------
def convert_to_ampm(time_val):
    """
    Convert time value to 'HH:MM AM/PM'.
    Accepts either string ('HH:MM:SS') or datetime.time object.
    """
    try:
        if isinstance(time_val, str):
            parts = time_val.split(":")[0:2]
            time_str = ":".join(parts)
            dt = datetime.strptime(time_str, "%H:%M")
        elif isinstance(time_val, time):
            dt = datetime.combine(date.today(), time_val)
        else:
            print(f"convert_to_ampm: Unexpected type {type(time_val)}")
            return str(time_val)
        return dt.strftime("%I:%M %p")
    except Exception as e:
        print(f"Error converting time: {time_val}, Exception: {e}")
        return str(time_val)

@api_view(["GET"])
@login_required
def get_schedules(request):
    """
    Get schedules AND AUTOMATICALLY ENSURE SLOTS EXIST
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch all weekly schedules for this vet
        res = supabase.table("vet_schedule")\
            .select("day_of_week, start_time, end_time, slot_duration, is_available")\
            .eq("vet_id", vet_id)\
            .execute()

        schedules = res.data or []

        # 🚀 AUTOMATIC: If vet has a schedule, ensure slots exist
        if schedules:
            
            # Check if we have enough future slots
            future_slots_res = supabase.table("appointment_slot")\
                .select("slot_id", count="exact")\
                .in_("sched_id", [s["sched_id"] for s in schedules if "sched_id" in s])\
                .gte("slot_date", date.today().isoformat())\
                .execute()

        formatted_schedules = []
        for s in schedules:
            try:
                formatted_schedules.append({
                    "day_of_week": s["day_of_week"],
                    "startTime": convert_to_ampm(s["start_time"]),
                    "endTime": convert_to_ampm(s["end_time"]),
                    "slot_duration": s.get("slot_duration", 60),
                    "is_available": s.get("is_available", True)
                })
            except Exception as e:
                print("Error formatting schedule:", s, e)

        return Response({"schedules": formatted_schedules}, status=200)

    except Exception as e:
        print("Unexpected error in get_schedules:", e)
        return Response({"error": str(e)}, status=500)


@api_view(["PUT"])
@login_required
def update_schedule_availability(request):
    """
    Mark appointment slot as booked when selected for follow-up.
    """
    slot_id = request.data.get("schedule_id")  # Frontend sends "schedule_id"
    
    if not slot_id:
        return Response({"error": "Slot ID is required"}, status=400)

    try:
        # First check if the slot exists
        check_res = supabase.table("appointment_slot") \
            .select("*") \
            .eq("slot_id", slot_id) \
            .execute()

        if not check_res.data:
            return Response({"error": f"Slot with ID {slot_id} not found"}, status=404)
        
        # Update the slot to mark as booked
        update_res = supabase.table("appointment_slot") \
            .update({
                "is_booked": True
            }) \
            .eq("slot_id", slot_id) \
            .execute()

        if update_res.data:
            return Response({
                "message": "Slot booked successfully",
                "slot_id": slot_id,
                "is_booked": True
            }, status=200)
        else:
            # Check if the update actually failed
            # Sometimes supabase returns empty data even on success
            # Let's verify by fetching the updated record
            verify_res = supabase.table("appointment_slot") \
                .select("is_booked") \
                .eq("slot_id", slot_id) \
                .execute()
            
            if verify_res.data and verify_res.data[0].get("is_booked"):
                return Response({
                    "message": "Slot booked successfully",
                    "slot_id": slot_id,
                    "is_booked": True
                }, status=200)
            else:
                return Response({"error": "Failed to update slot"}, status=500)

    except Exception as e:
        print(f"Error booking slot: {str(e)}")
        return Response({"error": f"Internal server error: {str(e)}"}, status=500)
            
def convert_to_ampm(time_val):
    """
    Convert time value to 'HH:MM AM/PM'.
    Accepts either string ('HH:MM:SS') or datetime.time object.
    """
    try:
        if isinstance(time_val, str):
            parts = time_val.split(":")[0:2]
            time_str = ":".join(parts)
            dt = datetime.strptime(time_str, "%H:%M")
        elif isinstance(time_val, time):
            dt = datetime.combine(date.today(), time_val)
        else:
            return str(time_val)
        return dt.strftime("%I:%M %p")
    except Exception:
        return str(time_val)


@api_view(["GET"])
@login_required
def get_all_schedules(request):
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Get vet_schedule IDs
        schedule_res = supabase.table("vet_schedule") \
            .select("sched_id") \
            .eq("vet_id", vet_id) \
            .execute()
        
        schedule_ids = [sched["sched_id"] for sched in schedule_res.data or []]
        
        if not schedule_ids:
            return Response({"schedule_slots": []}, status=200)
        
        # Get appointment slots (only future dates)
        today = datetime.now().date().isoformat()
        
        res = supabase.table("appointment_slot") \
            .select("slot_id, sched_id, slot_date, start_time, end_time, is_booked") \
            .in_("sched_id", schedule_ids) \
            .gte("slot_date", today) \
            .order("slot_date") \
            .execute()

        slots = res.data or []
        schedule_slots = []

        for slot in slots:
            # Skip if booked
            if slot.get("is_booked", False):
                continue
                
            schedule_slots.append({
                "id": slot.get("slot_id"),
                "date": slot.get("slot_date"),
                "startTime": convert_to_ampm(slot.get("start_time")),
                "endTime": convert_to_ampm(slot.get("end_time")),
                "available": True,
                "pending": False,
                "operator_name": None,
                "slot_id": slot.get("slot_id"),
                "sched_id": slot.get("sched_id")
            })

        return Response({"schedule_slots": schedule_slots}, status=200)

    except Exception as e:
        print(f"Error fetching schedules: {str(e)}")
        # Return empty array instead of error for frontend
        return Response({"schedule_slots": []}, status=200)      
            
# -------------------- GET ALL MEDICAL RECORDS ACCESSIBLE TO VET --------------------
@api_view(["GET"])
@login_required
def get_medrec_access(request):
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Helper to format date to MM-DD-YYYY
        def format_date_mmddyyyy(date_str):
            try:
                return datetime.strptime(str(date_str)[:10], "%Y-%m-%d").strftime("%m-%d-%Y")
            except Exception:
                return str(date_str)[:10] if date_str else None

        # Step 1: Get all access requests for this vet
        res = supabase.table("medrec_access_request").select(
            """
            *,
            horse_profile:horse_id(
                horse_name,
                horse_breed,
                horse_age,
                op_id
            )
            """
        ).eq("vet_id", vet_id).order("requested_at", desc=True).execute()

        if not res.data:
            return Response({"records": []}, status=200)

        records = []
        for req in res.data:
            horse = req.get("horse_profile") or {}
            owner_name = "Unknown Owner"

            # Step 2: Fetch owner info if op_id exists
            op_id = horse.get("op_id")
            if op_id:
                owner_res = supabase.table("horse_op_profile").select("*").eq("op_id", op_id).execute()
                owner = owner_res.data[0] if owner_res.data else {}
                owner_name = " ".join(filter(None, [
                    owner.get("op_fname"),
                    owner.get("op_mname"),
                    owner.get("op_lname")
                ])).strip() or "Unknown Owner"

            records.append({
                "id": str(req.get("request_id")),
                "horseId": str(req.get("horse_id")),
                "horseName": horse.get("horse_name"),
                "horseBreed": horse.get("horse_breed"),
                "horseAge": horse.get("horse_age"),
                "ownerName": owner_name,
                "accessDate": format_date_mmddyyyy(req.get("requested_at")),
                "status": req.get("request_status"),
                "approvedAt": format_date_mmddyyyy(req.get("approved_at")),
                "approvedBy": str(req.get("approved_by")) if req.get("approved_by") else None,
                "note": req.get("note")
            })

        return Response({"records": records}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


#-----------------CHANGE PASSWORD-------------------------
@api_view(["POST"])
@login_required
def change_password(request):
    """
    Change the password for the logged-in Kutsero President
    """
    try:
        # Get JWT token from cookies
        token = request.COOKIES.get("access_token")
        if not token:
            return Response({"error": "Authentication required"}, status=401)

        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            return Response({"error": "Invalid token: no user_id"}, status=401)

        # Get current and new passwords from request
        current_password = request.data.get("current_password", "").strip()
        new_password = request.data.get("new_password", "").strip()

        errors = {}
        if not current_password:
            errors["current_password"] = "Current password is required."
        if not new_password:
            errors["new_password"] = "New password is required."
        if errors:
            return Response({"errors": errors}, status=400)

        # ✅ Fetch the user's email from Supabase Admin API
        user_info = supabase.auth.admin.get_user_by_id(user_id)
        if not user_info.user or not user_info.user.email:
            return Response({"error": "Unable to fetch user email."}, status=500)

        vet_email = user_info.user.email

        # ✅ Verify current password using Supabase REST endpoint with SERVICE_ROLE_KEY
        resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                "Content-Type": "application/json"
            },
            json={"email": vet_email, "password": current_password}
        )
        verify_data = resp.json()
        if resp.status_code != 200 or "access_token" not in verify_data:
            return Response({"errors": {"current_password": "Incorrect current password"}}, status=400)

        # ✅ Update password using Admin API
        supabase.auth.admin.update_user_by_id(user_id, {"password": new_password})

        return Response({"message": "Password updated successfully"})

    except Exception as e:
        return Response({"error": f"Unexpected server error: {str(e)}"}, status=500)

# -------------------- VET SERVICES MANAGEMENT --------------------
PREDEFINED_SERVICES = [
    {"name": "General Check-up", "description": "Routine health assessment and physical examination"},
    {"name": "Vaccination", "description": "Immunization against common horse diseases"},
    {"name": "Deworming", "description": "Treatment and prevention of internal parasites"},
    {"name": "Medication / Treatment", "description": "Administering prescribed medicines or first aid"},
    {"name": "Laboratory Test", "description": "Blood test, fecal exam, or other diagnostic services"},
    {"name": "Dental Care", "description": "Floating or filing of horse teeth"},
    {"name": "Hoof Care", "description": "Minor hoof treatments and health maintenance"},
    {"name": "Breeding Consultation", "description": "Fertility check, mating advice, or reproductive exams"},
    {"name": "Emergency Visit", "description": "On-site emergency care for injured or sick horses"},
    {"name": "Post-treatment Monitoring", "description": "Scheduled check-up after medication or surgery"},
    {"name": "Surgery", "description": "Surgical procedures and operations"},
    {"name": "Lameness Evaluation", "description": "Assessment and diagnosis of lameness issues"},
    {"name": "Chiropractic Care", "description": "Spinal adjustment and musculoskeletal therapy"},
    {"name": "Acupuncture", "description": "Traditional Chinese medicine treatment"},
    {"name": "Ultrasound", "description": "Diagnostic imaging using ultrasound technology"},
    {"name": "X-ray Imaging", "description": "Radiographic examination and imaging"},
    {"name": "Nutrition Consultation", "description": "Diet planning and nutritional advice"},
    {"name": "Behavioral Consultation", "description": "Assessment and advice for behavioral issues"},
    {"name": "Pre-purchase Examination", "description": "Comprehensive health check before horse purchase"},
    {"name": "Geriatric Care", "description": "Specialized care for older horses"}
]

@api_view(['GET'])
@login_required
def get_vet_services(request):
    """Get all services for the logged-in veterinarian"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        # Fetch all services for this vet
        res = supabase.table("vet_services")\
            .select("*")\
            .eq("vet_id", vet_id)\
            .order("created_at", desc=True)\
            .execute()

        services = res.data or []
        
        return Response({
            "success": True,
            "services": services,
            "predefined_services": PREDEFINED_SERVICES
        }, status=200)

    except Exception as e:
        print(f"Error fetching vet services: {str(e)}")
        return Response({"error": "Failed to fetch services"}, status=500)

@api_view(['POST'])
@login_required
def create_vet_service(request):
    """Create a new service for the logged-in veterinarian"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        data = request.data
        
        # Validate required fields
        service_name = data.get('service_name', '').strip()
        if not service_name:
            return Response({"error": "Service name is required"}, status=400)

        # Create new service
        service_data = {
            "service_id": str(uuid.uuid4()),
            "vet_id": vet_id,
            "service_name": service_name,
            "description": data.get('description', '').strip(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        res = supabase.table("vet_services").insert(service_data).execute()
        
        if not res.data:
            return Response({"error": "Failed to create service"}, status=500)

        return Response({
            "success": True,
            "message": "Service created successfully",
            "service": res.data[0]
        }, status=201)

    except Exception as e:
        print(f"Error creating vet service: {str(e)}")
        return Response({"error": "Failed to create service"}, status=500)

@api_view(['DELETE'])
@login_required
def delete_vet_service(request, service_id):
    """Delete a service"""
    try:
        vet_id = get_current_vet_id(request)
        if not vet_id:
            return Response({"error": "Unauthorized"}, status=401)

        # Verify the service belongs to this vet
        check_res = supabase.table("vet_services")\
            .select("*")\
            .eq("service_id", service_id)\
            .eq("vet_id", vet_id)\
            .execute()

        if not check_res.data:
            return Response({"error": "Service not found or access denied"}, status=404)

        # Delete service
        res = supabase.table("vet_services")\
            .delete()\
            .eq("service_id", service_id)\
            .eq("vet_id", vet_id)\
            .execute()

        return Response({
            "success": True,
            "message": "Service deleted successfully"
        }, status=200)

    except Exception as e:
        print(f"Error deleting vet service: {str(e)}")
        return Response({"error": "Failed to delete service"}, status=500)