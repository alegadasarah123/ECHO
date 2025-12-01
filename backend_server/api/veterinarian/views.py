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
        
# -------------------- GET APPROVED APPOINTMENTS WITH FOLLOWUPS --------------------
@api_view(["GET"])
@login_required
def get_approved_appointments(request):
    """
    Returns all approved appointments for the logged-in veterinarian
    WITHOUT any follow-up data
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        # Fetch approved appointments with horse details
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
        ).eq("vet_id", vet_id).eq("app_status", "approved").execute()

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

            # NO FOLLOW-UP LOGIC - just return appointment data
            appointments.append({
                "app_id": app.get("app_id"),
                "app_service": app.get("app_service"),
                "app_date": formatted_app_date,
                "app_time": app.get("app_time"),
                "app_complain": app.get("app_complain"),
                "horse_name": horse.get("horse_name", ""),
                "horse_breed": horse.get("horse_breed", ""),
                "horse_age": horse.get("horse_age", ""),
                "operator_name": operator_name,
                "operator_phone": operator.get("op_phone_num", ""),
                "horse_id": horse.get("horse_id"),
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
    import traceback
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

            # 🚨 FIXED: Handle ARRAY of lab image URLs
            lab_images = record.get("medrec_lab_img") or []
            processed_lab_images = []
            
            if isinstance(lab_images, list):
                for lab_image_url in lab_images:
                    if lab_image_url:
                        # If the URL doesn't have the full Supabase URL, construct it
                        if not lab_image_url.startswith(('http://', 'https://')):
                            # Extract filename from the URL if it's just a path
                            filename = lab_image_url.split('/')[-1] if '/' in lab_image_url else lab_image_url
                            lab_image_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{filename}"
                        processed_lab_images.append(lab_image_url)
                print(f"[DEBUG] Found {len(processed_lab_images)} lab files: {processed_lab_images}")
            elif lab_images:  # Handle legacy single URL case
                lab_image_url = lab_images
                if not lab_image_url.startswith(('http://', 'https://')):
                    filename = lab_image_url.split('/')[-1] if '/' in lab_image_url else lab_image_url
                    lab_image_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{filename}"
                processed_lab_images.append(lab_image_url)
                print(f"[DEBUG] Found single lab file: {processed_lab_images}")

            formatted_records.append({
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
            })

        return Response({"medicalRecords": formatted_records}, status=200)

    except Exception as e:
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)
    
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

        # 🧠 Utility: safely handle empty/nullable inputs
        def safe_get(field):
            val = request.POST.get(field)
            return val if val not in [None, "", "null"] else None

        # 🆕 Fields
        horse_status = safe_get("healthStatus")
        followup_date = safe_get("followUpDate")
        followup_time = safe_get("followUpTime")

        # ✅ Validate
        if not horse_id or not app_id:
            return Response({"error": "Missing horse_id or app_id"}, status=400)

        # 🚨 DUPLICATE CHECK: Check if we already processed this request
        today = date.today().isoformat()
        existing = supabase.table("horse_medical_record").select("medrec_id").eq(
            "medrec_horse_id", horse_id
        ).eq("medrec_vet_id", vet_id).eq("medrec_date", today).execute()
        
        if existing.data:
            print(f"🚨 [DEBUG] DUPLICATE DETECTED: Record already exists for today")
            return Response({"error": "Medical record for this horse already created today"}, status=400)

        # ---------------- Handle Multiple Lab Files Upload ----------------
        lab_files_urls = []
        
        # Handle multiple files from FormData
        lab_files = request.FILES.getlist('lab_files')
        
        print(f"[DEBUG] Number of lab files received: {len(lab_files)}")
        
        for lab_file in lab_files:
            try:
                import datetime
                import random
                
                timestamp = int(datetime.datetime.now().timestamp())
                file_extension = lab_file.name.split('.')[-1] if '.' in lab_file.name else 'bin'
                file_name = f"{horse_id}_lab_{timestamp}_{random.randint(1000,9999)}.{file_extension}"
                
                # Upload the file
                upload_res = sr_client.storage.from_("Lab_results").upload(
                    file_name,
                    lab_file.read(),
                    {"content-type": lab_file.content_type, "x-upsert": "true"}
                )

                public_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{file_name}"
                
                if '?' in public_url:
                    public_url = public_url.split('?')[0]
                    
                lab_files_urls.append(public_url)
                print(f"[DEBUG] Lab file uploaded: {public_url}")
                
            except Exception as e:
                import logging
                logging.exception(f"Lab file upload failed: {e}")
                continue

        # Also handle base64 images for backward compatibility
        lab_image_base64 = safe_get("labImageBase64")
        lab_image_name = safe_get("labImageName") or "lab_image.jpg"
        lab_image_type = safe_get("labImageType") or "image/jpeg"

        if lab_image_base64:
            try:
                import base64
                
                timestamp = int(datetime.datetime.now().timestamp())
                file_extension = lab_image_name.split('.')[-1] if '.' in lab_image_name else 'jpg'
                file_name = f"{horse_id}_lab_{timestamp}_{random.randint(1000,9999)}.{file_extension}"
                
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

        # If no files were uploaded, set to None instead of empty array
        final_lab_files = lab_files_urls if lab_files_urls else None

        # 🚨 CREATE ONLY ONE RECORD
        medrec_id = str(uuid.uuid4())
        record_data = {
            "medrec_id": medrec_id,
            "medrec_horse_id": horse_id,
            "medrec_vet_id": vet_id,
            "medrec_date": safe_get("date") or today,
            "medrec_followup_date": followup_date,
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

        print(f"✅ [DEBUG] Creating ONE medical record with ID: {medrec_id}")

        # ✅ Insert medical record - ONLY ONCE
        medrec_res = supabase.table("horse_medical_record").insert(record_data).execute()
        if not medrec_res.data:
            return Response({"error": "Failed to add medical record"}, status=500)

        # 2️⃣ Sync horse_profile.horse_status with medrec_horsestatus
        if horse_status:
            supabase.table("horse_profile").update({
                "horse_status": horse_status
            }).eq("horse_id", horse_id).execute()

        # 3️⃣ Handle treatments (JSON array inside FormData)
        treatments_raw = safe_get("treatments")
        treatment_records = []

        if treatments_raw:
            try:
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

            except Exception as e:
                return Response({"error": f"Invalid treatments JSON: {str(e)}"}, status=400)

        print(f"🎉 [DEBUG] SUCCESS: Created medical record {medrec_id}")

        # ✅ Success Response
        return Response(
            {
                "message": "Medical record added successfully",
                "medrec_id": medrec_id,
                "treatments": treatment_records,
                "horse_status": horse_status,
                "lab_files_urls": lab_files_urls,
                "followup_time": followup_time,
            },
            status=201,
        )

    except Exception as e:
        print(f"❌ [DEBUG] ERROR: {str(e)}")
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

def generate_slots_for_schedule(sched_id, day_of_week, start_time, end_time, slot_duration=60):
    """
    Generate slots for one month based on vet_schedule, skipping lunch (12–1PM).
    Only for the specified day_of_week.
    """
    today = date.today()
    start_of_month = today.replace(day=1)
    next_month = (start_of_month + timedelta(days=32)).replace(day=1)
    end_of_month = next_month - timedelta(days=1)
    weekday_num = get_weekday_number(day_of_week)

    if weekday_num == -1:
        print(f"⚠️ Invalid day_of_week: {day_of_week}")
        return

    lunch_start = time(12, 0)
    lunch_end = time(13, 0)
    slots = []
    current_date = start_of_month

    while current_date <= end_of_month:
        if current_date.weekday() == weekday_num:
            current_dt = datetime.combine(current_date, start_time)
            end_dt = datetime.combine(current_date, end_time)

            while current_dt + timedelta(minutes=slot_duration) <= end_dt:
                next_dt = current_dt + timedelta(minutes=slot_duration)

                # ⏳ Skip lunch hour (12:00–13:00)
                if not (lunch_start <= current_dt.time() < lunch_end or
                        lunch_start < next_dt.time() <= lunch_end):
                    slots.append({
                        "slot_id": str(uuid.uuid4()),
                        "sched_id": sched_id,
                        "slot_date": current_date.isoformat(),
                        "start_time": current_dt.time().strftime("%H:%M:%S"),
                        "end_time": next_dt.time().strftime("%H:%M:%S"),
                        "is_booked": False
                    })
                current_dt = next_dt

        current_date += timedelta(days=1)

    if slots:
        supabase.table("appointment_slot").insert(slots).execute()
        print(f"✅ {len(slots)} slots created for {day_of_week} ({start_of_month}–{end_of_month})")
    else:
        print(f"⚠️ No slots generated for {day_of_week}")


# ✅----------------- ADD OR UPDATE SCHEDULE -----------------
# ✅----------------- ADD OR UPDATE SCHEDULE -----------------
@api_view(["POST"])
@login_required
def add_schedule(request):
    """
    WORKING SOLUTION:
    - DELETE ALL old vet_schedule records
    - DELETE UNBOOKED SLOTS that have NO appointments
    - Create new schedules
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    schedules = request.data.get("schedules", [])
    if not schedules:
        return Response({"error": "No schedules provided"}, status=400)

    try:
        # 🗑️ STEP 1: GET OLD SCHEDULE IDs
        old_schedules_res = supabase.table("vet_schedule").select("sched_id").eq("vet_id", vet_id).execute()
        old_schedule_ids = [sched["sched_id"] for sched in old_schedules_res.data] if old_schedules_res.data else []
        
        if old_schedule_ids:
            # 🚨 STEP 2: SAFELY DELETE UNBOOKED SLOTS
            today = date.today().isoformat()
            
            # Get all future slots from old schedules
            future_slots_res = supabase.table("appointment_slot").select("slot_id, is_booked").in_("sched_id", old_schedule_ids).gte("slot_date", today).execute()
            
            if future_slots_res.data:
                # Separate slots by booking status
                unbooked_slot_ids = []
                booked_slot_ids = []
                
                for slot in future_slots_res.data:
                    if slot["is_booked"] == False or slot["is_booked"] == "FALSE" or slot["is_booked"] == "false":
                        unbooked_slot_ids.append(slot["slot_id"])
                    else:
                        booked_slot_ids.append(slot["slot_id"])
                
                print(f"🔍 Found {len(unbooked_slot_ids)} unbooked slots and {len(booked_slot_ids)} booked slots")
                
                # DOUBLE CHECK: Verify unbooked slots have no appointments
                if unbooked_slot_ids:
                    appointments_check = supabase.table("appointment").select("slot_id").in_("slot_id", unbooked_slot_ids).execute()
                    slots_with_appointments = [app["slot_id"] for app in appointments_check.data] if appointments_check.data else []
                    
                    # Only delete slots that are TRULY unbooked and have NO appointments
                    safe_to_delete = [slot_id for slot_id in unbooked_slot_ids if slot_id not in slots_with_appointments]
                    
                    if safe_to_delete:
                        supabase.table("appointment_slot").delete().in_("slot_id", safe_to_delete).execute()
                        print(f"🗑️ SAFELY DELETED {len(safe_to_delete)} UNBOOKED SLOTS WITH NO APPOINTMENTS")
                    else:
                        print("✅ No safe slots to delete")
            
            # 🗑️ STEP 3: DELETE ALL OLD VET_SCHEDULE RECORDS
            supabase.table("vet_schedule").delete().eq("vet_id", vet_id).execute()
            print(f"🗑️ DELETED {len(old_schedule_ids)} OLD VET_SCHEDULE RECORDS")

        # ✅ STEP 4: CREATE NEW SCHEDULES
        entries = []
        for sched in schedules:
            day_of_week = sched.get("day_of_week")
            start_time = sched.get("startTime")
            end_time = sched.get("endTime")
            slot_duration = int(sched.get("slot_duration", 60))

            if not all([day_of_week, start_time, end_time]):
                continue

            # Convert AM/PM to 24h
            start_time_24 = convert_to_24h(start_time)
            end_time_24 = convert_to_24h(end_time)
            start_t = datetime.strptime(start_time_24, "%H:%M").time()
            end_t = datetime.strptime(end_time_24, "%H:%M").time()

            # Create new schedule
            sched_id = str(uuid.uuid4())
            res = supabase.table("vet_schedule").insert({
                "sched_id": sched_id,
                "vet_id": vet_id,
                "day_of_week": day_of_week,
                "start_time": start_time_24,
                "end_time": end_time_24,
                "slot_duration": slot_duration,
                "is_available": True
            }).execute()

            if res.data:
                entries.append(res.data[0])
                generate_slots_for_schedule(sched_id, day_of_week, start_t, end_t, slot_duration)
                print(f"✅ Created schedule for {day_of_week}")

        return Response({
            "message": "Schedule updated successfully", 
            "schedules": entries
        }, status=201)

    except Exception as e:
        print("❌ Error in add_schedule:", e)
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
    Update schedule availability status.
    """
    vet_id = get_current_vet_id(request)
    if not vet_id:
        return Response({"error": "Unauthorized"}, status=401)

    schedule_id = request.data.get("schedule_id")
    is_available = request.data.get("is_available", False)

    if not schedule_id:
        return Response({"error": "Schedule ID is required"}, status=400)

    try:
        # Verify the schedule belongs to the current vet
        schedule_res = supabase.table("vet_schedule").select("*").eq("sched_id", schedule_id).eq("vet_id", vet_id).execute()
        
        if not schedule_res.data:
            return Response({"error": "Schedule not found or access denied"}, status=404)

        # Update availability
        update_res = supabase.table("vet_schedule").update({
            "is_available": is_available
        }).eq("sched_id", schedule_id).execute()

        if update_res.data:
            return Response({
                "message": "Schedule availability updated successfully",
                "schedule_id": schedule_id,
                "is_available": is_available
            }, status=200)
        else:
            return Response({"error": "Failed to update schedule availability"}, status=500)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

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

    def safe_query(fn, retries=3, delay=0.5):
        """Retry supabase query to avoid connection termination."""
        for attempt in range(retries):
            try:
                return fn()
            except Exception as e:
                if attempt < retries - 1:
                    time.sleep(delay)
                    continue
                raise e

    try:
        res = safe_query(lambda: supabase.table("vet_schedule")
            .select("sched_id, sched_date, start_time, end_time, is_available")
            .eq("vet_id", vet_id)
            .order("sched_date")
            .execute()
        )

        schedules = res.data or []
        now = datetime.now()
        schedule_slots = []

        for s in schedules:
            sched_date = s.get("sched_date")
            start_time_val = s.get("start_time")
            end_time_val = s.get("end_time")

            # Skip past schedules
            try:
                sched_datetime = datetime.combine(
                    datetime.strptime(sched_date, "%Y-%m-%d").date(),
                    datetime.strptime(start_time_val, "%H:%M:%S").time()
                )
                if sched_datetime < now:
                    continue
            except Exception:
                continue

            # ✅ Fetch appointment linked to schedule
            app_res = safe_query(lambda: supabase.table("appointment")
                .select("app_service, app_status, horse_id")
                .eq("sched_id", s.get("sched_id"))
                .execute()
            )

            appointment = app_res.data[0] if app_res.data else None

            operator_name = None
            is_available = s.get("is_available", True)
            is_pending = False

            if appointment:
                status = appointment.get("app_status")
                if status in ["declined", "cancelled"]:
                    is_available = True
                    is_pending = False
                else:
                    is_available = False
                    is_pending = (status == "pending")

                if status not in ["declined", "cancelled"]:
                    horse_res = safe_query(lambda: supabase.table("horse_profile")
                        .select("op_id")
                        .eq("horse_id", appointment.get("horse_id"))
                        .execute()
                    )
                    horse_data = horse_res.data[0] if horse_res.data else None
                    if horse_data:
                        op_res = safe_query(lambda: supabase.table("horse_op_profile")
                            .select("op_fname, op_lname")
                            .eq("op_id", horse_data.get("op_id"))
                            .execute()
                        )
                        op_data = op_res.data[0] if op_res.data else None
                        if op_data:
                            operator_name = f"{op_data.get('op_fname')} {op_data.get('op_lname')}"

            schedule_slots.append({
                "id": s.get("sched_id"),
                "date": sched_date,
                "startTime": convert_to_ampm(start_time_val),
                "endTime": convert_to_ampm(end_time_val),
                "available": is_available,
                "pending": is_pending,
                "operator_name": operator_name,
            })

        return Response({"schedule_slots": schedule_slots}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)      
          
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