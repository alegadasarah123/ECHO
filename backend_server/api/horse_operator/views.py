# backend_server/api/horse_operator/views.py

from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from supabase import create_client, Client
from django.conf import settings
import uuid
from datetime import datetime, timedelta
import logging
import traceback
from datetime import datetime
import pytz
from django.db import transaction
import requests
from openai import OpenAI
from django.core.cache import cache
import requests
from datetime import datetime
import json
import os
from zoneinfo import ZoneInfo
from django.db import models
import base64
from io import BytesIO
from django.utils import timezone
from supabase import create_client, Client
import traceback


# Set up logging
logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

SUPABASE_SERVICE_ROLE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_ANON_KEY = settings.SUPABASE_ANON_KEY


# ------------------------------------------------ USER PROFILE API ------------------------------------------------

@api_view(['GET'])
def get_horse_operator_profile(request):
    """Get horse operator profile data"""
    user_id = request.GET.get('user_id')
    
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Fetch profile from horse_op_profile table
        service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        
        profile_query = service_client.table("horse_op_profile").select("*").eq("op_id", user_id).execute()
        
        if not profile_query.data:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        
        profile = profile_query.data[0]
        print(f"Fetched horse operator profile for user {user_id}: {profile}")
        
        return Response(profile, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"Error fetching horse operator profile: {e}")
        return Response({"error": "Failed to fetch profile", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def update_horse_operator_profile(request):
    """Update horse operator profile data with image upload to Supabase Storage"""
    try:
        op_id = request.data.get('op_id')
        
        if not op_id:
            return Response({"error": "op_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        
        # Get current profile to check for existing image
        current_profile = service_client.table("horse_op_profile").select("op_image").eq("op_id", op_id).execute()
        
        if not current_profile.data:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        
        old_image_url = current_profile.data[0].get("op_image")
        
        # Handle image upload if new image is provided
        image_base64 = request.data.get('op_image')
        new_image_url = None
        
        # Check if this is a new image (base64 data) vs existing URL
        is_new_image = False
        if image_base64:
            # Check if it's base64 data (contains data:image or is just base64)
            if 'data:image' in str(image_base64) or (len(str(image_base64)) > 200 and not str(image_base64).startswith('http')):
                is_new_image = True
        
        if is_new_image:
            try:
                import base64
                
                # Extract base64 data (remove data:image/jpeg;base64, prefix if present)
                if ',' in image_base64:
                    image_base64 = image_base64.split(',')[1]
                
                # Decode base64 to bytes
                image_bytes = base64.b64decode(image_base64)
                
                # Generate unique filename
                timestamp = int(datetime.now().timestamp() * 1000)
                random_suffix = uuid.uuid4().hex[:8]
                filename = f"{op_id}_{timestamp}_{random_suffix}.jpeg"
                
                logger.info(f"Uploading profile image to kutsero_op_profile bucket: {filename}")
                
                # Upload to Supabase Storage bucket 'kutsero_op_profile'
                upload_response = service_client.storage.from_('kutsero_op_profile').upload(
                    path=filename,
                    file=image_bytes,
                    file_options={"content-type": "image/jpeg"}
                )
                
                # Construct public URL
                new_image_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{filename}"
                
                logger.info(f"✅ Profile image uploaded successfully: {new_image_url}")
                
                # Delete old image from storage if it exists and is a storage URL
                if old_image_url and 'kutsero_op_profile/' in old_image_url:
                    try:
                        old_filename = old_image_url.split('/kutsero_op_profile/')[-1]
                        service_client.storage.from_('kutsero_op_profile').remove([old_filename])
                        logger.info(f"Deleted old profile image from storage: {old_filename}")
                    except Exception as delete_error:
                        logger.warning(f"Could not delete old profile image: {delete_error}")
                
            except Exception as upload_error:
                logger.error(f"Error uploading profile image: {upload_error}", exc_info=True)
                return Response({
                    "error": "Failed to upload profile image",
                    "detail": str(upload_error)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Build update payload from request data
        update_data = {}
        
        # Map all possible fields
        field_mappings = {
            'op_fname': request.data.get('op_fname'),
            'op_mname': request.data.get('op_mname'), 
            'op_lname': request.data.get('op_lname'),
            'op_dob': request.data.get('op_dob'),
            'op_sex': request.data.get('op_sex'),
            'op_phone_num': request.data.get('op_phone_num'),
            'op_province': request.data.get('op_province'),
            'op_city': request.data.get('op_city'),
            'op_municipality': request.data.get('op_municipality'),
            'op_brgy': request.data.get('op_brgy'),
            'op_zipcode': request.data.get('op_zipcode'),
            'op_house_add': request.data.get('op_house_add'),
            'op_routefrom': request.data.get('op_routefrom'),
            'op_routeto': request.data.get('op_routeto'),
            'op_email': request.data.get('op_email'),
            'op_fb': request.data.get('op_fb'),
        }
        
        # Only include non-None values
        for key, value in field_mappings.items():
            if value is not None:
                update_data[key] = value
        
        # Add new image URL if uploaded, otherwise keep existing URL
        if new_image_url:
            update_data['op_image'] = new_image_url
        elif image_base64 and not is_new_image:
            # Keep existing URL if no new upload
            update_data['op_image'] = image_base64
        
        if not update_data:
            return Response({"error": "No data to update"}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Updating horse operator profile for user {op_id} with data: {update_data}")
        
        # Update using Supabase
        update_response = service_client.table("horse_op_profile").update(update_data).eq("op_id", op_id).execute()
        
        if not update_response.data:
            # Cleanup uploaded image if database update fails
            if new_image_url:
                try:
                    filename = new_image_url.split('/kutsero_op_profile/')[-1]
                    service_client.storage.from_('kutsero_op_profile').remove([filename])
                    logger.info(f"Cleaned up uploaded image after error: {filename}")
                except:
                    pass
            
            return Response({"error": "Profile not found or update failed"}, status=status.HTTP_404_NOT_FOUND)
        
        updated_profile = update_response.data[0]
        logger.info(f"Profile updated successfully: {updated_profile}")
        
        return Response({
            "message": "Profile updated successfully",
            "profile": updated_profile,
            "image_uploaded": bool(new_image_url)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error updating horse operator profile: {e}", exc_info=True)
        return Response({"error": "Failed to update profile", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------ HORSE PROFILE API ------------------------------------------------

@api_view(['GET'])
def get_horse_operator_data(request):
    try:
        data = supabase.table("horse_op_profile").select("*").execute()
        return Response(data.data)
    except Exception as e:
        logger.error(f"Error fetching horse operator data: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def add_horse(request):
    """
    Add a new horse with image upload to Supabase Storage
    """
    op_id = request.data.get("user_id")
    if not op_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    # Get image data
    image_base64 = request.data.get("image")
    image_url = None
    
    # Upload image to Supabase Storage if provided
    if image_base64:
        try:
            service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            # Extract base64 data (remove data:image/jpeg;base64, prefix if present)
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            
            # Decode base64 to bytes
            import base64
            image_bytes = base64.b64decode(image_base64)
            
            # Generate unique filename
            timestamp = int(datetime.now().timestamp() * 1000)
            random_suffix = uuid.uuid4().hex[:8]
            filename = f"{op_id}_{timestamp}_{random_suffix}.jpeg"
            file_path = f"{filename}"
            
            logger.info(f"Uploading image to horse_image bucket: {file_path}")
            
            # Upload to Supabase Storage bucket 'horse_image'
            upload_response = service_client.storage.from_('horse_image').upload(
                path=file_path,
                file=image_bytes,
                file_options={"content-type": "image/jpeg"}
            )
            
            # Construct public URL
            image_url = f"{SUPABASE_URL}/storage/v1/object/public/horse_image/{file_path}"
            
            logger.info(f"✅ Image uploaded successfully: {image_url}")
            
        except Exception as upload_error:
            logger.error(f"❌ Error uploading image to storage: {upload_error}", exc_info=True)
            # Continue without image rather than failing entire request
            image_url = None

    # Prepare payload with image URL (not base64)
    payload = {
        "horse_id": str(uuid.uuid4()),
        "op_id": op_id,
        "horse_name": request.data.get("name"),
        "horse_age": request.data.get("age"),
        "horse_dob": request.data.get("dateOfBirth"),
        "horse_sex": request.data.get("sex"),
        "horse_breed": request.data.get("breed"),
        "horse_color": request.data.get("color"),
        "horse_height": request.data.get("height"),
        "horse_weight": request.data.get("weight"),
        "horse_image": image_url,  # Store URL, not base64
        "horse_status": "Healthy",  # ✅ DEFAULT STATUS
    }

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_profile").insert(payload).execute()
        
        if data.data:
            logger.info(f"✅ Horse added successfully with image URL: {image_url}")
            return Response(
                {"message": "Horse added successfully", "data": data.data},
                status=status.HTTP_201_CREATED
            )
        else:
            return Response({"error": str(data.error)}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error adding horse: {e}", exc_info=True)
        
        # Cleanup uploaded image if database insert fails
        if image_url:
            try:
                file_path = image_url.split('/horse_image/')[-1]
                service_client.storage.from_('horse_image').remove([file_path])
                logger.info(f"Cleaned up uploaded image after error: {file_path}")
            except:
                pass
        
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horses(request):
    """
    Get all horses for a user with proper image URLs
    ✅ ALREADY FILTERS OUT DECEASED HORSES - no changes needed
    """
    op_id = request.GET.get("user_id")
    if not op_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        data = supabase.table("horse_profile").select("*").eq("op_id", op_id).execute()
        
        # Format response with proper image URLs
        horses = []
        for horse in data.data:
            horse_data = {
                "horse_id": horse["horse_id"],
                "horse_name": horse["horse_name"],
                "horse_age": horse.get("horse_age"),
                "horse_dob": horse.get("horse_dob"),
                "horse_sex": horse.get("horse_sex"),
                "horse_breed": horse.get("horse_breed"),
                "horse_color": horse.get("horse_color"),
                "horse_height": horse.get("horse_height"),
                "horse_weight": horse.get("horse_weight"),
                "horse_image": horse.get("horse_image"),  # This is already the full URL
                "horse_status": horse.get("horse_status", "Unknown"),  # This field is used for filtering
                "op_id": horse["op_id"]
            }
            horses.append(horse_data)
        
        logger.info(f"Fetched {len(horses)} horses for user {op_id}")
        return Response(horses, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching horses: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    """
    Delete horse image from storage and database
    """
    try:
        user_id = request.data.get("user_id") or request.GET.get("user_id")
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get horse info
        horse_check = supabase.table("horse_profile").select("*").eq(
            "horse_id", horse_id
        ).eq("op_id", user_id).execute()
        
        if not horse_check.data:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)
        
        horse_info = horse_check.data[0]
        current_image_url = horse_info.get("horse_image")
        
        if not current_image_url:
            return Response({
                "message": "Horse already has no image",
                "horse_id": horse_id
            }, status=status.HTTP_200_OK)
        
        # Delete from storage if it's a storage URL
        if 'horse_image/' in current_image_url:
            try:
                service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
                filename = current_image_url.split('/horse_image/')[-1]
                service_client.storage.from_('horse_image').remove([filename])
                logger.info(f"Deleted image from storage: {filename}")
            except Exception as storage_error:
                logger.warning(f"Could not delete image from storage: {storage_error}")
        
        # Update database to remove image URL
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        update_result = service_client.table("horse_profile").update({
            "horse_image": None
        }).eq("horse_id", horse_id).eq("op_id", user_id).execute()
        
        if update_result.data:
            return Response({
                "message": "Image deleted successfully",
                "horse_id": horse_id,
                "horse": update_result.data[0]
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Failed to delete image"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"Error deleting horse image: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    

@api_view(['PUT'])
def update_horse(request, horse_id):
    """
    Update horse profile with image upload to Supabase Storage
    """
    try:
        # Validate horse exists
        horse_check = supabase.table("horse_profile").select("*").eq("horse_id", horse_id).execute()
        if not horse_check.data or len(horse_check.data) == 0:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)

        current_horse = horse_check.data[0]
        
        # Verify ownership
        user_id = request.data.get("user_id")
        if not user_id or current_horse["op_id"] != user_id:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        # Handle image upload if new image provided
        image_base64 = request.data.get("horse_image")
        new_image_url = None
        old_image_url = current_horse.get("horse_image")
        
        # Check if this is a new image (base64 data) vs existing URL
        is_new_image = False
        if image_base64:
            # Check if it's base64 data (contains data:image or is just base64)
            if 'data:image' in str(image_base64) or (len(str(image_base64)) > 200 and not str(image_base64).startswith('http')):
                is_new_image = True
        
        if is_new_image:
            try:
                service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
                
                # Extract base64 data (remove data:image/jpeg;base64, prefix if present)
                if ',' in image_base64:
                    image_base64 = image_base64.split(',')[1]
                
                # Decode base64 to bytes
                import base64
                image_bytes = base64.b64decode(image_base64)
                
                # Generate unique filename
                timestamp = int(datetime.now().timestamp() * 1000)
                random_suffix = uuid.uuid4().hex[:8]
                filename = f"{user_id}_{timestamp}_{random_suffix}.jpeg"
                
                logger.info(f"Uploading new image to horse_image bucket: {filename}")
                
                # Upload new image to Supabase Storage
                upload_response = service_client.storage.from_('horse_image').upload(
                    path=filename,
                    file=image_bytes,
                    file_options={"content-type": "image/jpeg"}
                )
                
                # Construct public URL
                new_image_url = f"{SUPABASE_URL}/storage/v1/object/public/horse_image/{filename}"
                
                logger.info(f"✅ New image uploaded successfully: {new_image_url}")
                
                # Delete old image from storage if it exists and is a storage URL
                if old_image_url and 'horse_image/' in old_image_url:
                    try:
                        old_filename = old_image_url.split('/horse_image/')[-1]
                        service_client.storage.from_('horse_image').remove([old_filename])
                        logger.info(f"Deleted old image from storage: {old_filename}")
                    except Exception as delete_error:
                        logger.warning(f"Could not delete old image: {delete_error}")
                
            except Exception as upload_error:
                logger.error(f"Error uploading new image: {upload_error}", exc_info=True)
                return Response({
                    "error": "Failed to upload image",
                    "detail": str(upload_error)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Build update payload
        update_payload = {}
        
        field_mapping = {
            "horse_name": "horse_name",
            "horse_age": "horse_age", 
            "horse_dob": "horse_dob",
            "horse_sex": "horse_sex",
            "horse_breed": "horse_breed",
            "horse_color": "horse_color",
            "horse_height": "horse_height",
            "horse_weight": "horse_weight",
        }

        for frontend_field, db_field in field_mapping.items():
            if frontend_field in request.data and request.data[frontend_field] is not None:
                value = request.data[frontend_field]
                if value != "":
                    update_payload[db_field] = value

        # Add new image URL if uploaded
        if new_image_url:
            update_payload["horse_image"] = new_image_url
        elif image_base64 and not is_new_image:
            # Keep existing URL if no new upload
            update_payload["horse_image"] = image_base64

        if not update_payload:
            return Response({"error": "No valid fields to update"}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"Updating horse {horse_id} with payload: {update_payload}")

        # Perform update
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        update_result = service_client.table("horse_profile").update(update_payload).eq("horse_id", horse_id).execute()

        if update_result.data and len(update_result.data) > 0:
            return Response({
                "message": "Horse profile updated successfully",
                "horse": update_result.data[0]
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Failed to update horse profile"}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error updating horse {horse_id}: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def delete_horse_image(request, horse_id):
    """
    Delete horse image from storage and database
    """
    try:
        user_id = request.data.get("user_id") or request.GET.get("user_id")
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get horse info
        horse_check = supabase.table("horse_profile").select("*").eq(
            "horse_id", horse_id
        ).eq("op_id", user_id).execute()
        
        if not horse_check.data:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)
        
        horse_info = horse_check.data[0]
        current_image_url = horse_info.get("horse_image")
        
        if not current_image_url:
            return Response({
                "message": "Horse already has no image",
                "horse_id": horse_id
            }, status=status.HTTP_200_OK)
        
        # Delete from storage if it's a storage URL
        if 'horse_image/' in current_image_url:
            try:
                service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
                filename = current_image_url.split('/horse_image/')[-1]
                service_client.storage.from_('horse_image').remove([filename])
                logger.info(f"Deleted image from storage: {filename}")
            except Exception as storage_error:
                logger.warning(f"Could not delete image from storage: {storage_error}")
        
        # Update database to remove image URL
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        update_result = service_client.table("horse_profile").update({
            "horse_image": None
        }).eq("horse_id", horse_id).eq("op_id", user_id).execute()
        
        if update_result.data:
            return Response({
                "message": "Image deleted successfully",
                "horse_id": horse_id,
                "horse": update_result.data[0]
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Failed to delete image"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"Error deleting horse image: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------ FEEDING SCHEDULE API ------------------------------------------------


def get_meal_name_from_time(time_str):
    """
    Determine meal type based on time string
    Matches the logic from the React Native frontend getMealName function
    """
    try:
        # Split time and period
        time_parts = time_str.split(' ')
        time_component = time_parts[0]
        period = time_parts[1] if len(time_parts) > 1 else 'AM'
        
        # Parse hour
        hour = int(time_component.split(':')[0])
        
        # Convert to 24-hour format
        if period.upper() == 'PM' and hour != 12:
            hour24 = hour + 12
        elif period.upper() == 'AM' and hour == 12:
            hour24 = 0
        else:
            hour24 = hour
        
        # Classify meal based on 24-hour time
        if hour24 < 10:
            return 'Breakfast'  # 12:00 AM - 9:59 AM
        elif hour24 < 16:
            return 'Lunch'      # 10:00 AM - 3:59 PM
        else:
            return 'Dinner'     # 4:00 PM - 11:59 PM
            
    except Exception as e:
        logger.error(f'Error parsing time {time_str}: {e}')
        return 'Meal'  # Default fallback


@api_view(['POST'])
def save_feeding_schedule(request):
    """
    MODIFIED: Save feeding schedule to database for notifications
    Now properly saves all meal schedules to feed_detail table
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    schedule = request.data.get("schedule")
    
    if not user_id or not horse_id or not schedule:
        return Response({"error": "user_id, horse_id, and schedule are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # First, delete existing incomplete schedules for this horse
        service_client.table("feed_detail").delete().eq(
            "op_id", user_id
        ).eq("horse_id", horse_id).eq("completed", False).execute()
        
        # Save each meal to feed_detail for notifications
        for meal in schedule:
            if not all(k in meal for k in ['time', 'food', 'amount', 'meal_type']):
                return Response({"error": "Invalid schedule format"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate unique ID for each feed detail
            fd_id = str(uuid.uuid4())
            feed_payload = {
                "fd_id": fd_id,
                "op_id": user_id,
                "horse_id": horse_id,
                "fd_time": meal.get("time"),
                "fd_food_type": meal.get("food"),
                "fd_qty": meal.get("amount"),
                "fd_meal_type": meal.get("meal_type"),
                "completed": False,
                "created_at": datetime.now().isoformat()
            }
            
            # Insert the feed detail
            insert_result = service_client.table("feed_detail").insert(feed_payload).execute()
            
            if not insert_result.data:
                logger.error(f"Failed to insert feed detail for meal: {meal}")
                return Response({"error": "Failed to save feeding schedule"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.info(f"Saved {len(schedule)} feeding schedules to database for user {user_id}, horse {horse_id}")
        
        return Response({
            "message": "Feeding schedule saved successfully for notifications",
            "saved_count": len(schedule)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error saving feeding schedule: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def update_feeding_schedule(request):
    """
    NEW: Update existing feeding schedule in database
    This is called when editing an existing meal schedule
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    fd_id = request.data.get("fd_id")
    schedule = request.data.get("schedule")
    
    if not user_id or not horse_id or not fd_id:
        return Response({"error": "user_id, horse_id, and fd_id are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if the feed schedule exists and belongs to this user
        feed_check = service_client.table("feed_detail").select("*").eq("fd_id", fd_id).execute()
        
        if not feed_check.data:
            return Response({"error": "Feed schedule not found"}, status=status.HTTP_404_NOT_FOUND)
        
        feed_schedule = feed_check.data[0]
        
        # Check if the schedule is completed
        if feed_schedule.get("completed", False):
            return Response({"error": "Cannot update completed feed schedules"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify ownership (either op_id or kutsero_id should match)
        if feed_schedule.get("op_id") != user_id and feed_schedule.get("kutsero_id") != user_id:
            return Response({"error": "Unauthorized to update this schedule"}, status=status.HTTP_403_FORBIDDEN)
        
        # Update the schedule with new data from the schedule array
        if schedule and len(schedule) > 0:
            meal = schedule[0]  # Get the first meal (should be only one for edits)
            
            update_data = {
                "fd_time": meal.get("time", feed_schedule["fd_time"]),
                "fd_food_type": meal.get("food", feed_schedule["fd_food_type"]),
                "fd_qty": meal.get("amount", feed_schedule["fd_qty"]),
                "fd_meal_type": meal.get("meal_type", feed_schedule["fd_meal_type"]),
                "updated_at": datetime.now().isoformat()
            }
            
            # Perform the update
            update_result = service_client.table("feed_detail").update(update_data).eq("fd_id", fd_id).execute()
            
            if update_result.data:
                logger.info(f"Updated feed schedule {fd_id} for user {user_id}, horse {horse_id}")
                return Response({
                    "message": "Feeding schedule updated successfully",
                    "fd_id": fd_id,
                    "updated_data": update_data
                }, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Failed to update feed schedule"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({"error": "No schedule data provided"}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"Error updating feeding schedule: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        

@api_view(['POST'])
def mark_meal_fed(request):
    """
    Mark meal as fed - FIXED VERSION
    Now properly returns fed_by information for both horse operators and kutseros
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    fd_time = request.data.get("fd_time")
    fd_meal_type = request.data.get("fd_meal_type")
    fd_food_type = request.data.get("fd_food_type")
    fd_qty = request.data.get("fd_qty")
    completed_at = request.data.get("completed_at") or datetime.now().isoformat()

    if not all([user_id, horse_id, fd_time, fd_meal_type, fd_food_type, fd_qty]):
        return Response({
            "error": "All meal details are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if meal already fed today by ANYONE
        today = datetime.now().date().isoformat()
        existing = service_client.table("feed_detail").select("fd_id, op_id, kutsero_id").eq(
            "horse_id", horse_id
        ).eq("fd_meal_type", fd_meal_type).eq("completed", True).gte(
            "completed_at", today
        ).execute()
        
        if existing.data:
            # Meal already fed - get who fed it
            fed_by = existing.data[0]
            fed_by_id = fed_by.get("op_id") or fed_by.get("kutsero_id")
            
            # Get the name of who fed it
            fed_by_name = "Another user"
            if fed_by.get("op_id"):
                op_data = supabase.table("horse_op_profile").select("op_fname, op_lname").eq("op_id", fed_by_id).execute()
                if op_data.data:
                    fed_by_name = f"{op_data.data[0].get('op_fname', '')} {op_data.data[0].get('op_lname', '')}".strip()
            elif fed_by.get("kutsero_id"):
                kutsero_data = supabase.table("kutsero_profile").select("kutsero_fname, kutsero_lname").eq("kutsero_id", fed_by_id).execute()
                if kutsero_data.data:
                    fed_by_name = f"{kutsero_data.data[0].get('kutsero_fname', '')} {kutsero_data.data[0].get('kutsero_lname', '')}".strip()
            
            logger.info(f"Meal {fd_meal_type} already fed today by {fed_by_name}")
            return Response({
                "error": f"This meal has already been fed today by {fed_by_name}",
                "already_fed": True,
                "fed_by": fed_by_name,
                "fd_id": existing.data[0]["fd_id"]
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the existing feed_detail record to update
        feed_record = service_client.table("feed_detail").select("*").eq(
            "horse_id", horse_id
        ).eq("fd_meal_type", fd_meal_type).eq("completed", False).execute()
        
        if not feed_record.data:
            return Response({
                "error": "No active feeding schedule found for this meal"
            }, status=status.HTTP_404_NOT_FOUND)
        
        feed_to_update = feed_record.data[0]
        fd_id = feed_to_update["fd_id"]
        
        # Determine user type and set correct foreign key
        user_type = None
        op_id = None
        kutsero_id = None
        user_full_name = "Unknown User"
        
        # Try horse_op_profile first
        op_check = service_client.table("horse_op_profile").select("op_id, op_fname, op_lname").eq("op_id", user_id).execute()
        
        if op_check.data:
            user_type = "op"
            op_id = user_id
            fn = op_check.data[0].get("op_fname", "")
            ln = op_check.data[0].get("op_lname", "")
            user_full_name = f"{fn} {ln}".strip()
            logger.info(f"Identified as horse operator: {user_full_name}")
        else:
            # Try kutsero_profile
            kutsero_check = service_client.table("kutsero_profile").select("kutsero_id, kutsero_fname, kutsero_lname").eq("kutsero_id", user_id).execute()
            
            if kutsero_check.data:
                user_type = "kutsero"
                kutsero_id = user_id
                fn = kutsero_check.data[0].get("kutsero_fname", "")
                ln = kutsero_check.data[0].get("kutsero_lname", "")
                user_full_name = f"{fn} {ln}".strip()
                logger.info(f"Identified as kutsero: {user_full_name}")
            else:
                return Response({
                    "error": "User not found in system. Must be a registered operator or kutsero."
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Update the existing feed_detail record
        update_data = {
            "completed": True,
            "completed_at": completed_at,
            "user_type": user_type
        }
        
        # Set the correct user ID field
        if user_type == "op":
            update_data["op_id"] = op_id
        elif user_type == "kutsero":
            update_data["kutsero_id"] = kutsero_id
        
        update_result = service_client.table("feed_detail").update(update_data).eq("fd_id", fd_id).execute()
        
        if not update_result.data:
            return Response({"error": "Failed to update feed detail record"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Get horse name
        horse_data = supabase.table("horse_profile").select("horse_name").eq("horse_id", horse_id).execute()
        horse_name = "Unknown Horse"
        if horse_data.data:
            horse_name = horse_data.data[0].get("horse_name", "Unknown Horse")

        # Insert into feed_log
        log_payload = {
            "log_id": str(uuid.uuid4()),
            "log_user_full_name": user_full_name,
            "log_date": datetime.now().date().isoformat(),
            "log_meal": fd_meal_type,
            "log_time": fd_time,
            "log_food": fd_food_type,
            "log_amount": fd_qty,
            "log_status": "Completed",
            "log_action": "Completed",
            "user_id": user_id,
            "horse_id": horse_id,
            "op_id": op_id,
            "kutsero_id": kutsero_id,
            "created_at": completed_at
        }
        service_client.table("feed_log").insert(log_payload).execute()

        logger.info(f"Meal marked as fed by {user_full_name} ({user_type}): {horse_name} - {fd_meal_type}")

        # FIXED: Return proper response with fed_by information
        return Response({
            "message": f"Meal marked as fed for {horse_name}",
            "fd_id": fd_id,
            "feed_detail_updated": True,
            "horse_name": horse_name,
            "fed_by": user_full_name,  # This is critical for frontend display
            "user_type": user_type,
            "completed": True,
            "completed_at": completed_at
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error marking meal as fed: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        

@api_view(['GET'])
def get_feeding_schedule(request):
    """
    Get feeding schedule - UPDATED TO RETURN ONLY TODAY'S SCHEDULES
    Returns today's feed_detail records for the horse (both fed and not fed)
    """
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")
    
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get today's date
        today = datetime.now().date().isoformat()
        
        # Get only today's feed_detail records for this horse
        data = supabase.table("feed_detail").select(
            "fd_id, fd_meal_type, fd_food_type, fd_qty, fd_time, completed, completed_at, op_id, kutsero_id, user_type, created_at"
        ).eq("horse_id", horse_id).gte("created_at", today).execute()
        
        # Format response with who fed it (for completed meals)
        formatted_data = []
        for record in data.data if data.data else []:
            fed_by_name = "Not fed yet"
            fed_by_id = None
            user_type = record.get("user_type", "unknown")
            
            # If meal is completed, get who fed it
            if record.get("completed") and record.get("completed_at"):
                fed_by_id = record.get("op_id") or record.get("kutsero_id")
                
                if record.get("op_id"):
                    op_data = supabase.table("horse_op_profile").select("op_fname, op_lname").eq("op_id", fed_by_id).execute()
                    if op_data.data:
                        fed_by_name = f"{op_data.data[0].get('op_fname', '')} {op_data.data[0].get('op_lname', '')}".strip()
                elif record.get("kutsero_id"):
                    kutsero_data = supabase.table("kutsero_profile").select("kutsero_fname, kutsero_lname").eq("kutsero_id", fed_by_id).execute()
                    if kutsero_data.data:
                        fed_by_name = f"{kutsero_data.data[0].get('kutsero_fname', '')} {kutsero_data.data[0].get('kutsero_lname', '')}".strip()
            
            formatted_data.append({
                "fd_id": record["fd_id"],
                "fd_meal_type": record["fd_meal_type"],
                "fd_food_type": record["fd_food_type"],
                "fd_qty": record["fd_qty"],
                "fd_time": record["fd_time"],
                "completed": record.get("completed", False),
                "completed_at": record.get("completed_at"),
                "fed_by": fed_by_name,
                "fed_by_id": fed_by_id,
                "user_type": user_type
            })
        
        return Response(formatted_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching feeding schedule: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def reset_daily_feeds(request):
    """
    Reset daily feeds - deletes today's feed_detail entries
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Delete today's completed feeds
        today = datetime.now().date().isoformat()
        service_client.table("feed_detail").delete().eq("op_id", user_id).eq("horse_id", horse_id).gte("completed_at", today).execute()
        
        return Response({"message": "Daily feeds reset successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_feed_schedule(request):
    """
    Delete a specific feed schedule from database
    Only allows deletion of incomplete schedules
    """
    try:
        user_id = request.data.get("user_id")
        fd_id = request.data.get("fd_id")
        
        if not user_id or not fd_id:
            return Response({"error": "user_id and fd_id are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if the feed schedule exists and is not completed
        feed_check = service_client.table("feed_detail").select("*").eq("fd_id", fd_id).execute()
        
        if not feed_check.data:
            return Response({"error": "Feed schedule not found"}, status=status.HTTP_404_NOT_FOUND)
        
        feed_schedule = feed_check.data[0]
        
        # Check if the schedule is completed
        if feed_schedule.get("completed", False):
            return Response({"error": "Cannot delete completed feed schedules"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify ownership (either op_id or kutsero_id should match)
        if feed_schedule.get("op_id") != user_id and feed_schedule.get("kutsero_id") != user_id:
            return Response({"error": "Unauthorized to delete this schedule"}, status=status.HTTP_403_FORBIDDEN)
        
        # Delete the schedule
        delete_result = service_client.table("feed_detail").delete().eq("fd_id", fd_id).execute()
        
        if delete_result.data:
            logger.info(f"Feed schedule {fd_id} deleted successfully")
            return Response({
                "message": "Feed schedule deleted successfully",
                "fd_id": fd_id
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Failed to delete feed schedule"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error deleting feed schedule: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)        


@api_view(['GET'])
def get_feed_logs(request):
    """
    Get feed logs - UPDATED TO SHOW WHO FED THE HORSE
    """
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")  # Optional: filter by specific horse
    
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get all feed logs (not just for this user - show all feeding events)
        query = supabase.table("feed_log").select("*").order("created_at", desc=True)
        
        # Optionally filter by horse if provided
        if horse_id:
            query = query.eq("horse_id", horse_id)
        
        data = query.execute()
        
        # Transform data
        transformed_data = []
        for log in data.data:
            # Get horse name
            horse_data = supabase.table("horse_profile").select("horse_name").eq("horse_id", log["horse_id"]).execute()
            horse_name = "Unknown Horse"
            if horse_data.data:
                horse_name = horse_data.data[0].get("horse_name", "Unknown Horse")
            
            transformed_data.append({
                "log_id": log["log_id"],
                "date": log["log_date"],
                "horse": horse_name,
                "horse_id": log["horse_id"],
                "timestamp": log["created_at"],
                "user_full_name": log["log_user_full_name"],  # Who fed it
                "meal": log["log_meal"],
                "time": log["log_time"],
                "food": log["log_food"],
                "amount": log["log_amount"],
                "status": log["log_status"],
                "action": log["log_action"].lower(),
                "user_id": log.get("user_id")  # User who fed it
            })
        
        return Response(transformed_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching feed logs: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def clear_feed_logs(request):
    user_id = request.data.get("user_id")
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        service_client.table("feed_log").delete().eq("user_id", user_id).execute()
        return Response({"message": "All feed logs cleared successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ================================================ CONTACT API WITH APPROVED USERS ONLY ================================================

@api_view(['GET'])
def get_all_kutseros(request):
    """
    Fetch all APPROVED kutseros for contact list WITHOUT PRESENCE
    Only shows kutseros with status = 'approved' (from users table)
    """
    try:
        # Step 1: Get approved kutsero IDs from users table
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        approved_users = service_client.table("users").select("id").eq("role", "Kutsero").eq("status", "approved").execute()
        
        if not approved_users.data or len(approved_users.data) == 0:
            logger.info("No approved kutseros found in users table")
            return Response([], status=status.HTTP_200_OK)
        
        approved_kutsero_ids = [user["id"] for user in approved_users.data]
        logger.info(f"Found {len(approved_kutsero_ids)} approved kutsero IDs from users table")
        
        # Step 2: Get kutsero profiles for approved users only
        data = supabase.table("kutsero_profile").select(
            "kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_email, kutsero_image"
        ).in_("kutsero_id", approved_kutsero_ids).execute()
        
        logger.info(f"Fetched {len(data.data) if data.data else 0} APPROVED kutseros from database")
        
        # Transform data to match frontend expectations
        kutseros = []
        for kutsero in data.data if data.data else []:
            kutsero_id = kutsero["kutsero_id"]
            
            # Handle avatar/image URL properly
            avatar_url = None
            kutsero_image = kutsero.get("kutsero_image")
            
            if kutsero_image:
                if kutsero_image.startswith("http://") or kutsero_image.startswith("https://"):
                    avatar_url = kutsero_image
                elif kutsero_image.startswith("kutsero_images/"):
                    avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{kutsero_image}"
                elif kutsero_image:
                    avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_images/{kutsero_image}"
            
            kutsero_data = {
                "kutsero_id": kutsero_id,
                "kutsero_fname": kutsero.get("kutsero_fname", ""),
                "kutsero_mname": kutsero.get("kutsero_mname", ""),
                "kutsero_lname": kutsero.get("kutsero_lname", ""),
                "kutsero_email": kutsero.get("kutsero_email", ""),
                "kutsero_image": avatar_url
            }
            
            kutseros.append(kutsero_data)
        
        logger.info(f"Returning {len(kutseros)} APPROVED kutseros")
        return Response(kutseros, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching approved kutseros: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch kutseros",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_all_operators(request):
    """
    Fetch all APPROVED horse operators for contact list WITHOUT PRESENCE
    Only shows operators with status = 'approved' (from users table)
    """
    try:
        # Step 1: Get approved operator IDs from users table
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        approved_users = service_client.table("users").select("id").eq("role", "Horse Operator").eq("status", "approved").execute()
        
        if not approved_users.data or len(approved_users.data) == 0:
            logger.info("No approved operators found in users table")
            return Response([], status=status.HTTP_200_OK)
        
        approved_operator_ids = [user["id"] for user in approved_users.data]
        logger.info(f"Found {len(approved_operator_ids)} approved operator IDs from users table")
        
        # Step 2: Get operator profiles for approved users only
        data = supabase.table("horse_op_profile").select(
            "op_id, op_fname, op_mname, op_lname, op_email, op_image"
        ).in_("op_id", approved_operator_ids).execute()
        
        logger.info(f"Fetched {len(data.data) if data.data else 0} APPROVED operators from database")
        
        # Transform data to match frontend expectations
        operators = []
        for op in data.data if data.data else []:
            op_id = op["op_id"]
            
            # Handle avatar/image URL properly
            avatar_url = None
            op_image = op.get("op_image")
            
            if op_image:
                if op_image.startswith("http://") or op_image.startswith("https://"):
                    avatar_url = op_image
                elif op_image.startswith("kutsero_op_profile/"):
                    avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{op_image}"
                elif op_image:
                    avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{op_image}"
            
            op_data = {
                "op_id": op_id,
                "op_fname": op.get("op_fname", ""),
                "op_mname": op.get("op_mname", ""),
                "op_lname": op.get("op_lname", ""),
                "op_email": op.get("op_email", ""),
                "op_image": avatar_url
            }
            
            operators.append(op_data)
        
        logger.info(f"Returning {len(operators)} APPROVED operators")
        return Response(operators, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching approved operators: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch operators",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_all_dvmf(request):
    """
    Fetch all APPROVED DVMF users for contact list
    Only shows DVMF with status = 'approved' (from users table)
    """
    try:
        # Step 1: Get approved DVMF IDs from users table
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        approved_users = service_client.table("users").select("id").eq("role", "DVMF").eq("status", "approved").execute()
        
        if not approved_users.data or len(approved_users.data) == 0:
            logger.info("No approved DVMF users found in users table")
            return Response([], status=status.HTTP_200_OK)
        
        approved_dvmf_ids = [user["id"] for user in approved_users.data]
        logger.info(f"Found {len(approved_dvmf_ids)} approved DVMF IDs from users table")
        
        # Step 2: Get DVMF profiles for approved users only
        data = supabase.table("dvmf_user_profile").select(
            "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email, dvmf_phonenum"
        ).in_("dvmf_id", approved_dvmf_ids).execute()
        
        logger.info(f"Fetched {len(data.data) if data.data else 0} APPROVED DVMF users from database")
        
        # Transform data to match frontend expectations
        dvmf_users = []
        for dvmf in data.data if data.data else []:
            dvmf_data = {
                "dvmf_id": dvmf["dvmf_id"],
                "dvmf_fname": dvmf.get("dvmf_fname", ""),
                "dvmf_lname": dvmf.get("dvmf_lname", ""),
                "dvmf_email": dvmf.get("dvmf_email", ""),
                "dvmf_phonenum": dvmf.get("dvmf_phonenum", "")
            }
            dvmf_users.append(dvmf_data)
        
        logger.info(f"Returning {len(dvmf_users)} APPROVED DVMF users")
        return Response(dvmf_users, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching approved DVMF users: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch DVMF users",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_all_ctu_vet(request):
    """
    Fetch all APPROVED CTU Vet users for contact list.
    Separates CTU Vets (e.g., 'Ctu-Vetmed') and Admins (e.g., 'Ctu-Admin').
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Step 1: Get approved CTU Vet users from users table
        approved_users = service_client.table("users").select("id").eq("role", "CTU Vet").eq("status", "approved").execute()
        if not approved_users.data or len(approved_users.data) == 0:
            logger.info("No approved CTU Vet users found in users table")
            return Response({"ctu_vets": [], "admins": []}, status=status.HTTP_200_OK)

        approved_ctu_ids = [user["id"] for user in approved_users.data]
        logger.info(f"Found {len(approved_ctu_ids)} approved CTU Vet IDs from users table")

        # Step 2: Fetch their CTU Vet profiles
        data = service_client.table("ctu_vet_profile").select(
            "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_phonenum, ctu_role"
        ).in_("ctu_id", approved_ctu_ids).execute()

        logger.info(f"Fetched {len(data.data) if data.data else 0} CTU Vet profiles")

        # Step 3: Separate CTU-Vetmed and CTU-Admin
        ctu_vets = []
        admins = []

        for ctu in data.data if data.data else []:
            ctu_role = (ctu.get("ctu_role") or "").strip()
            ctu_data = {
                "ctu_id": ctu["ctu_id"],
                "ctu_fname": ctu.get("ctu_fname", ""),
                "ctu_lname": ctu.get("ctu_lname", ""),
                "ctu_email": ctu.get("ctu_email", ""),
                "ctu_phonenum": ctu.get("ctu_phonenum", ""),
                "ctu_role": ctu_role
            }

            # Case-insensitive matching for roles
            if "admin" in ctu_role.lower():
                admins.append(ctu_data)
            elif "vetmed" in ctu_role.lower():
                ctu_vets.append(ctu_data)
            else:
                logger.warning(f"Unrecognized CTU role '{ctu_role}' for ID {ctu.get('ctu_id')}")

        logger.info(f"Returning {len(ctu_vets)} vets and {len(admins)} admins")

        return Response({
            "ctu_vets": ctu_vets,
            "admins": admins
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching approved CTU Vet users: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch CTU Vet users",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_all_kut_pres(request):
    """
    Fetch all APPROVED Kutsero Presidents for contact list
    Only shows Kutsero Presidents with status = 'approved' (from users table)
    """
    try:
        # Step 1: Get approved Kutsero President IDs from users table
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        approved_users = service_client.table("users").select("id").eq("role", "Kutsero President").eq("status", "approved").execute()
        
        if not approved_users.data or len(approved_users.data) == 0:
            logger.info("No approved Kutsero President users found in users table")
            return Response([], status=status.HTTP_200_OK)
        
        approved_pres_ids = [user["id"] for user in approved_users.data]
        logger.info(f"Found {len(approved_pres_ids)} approved Kutsero President IDs from users table")
        
        # Step 2: Get Kutsero President profiles for approved users only
        data = supabase.table("kutsero_pres_profile").select(
            "pres_id, pres_fname, pres_lname, pres_email, pres_phonenum, user_id"
        ).in_("user_id", approved_pres_ids).execute()
        
        logger.info(f"Fetched {len(data.data) if data.data else 0} APPROVED Kutsero President users from database")
        
        # Transform data to match frontend expectations
        kut_presidents = []
        for pres in data.data if data.data else []:
            pres_data = {
                "pres_id": pres["pres_id"],
                "user_id": pres["user_id"],
                "pres_fname": pres.get("pres_fname", ""),
                "pres_lname": pres.get("pres_lname", ""),
                "pres_email": pres.get("pres_email", ""),
                "pres_phonenum": pres.get("pres_phonenum", "")
            }
            kut_presidents.append(pres_data)
        
        logger.info(f"Returning {len(kut_presidents)} APPROVED Kutsero President users")
        return Response(kut_presidents, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching approved Kutsero President users: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch Kutsero President users",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------ VETERINARIAN API ------------------------------------------------

@api_view(['GET'])
def get_veterinarians(request):
    """
    Fetch only APPROVED REGULAR veterinarians (excluding CTU veterinarians)
    Now with enhanced filtering to ensure proper data retrieval
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        all_vets = []
        
        # ========== Get Regular Approved Veterinarians ONLY ==========
        approved_users = service_client.table("users").select("id").eq("role", "Veterinarian").eq("status", "approved").execute()
        
        if approved_users.data and len(approved_users.data) > 0:
            approved_vet_ids = [user["id"] for user in approved_users.data]
            logger.info(f"Found {len(approved_vet_ids)} approved veterinarian IDs from users table")
            
            # Query vet_profile for approved vets only - INCLUDING vet_exp_yr
            data = supabase.table("vet_profile").select(
                "vet_id, vet_fname, vet_lname, vet_email, vet_phone_num, vet_specialization, vet_profile_photo, vet_exp_yr"
            ).in_("vet_id", approved_vet_ids).execute()
            
            logger.info(f"Fetched {len(data.data) if data.data else 0} approved veterinarians from vet_profile")
            
            # Transform regular veterinarians
            for vet in data.data if data.data else []:
                vet_id = vet["vet_id"]
                
                # Handle avatar/image URL properly
                avatar_url = None
                vet_photo = vet.get("vet_profile_photo")
                
                if vet_photo:
                    if vet_photo.startswith("http://") or vet_photo.startswith("https://"):
                        avatar_url = vet_photo
                    elif vet_photo.startswith("vet_images/") or vet_photo.startswith("profile_photos/"):
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{vet_photo}"
                    else:
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/vet_images/{vet_photo}"
                
                # Get years of experience
                vet_exp_yr = vet.get("vet_exp_yr", 0)
                
                vet_data = {
                    "id": vet_id,
                    "first_name": vet.get("vet_fname", "Unknown"),
                    "last_name": vet.get("vet_lname", "Veterinarian"),
                    "email": vet.get("vet_email", ""),
                    "phone": vet.get("vet_phone_num"),
                    "specialization": vet.get("vet_specialization"),
                    "avatar": avatar_url,
                    "vet_type": "regular",
                    "vet_exp_yr": vet_exp_yr
                }
                
                all_vets.append(vet_data)
        
        # Sort all vets alphabetically by last name, then first name
        all_vets.sort(key=lambda x: (x.get("last_name", ""), x.get("first_name", "")))
        
        logger.info(f"Returning {len(all_vets)} regular veterinarians")
        return Response(all_vets, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching veterinarians: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch veterinarians",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_vet_profile(request):
    """
    Get veterinarian profile by vet_id
    """
    vet_id = request.GET.get("vet_id")
    if not vet_id:
        return Response({"error": "vet_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = supabase.table("vet_profile").select("*").eq("vet_id", vet_id).execute()
        
        if not data.data or len(data.data) == 0:
            return Response({"error": "Veterinarian profile not found"}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(data.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching vet profile: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ------------------------------------------------ VET SCHEDULE API ------------------------------------------------

def format_time_from_db(time_value):
    """
    Helper function to format time from database to consistent string format
    """
    if not time_value:
        return ""
    
    if isinstance(time_value, str):
        # Already a string, just clean it up
        time_str = time_value.strip()
        # Remove microseconds if present
        if '.' in time_str:
            time_str = time_str.split('.')[0]
        return time_str
    
    elif hasattr(time_value, 'strftime'):
        # It's a datetime or time object
        if hasattr(time_value, 'hour'):
            # time object
            return time_value.strftime('%H:%M:%S')
        else:
            # datetime object
            return time_value.strftime('%H:%M:%S')
    
    # Fallback to string conversion
    return str(time_value)


@api_view(['GET'])
def get_vet_base_schedule(request):
    """
    Get veterinarian's base schedule (weekly recurring availability)
    Now properly formatted for display
    """
    vet_id = request.GET.get("vet_id")
    
    if not vet_id:
        return Response({"error": "vet_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        logger.info(f"📅 Fetching base schedule for vet: {vet_id}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Query vet_schedule table for the veterinarian's base schedule
        data = supabase.table("vet_schedule").select(
            "sched_id, vet_id, day_of_week, start_time, end_time, slot_duration, is_available, created_at"
        ).eq("vet_id", vet_id).order("day_of_week", desc=False).execute()
        
        if not data.data:
            logger.info(f"No base schedule found for vet {vet_id}")
            return Response({
                "vet_id": vet_id,
                "schedules": [],
                "message": "No regular schedule set"
            }, status=status.HTTP_200_OK)
        
        # Format the schedule data for display
        formatted_schedules = []
        for schedule in data.data:
            start_time = schedule.get("start_time")
            end_time = schedule.get("end_time")
            
            # Format times to 12-hour format
            start_time_formatted = format_time_to_12_hour(start_time)
            end_time_formatted = format_time_to_12_hour(end_time) if end_time else ""
            
            # Format time range for display
            time_range = f"{start_time_formatted} - {end_time_formatted}" if end_time else start_time_formatted
            
            # Capitalize day name
            day_of_week = schedule.get("day_of_week", "").capitalize()
            
            formatted_schedules.append({
                "sched_id": str(schedule.get("sched_id")),
                "vet_id": str(schedule.get("vet_id")),
                "day_of_week": day_of_week,
                "formatted_day": day_of_week,  # For display
                "start_time": start_time,
                "end_time": end_time,
                "start_time_formatted": start_time_formatted,
                "end_time_formatted": end_time_formatted,
                "time_range": time_range,  # Formatted time range
                "time_display": f"{day_of_week} {time_range}",  # Full display format
                "slot_duration": schedule.get("slot_duration", 30),
                "is_available": schedule.get("is_available", True),
                "created_at": schedule.get("created_at")
            })
        
        logger.info(f"✅ Returning {len(formatted_schedules)} base schedule items for vet {vet_id}")
        
        return Response({
            "vet_id": vet_id,
            "schedules": formatted_schedules,
            "total_schedules": len(formatted_schedules),
            "has_schedule": len(formatted_schedules) > 0
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ Error fetching vet base schedule: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch veterinarian schedule",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_vet_appointment_slots(request):
    """
    Get available appointment slots for a veterinarian
    Combines data from vet_schedule and appointment_slot tables
    """
    vet_id = request.GET.get("vet_id")
    
    if not vet_id:
        return Response({"error": "vet_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        logger.info(f"Fetching appointment slots for vet: {vet_id}")
        
        # Get current date for filtering
        today = datetime.now().date().isoformat()
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # First get the vet's schedule IDs
        schedule_data = service_client.table("vet_schedule").select("sched_id").eq("vet_id", vet_id).execute()
        
        if not schedule_data.data:
            logger.info(f"No schedules found for vet {vet_id}")
            return Response({
                "vet_id": vet_id,
                "slots": [],
                "message": "No appointment slots available"
            }, status=status.HTTP_200_OK)
        
        schedule_ids = [schedule["sched_id"] for schedule in schedule_data.data]
        
        # Then get available appointment slots for these schedules
        slots_data = service_client.table("appointment_slot").select(
            "slot_id, sched_id, slot_date, start_time, end_time, is_booked, created_at"
        ).in_("sched_id", schedule_ids).eq("is_booked", False).gte("slot_date", today).order(
            "slot_date", desc=False
        ).order("start_time", desc=False).execute()
        
        if not slots_data.data:
            logger.info(f"No available appointment slots found for vet {vet_id}")
            return Response({
                "vet_id": vet_id,
                "slots": [],
                "message": "No appointment slots available"
            }, status=status.HTTP_200_OK)
        
        # Format the appointment slots
        formatted_slots = []
        for slot in slots_data.data:
            slot_date = slot.get("slot_date")
            start_time = slot.get("start_time")
            end_time = slot.get("end_time")
            
            # Format date for display
            try:
                date_obj = datetime.strptime(str(slot_date), '%Y-%m-%d')
                formatted_date = date_obj.strftime('%B %d, %Y')
                day_of_week = date_obj.strftime('%A')
            except:
                formatted_date = str(slot_date)
                day_of_week = ""
            
            # Format times
            start_time_formatted = format_time_to_12_hour(start_time)
            end_time_formatted = format_time_to_12_hour(end_time) if end_time else ""
            time_display = format_time_range(start_time, end_time) if end_time else start_time_formatted
            
            formatted_slots.append({
                "slot_id": str(slot.get("slot_id")),
                "sched_id": str(slot.get("sched_id")),
                "slot_date": str(slot_date),
                "formatted_date": formatted_date,
                "day_of_week": day_of_week,
                "start_time": str(start_time),
                "end_time": str(end_time) if end_time else "",
                "time_display": time_display,
                "start_time_formatted": start_time_formatted,
                "end_time_formatted": end_time_formatted,
                "is_available": not slot.get("is_booked", False),
                "vet_id": vet_id
            })
        
        logger.info(f"Returning {len(formatted_slots)} appointment slots for vet {vet_id}")
        
        return Response({
            "vet_id": vet_id,
            "slots": formatted_slots,
            "total_slots": len(formatted_slots)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching vet appointment slots: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch appointment slots",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

# Add this function to your views.py file
def get_available_months_with_rolling_window(available_dates, current_date=None):
    """
    Get available months with two-month rolling window
    Returns only current month and next month from available dates
    """
    if current_date is None:
        current_date = datetime.now().date()
    
    current_year = current_date.year
    current_month = current_date.month
    
    # Get unique months from available dates
    unique_months = set()
    for date_str in available_dates:
        try:
            date_obj = datetime.strptime(str(date_str), '%Y-%m-%d').date()
            unique_months.add((date_obj.year, date_obj.month))
        except:
            continue
    
    # Filter for two-month rolling window
    filtered_months = []
    for year, month in unique_months:
        # Calculate month difference
        month_diff = (year - current_year) * 12 + (month - current_month)
        
        # Include if it's current month (0) or next month (1)
        if month_diff >= 0 and month_diff <= 1:
            filtered_months.append((year, month))
    
    # Convert to date objects (first day of each month)
    month_dates = [datetime(year, month, 1).date() for year, month in filtered_months]
    
    # Sort by date
    month_dates.sort()
    
    return month_dates

# Update the get_vet_schedule function to include month filtering
@api_view(['GET'])
def get_vet_schedule(request):
    """
    Get veterinarian schedule by vet_id - CORRECTED VERSION
    Now properly fetches from appointment_slot table
    """
    vet_id = request.GET.get("vet_id")
    if not vet_id:
        logger.error("vet_id parameter missing in get_vet_schedule")
        return Response({"error": "vet_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        logger.info(f"Fetching available schedule for vet_id: {vet_id}")
        
        # Get current date and time for filtering
        now = datetime.now()
        today = now.date().isoformat()
        current_time = now.time()
        
        logger.info(f"Current date/time for filtering: {today} {current_time}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # DIRECT QUERY: Get available appointment slots for this vet
        # First, get all schedule IDs for this vet from vet_schedule
        vet_schedules = service_client.table("vet_schedule").select(
            "sched_id"
        ).eq("vet_id", vet_id).execute()
        
        if not vet_schedules.data:
            logger.warning(f"No vet_schedule found for vet_id: {vet_id}")
            return Response([], status=status.HTTP_200_OK)
        
        schedule_ids = [schedule["sched_id"] for schedule in vet_schedules.data]
        logger.info(f"Found {len(schedule_ids)} schedule IDs for vet {vet_id}")
        
        # Get available appointment slots
        data = service_client.table("appointment_slot").select(
            "slot_id, sched_id, slot_date, start_time, end_time, is_booked, created_at"
        ).in_("sched_id", schedule_ids).eq("is_booked", False).gte("slot_date", today).order(
            "slot_date", desc=False
        ).order("start_time", desc=False).execute()
        
        logger.info(f"Raw schedule slots retrieved from appointment_slot: {len(data.data) if data.data else 0} records")
        
        if not data.data:
            logger.warning(f"No available appointment slots found for vet {vet_id}")
            return Response([], status=status.HTTP_200_OK)
        
        # Transform and filter data
        formatted_schedule = []
        filtered_count = 0
        
        for schedule_item in data.data:
            try:
                slot_date = schedule_item.get("slot_date")
                start_time = schedule_item.get("start_time")
                end_time = schedule_item.get("end_time")
                is_booked = schedule_item.get("is_booked", False)
                
                # Skip if essential fields are missing or already booked
                if not slot_date or not start_time or is_booked:
                    logger.warning(f"Skipping slot with missing date/time or booked: {schedule_item}")
                    continue
                
                # Filter out past schedules
                if is_schedule_in_past(slot_date, start_time):
                    filtered_count += 1
                    logger.debug(f"Filtered out past schedule: {slot_date} {start_time}")
                    continue
                
                # Format times for display
                start_time_formatted = format_time_to_12_hour(start_time)
                end_time_formatted = format_time_to_12_hour(end_time) if end_time else ""
                time_display = format_time_range(start_time, end_time) if end_time else start_time_formatted
                
                # Get the day of week from the slot date
                try:
                    date_obj = datetime.strptime(str(slot_date), '%Y-%m-%d')
                    day_of_week = date_obj.strftime('%A')
                    formatted_date = date_obj.strftime('%B %d, %Y')
                except:
                    day_of_week = ""
                    formatted_date = str(slot_date)
                
                # Create formatted schedule item
                formatted_item = {
                    "sched_id": str(schedule_item.get("sched_id", "")),
                    "slot_id": str(schedule_item.get("slot_id", "")),
                    "vet_id": vet_id,
                    "sched_date": str(slot_date),
                    "formatted_date": formatted_date,
                    "day_of_week": day_of_week,
                    "start_time": str(start_time),
                    "end_time": str(end_time) if end_time else "",
                    "start_time_formatted": start_time_formatted,
                    "end_time_formatted": end_time_formatted,
                    "sched_time": time_display,
                    "time_display": time_display,
                    "is_available": not is_booked
                }
                
                # Validate essential fields before adding
                if formatted_item["slot_id"] and formatted_item["sched_date"]:
                    formatted_schedule.append(formatted_item)
                else:
                    logger.warning(f"Skipping invalid schedule item: {schedule_item}")
                    
            except Exception as item_error:
                logger.error(f"Error formatting schedule item {schedule_item}: {item_error}")
                continue
        
        logger.info(f"Returning {len(formatted_schedule)} available schedule slots (filtered {filtered_count} past schedules)")
        
        # Sort by date and time
        formatted_schedule.sort(key=lambda x: (x['sched_date'], x['start_time']))
        
        return Response(formatted_schedule, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching vet schedule for vet_id {vet_id}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return Response({"error": "Failed to fetch veterinarian schedule", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['GET'])
def check_schedule_availability(request):
    """
    Check if a specific schedule slot is still available
    Updated to use appointment_slot table
    """
    slot_id = request.GET.get("slot_id")
    
    if not slot_id:
        return Response({"error": "slot_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Query appointment_slot table
        data = service_client.table("appointment_slot").select(
            "slot_id, slot_date, start_time, end_time, is_booked, sched_id"
        ).eq("slot_id", slot_id).execute()
        
        if not data.data or len(data.data) == 0:
            return Response({"available": False, "reason": "Schedule slot not found"}, status=status.HTTP_404_NOT_FOUND)
        
        schedule_slot = data.data[0]
        is_booked = schedule_slot.get("is_booked", False)
        slot_date = schedule_slot.get("slot_date")
        start_time = schedule_slot.get("start_time")
        end_time = schedule_slot.get("end_time")
        
        # Check if schedule is in the past
        is_past = is_schedule_in_past(slot_date, start_time)
        
        # Schedule is available if it's not booked AND not in the past
        truly_available = not is_booked and not is_past
        
        # Format time display
        time_display = format_time_range(start_time, end_time) if end_time else format_time_to_12_hour(start_time)
        
        reason = "Available"
        if is_booked:
            reason = "Already booked"
        elif is_past:
            reason = "Time has passed"
        
        return Response({
            "available": truly_available,
            "slot_id": slot_id,
            "sched_id": schedule_slot.get("sched_id"),
            "sched_date": slot_date,
            "start_time": str(start_time),
            "end_time": str(end_time) if end_time else "",
            "start_time_formatted": format_time_to_12_hour(start_time),
            "end_time_formatted": format_time_to_12_hour(end_time) if end_time else "",
            "time_display": time_display,
            "is_past": is_past,
            "reason": reason
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error checking schedule availability: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def cleanup_past_schedules(request):
    """
    Utility endpoint to clean up past schedule slots from appointment_slot table
    This can be called periodically or manually to remove outdated schedules
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get current date for filtering
        today = datetime.now().date().isoformat()
        
        # Find past appointment slots that are still marked as available
        past_slots = service_client.table("appointment_slot").select(
            "slot_id, slot_date, start_time, is_booked"
        ).eq("is_booked", False).lt("slot_date", today).execute()
        
        if not past_slots.data:
            return Response({
                "message": "No past appointment slots found to clean up",
                "cleaned_slots": 0
            }, status=status.HTTP_200_OK)
        
        # Mark past slots as booked (unavailable)
        updated_count = 0
        for slot in past_slots.data:
            slot_date = slot.get("slot_date")
            start_time = slot.get("start_time")
            
            # Double-check if it's really in the past
            if is_schedule_in_past(slot_date, start_time):
                update_result = service_client.table("appointment_slot").update({
                    "is_booked": True
                }).eq("slot_id", slot["slot_id"]).execute()
                
                if update_result.data:
                    updated_count += 1
        
        logger.info(f"Marked {updated_count} past appointment slots as unavailable")
        
        return Response({
            "message": f"Cleaned up {updated_count} past appointment slots",
            "cleaned_slots": updated_count
        }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error cleaning up past schedules: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ================================================ MESSAGE API ================================================

# Philippine timezone
PHILIPPINE_TZ = ZoneInfo('Asia/Manila')

def format_timestamp(ts):
    """Helper to format ISO timestamp to readable string in Philippine time."""
    if not ts:
        return ""
    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
    # Convert to Philippine timezone
    dt_local = dt.astimezone(PHILIPPINE_TZ)
    return dt_local.strftime('%Y-%m-%d %I:%M %p')


@api_view(['GET'])
def get_messages(request):
    """
    Get all messages between two users - FIXED VERSION
    Now correctly uses mes_date column instead of created_at
    """
    try:
        user_id = request.GET.get("user_id")
        other_user_id = request.GET.get("other_user_id")
        
        if not user_id or not other_user_id:
            return Response({"error": "user_id and other_user_id are required"}, 
                          status=status.HTTP_400_BAD_REQUEST)

        print(f"💬 Fetching messages between {user_id} and {other_user_id}")

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Fetch messages between two users
        # Use OR condition to get both sent and received messages
        messages_response = service_client.table("message").select(
            "mes_id, user_id, receiver_id, mes_content, mes_date, is_read"
        ).or_(
            f"user_id.eq.{user_id},receiver_id.eq.{user_id}"
        ).execute()

        if not messages_response.data:
            print(f"📭 No messages found between {user_id} and {other_user_id}")
            return Response({
                'success': True,
                'messages': []
            }, status=status.HTTP_200_OK)

        print(f"📨 Found {len(messages_response.data)} total messages")

        # Filter messages to only include conversations between these two users
        filtered_messages = []
        for msg in messages_response.data:
            # Check if message is between the two users
            if ((str(msg['user_id']) == str(user_id) and str(msg['receiver_id']) == str(other_user_id)) or
                (str(msg['user_id']) == str(other_user_id) and str(msg['receiver_id']) == str(user_id))):
                
                filtered_messages.append(msg)
        
        print(f"🔍 Filtered to {len(filtered_messages)} messages between specified users")

        # Sort by date
        filtered_messages.sort(key=lambda x: x.get('mes_date', ''))

        messages = []
        for msg in filtered_messages:
            try:
                # Parse timestamp - use mes_date instead of created_at
                created_at = msg.get('mes_date')
                if not created_at:
                    continue
                
                # Handle different timestamp formats
                if isinstance(created_at, str):
                    if created_at.endswith('Z'):
                        created_at_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        created_at_dt = datetime.fromisoformat(created_at)
                else:
                    created_at_dt = created_at
                
                # Convert to Philippine time
                if created_at_dt.tzinfo is None:
                    created_at_dt = pytz.UTC.localize(created_at_dt)
                
                created_at_ph = created_at_dt.astimezone(PHILIPPINE_TZ)
                
                messages.append({
                    'id': str(msg['mes_id']),
                    'text': msg['mes_content'],
                    'isUser': str(msg['user_id']) == str(user_id),
                    'timestamp': created_at_ph.strftime('%I:%M %p'),
                    'created_at': created_at,
                    'date': created_at
                })
            except Exception as parse_error:
                print(f"Error parsing message {msg}: {parse_error}")
                continue

        # Mark unread messages as read
        try:
            # Find messages from other user that are unread
            unread_messages = service_client.table("message").select("mes_id").eq(
                "user_id", other_user_id
            ).eq("receiver_id", user_id).eq("is_read", False).execute()
            
            if unread_messages.data and len(unread_messages.data) > 0:
                # Update all unread messages
                message_ids = [msg["mes_id"] for msg in unread_messages.data]
                service_client.table("message").update({"is_read": True}).in_("mes_id", message_ids).execute()
                print(f"✅ Marked {len(message_ids)} messages as read")
        except Exception as update_error:
            print(f"Warning: Could not mark messages as read: {update_error}")

        print(f"📤 Returning {len(messages)} formatted messages")
        return Response({
            'success': True,
            'messages': messages
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"❌ Error fetching messages: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return Response({
            "error": "Failed to fetch messages", 
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def send_message(request):
    """
    Send a message to another user.
    """
    try:
        sender_id = request.data.get("sender_id")
        receiver_id = request.data.get("receiver_id")
        content = request.data.get("content", "").strip()

        if not sender_id or not receiver_id:
            return Response({"error": "sender_id and receiver_id are required"}, status=status.HTTP_400_BAD_REQUEST)
        if not content:
            return Response({"error": "Message content is required"}, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Insert message
        message_response = service_client.table("message").insert({
            "user_id": sender_id,
            "receiver_id": receiver_id,
            "mes_content": content,
            "is_read": False
        }).execute()

        if not message_response.data:
            return Response({"error": "Failed to send message"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        msg = message_response.data[0]
        # Parse the timestamp from mes_date field
        created_at = msg.get('mes_date', datetime.now(pytz.UTC).isoformat())
        
        if isinstance(created_at, str):
            created_at_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        else:
            created_at_dt = created_at
            
        created_at_ph = created_at_dt.astimezone(PHILIPPINE_TZ)

        return Response({
            'success': True,
            'message': {
                'id': str(msg['mes_id']),
                'text': msg['mes_content'],
                'isUser': True,
                'timestamp': created_at_ph.strftime('%I:%M %p'),  # Philippine time
                'created_at': created_at
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Error sending message: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def available_users(request):
    """
    Get all users that can be messaged (kutseros, horse operators,
    CTU vets, DVMF users, vets) excluding declined and pending users.
    """
    try:
        user_id = request.GET.get("user_id")
        search_query = request.GET.get("search", "").lower()
        role_filter = request.GET.get("role")  # Optional role filter
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        users = []

        # Kutseros
        if role_filter in [None, "kutsero"]:
            try:
                kutsero_profiles = service_client.table("kutsero_profile").select(
                    "kutsero_id, kutsero_fname, kutsero_lname, kutsero_username, kutsero_phone_num, kutsero_email, kutsero_image, users!inner(status)"
                ).neq("kutsero_id", user_id).execute()
                
                for p in kutsero_profiles.data or []:
                    # Filter out declined and pending users
                    user_status = p.get('users', {}).get('status', 'active')
                    if user_status in ['declined', 'pending']:
                        continue
                        
                    display_name = p.get('kutsero_fname') or p.get('kutsero_username') or 'Unknown'
                    if p.get('kutsero_lname'):
                        display_name += f" {p['kutsero_lname']}"
                    if search_query and search_query not in display_name.lower():
                        continue
                    users.append({
                        'id': p['kutsero_id'],
                        'name': display_name,
                        'role': 'kutsero',
                        'avatar': '🐴',
                        'phone': p.get('kutsero_phone_num'),
                        'status': user_status,
                        'profile_image': p.get('kutsero_image')
                    })
            except Exception as e:
                print(f"Error fetching kutseros: {e}")

        # Kutsero Presidents
        if role_filter in [None, "Kutsero President"]:
            try:
                pres_profiles = service_client.table("kutsero_pres_profile").select(
                    "pres_id, pres_fname, pres_lname, pres_email, pres_phonenum, users!inner(status)"
                ).neq("pres_id", user_id).execute()
                
                for p in pres_profiles.data or []:
                    # Filter out declined and pending users
                    user_status = p.get('users', {}).get('status', 'active')
                    if user_status in ['declined', 'pending']:
                        continue
                        
                    display_name = p.get('pres_fname', 'Unknown')
                    if p.get('pres_lname'):
                        display_name += f" {p['pres_lname']}"
                    if search_query and search_query not in display_name.lower():
                        continue
                    users.append({
                        'id': p['pres_id'],
                        'name': display_name,
                        'role': 'Kutsero President',
                        'avatar': '👑',
                        'phone': p.get('pres_phonenum'),
                        'status': user_status,
                        'profile_image': None
                    })
            except Exception as e:
                print(f"Error fetching kutsero presidents: {e}")

        # Horse Operators
        if role_filter in [None, "horse_operator"]:
            try:
                op_profiles = service_client.table("horse_op_profile").select(
                    "op_id, op_fname, op_lname, op_phone_num, op_email, op_image, users!inner(status)"
                ).neq("op_id", user_id).execute()
                
                for p in op_profiles.data or []:
                    # Filter out declined and pending users
                    user_status = p.get('users', {}).get('status', 'active')
                    if user_status in ['declined', 'pending']:
                        continue
                        
                    display_name = p.get('op_fname', 'Unknown')
                    if p.get('op_lname'):
                        display_name += f" {p['op_lname']}"
                    if search_query and search_query not in display_name.lower():
                        continue
                    users.append({
                        'id': p['op_id'],
                        'name': display_name,
                        'role': 'horse_operator',
                        'avatar': '👨‍💼',
                        'phone': p.get('op_phone_num'),
                        'status': user_status,
                        'profile_image': p.get('op_image')
                    })
            except Exception as e:
                print(f"Error fetching horse operators: {e}")

        # CTU Vets - Query separately and check status in users table
        if role_filter in [None, "ctu_vet", "Ctu-Vetmed"]:
            try:
                ctu_profiles = service_client.table("ctu_vet_profile").select(
                    "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_phonenum"
                ).neq("ctu_id", user_id).execute()
                
                for p in ctu_profiles.data or []:
                    # Check status in users table separately
                    try:
                        user_status_data = service_client.table("users").select("status").eq("id", p['ctu_id']).execute()
                        if user_status_data.data:
                            status_value = user_status_data.data[0].get('status', 'active')
                            if status_value in ['declined', 'pending']:
                                continue
                        else:
                            status_value = 'active'
                    except:
                        status_value = 'active'
                        
                    display_name = f"{p.get('ctu_fname', '')}"
                    if p.get('ctu_lname'):
                        display_name += f" {p['ctu_lname']}"
                    if search_query and search_query not in display_name.lower():
                        continue
                    users.append({
                        'id': p['ctu_id'],
                        'name': display_name,
                        'role': 'Ctu-Vetmed',
                        'avatar': '🧑‍⚕️',
                        'phone': p.get('ctu_phonenum'),
                        'status': status_value
                    })
            except Exception as e:
                print(f"Error fetching CTU vets: {e}")

        # DVMF Users - Query separately and check status in users table
        if role_filter in [None, "dvmf_user", "Dvmf"]:
            try:
                dvmf_profiles = service_client.table("dvmf_user_profile").select(
                    "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email, dvmf_phonenum"
                ).neq("dvmf_id", user_id).execute()
                
                for p in dvmf_profiles.data or []:
                    # Check status in users table separately
                    try:
                        user_status_data = service_client.table("users").select("status").eq("id", p['dvmf_id']).execute()
                        if user_status_data.data:
                            status_value = user_status_data.data[0].get('status', 'active')
                            if status_value in ['declined', 'pending', 'unverified']:
                                continue
                        else:
                            status_value = 'active'
                    except:
                        status_value = 'active'
                        
                    display_name = p.get('dvmf_fname', 'Unknown')
                    if p.get('dvmf_lname'):
                        display_name += f" {p['dvmf_lname']}"
                    if search_query and search_query not in display_name.lower():
                        continue
                    users.append({
                        'id': p['dvmf_id'],
                        'name': display_name,
                        'role': 'Dvmf',
                        'avatar': '🧑‍💼',
                        'phone': p.get('dvmf_phonenum'),
                        'status': status_value
                    })
            except Exception as e:
                print(f"Error fetching DVMF users: {e}")

        # Vets - Query separately and check status in users table
        if role_filter in [None, "vet", "Vet"]:
            try:
                vet_profiles = service_client.table("vet_profile").select(
                    "vet_id, vet_fname, vet_lname, vet_email, vet_phone_num, vet_profile_photo"
                ).neq("vet_id", user_id).execute()
                
                for p in vet_profiles.data or []:
                    # Check status in users table separately
                    try:
                        user_status_data = service_client.table("users").select("status").eq("id", p['vet_id']).execute()
                        if user_status_data.data:
                            status_value = user_status_data.data[0].get('status', 'active')
                            if status_value in ['declined', 'pending']:
                                continue
                        else:
                            status_value = 'active'
                    except:
                        status_value = 'active'
                        
                    display_name = p.get('vet_fname', 'Unknown')
                    if p.get('vet_lname'):
                        display_name += f" {p['vet_lname']}"
                    if search_query and search_query not in display_name.lower():
                        continue
                    users.append({
                        'id': p['vet_id'],
                        'name': display_name,
                        'role': 'Veterinarian',
                        'avatar': '🐾',
                        'phone': p.get('vet_phone_num'),
                        'status': status_value,
                        'profile_image': p.get('vet_profile_photo')
                    })
            except Exception as e:
                print(f"Error fetching vets: {e}")

        # Sort users by name
        users.sort(key=lambda x: x['name'])
        
        return Response({
            'users': users,
            'total_count': len(users)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error fetching available users: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def conversations(request):
    """
    Fetch all conversations for a given user, grouped by conversation partner.
    FIXED: Properly fetches user names and images from all profile tables including veterinarians
    """
    print("=" * 80)
    print("CONVERSATIONS ENDPOINT CALLED")
    print("=" * 80)
    
    try:
        user_id = request.GET.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        print(f"Fetching conversations for user: {user_id}")
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Fetch all messages involving the user
        messages_response = service_client.table("message").select("*").or_(
            f"user_id.eq.{user_id},receiver_id.eq.{user_id}"
        ).order("mes_date", desc=True).execute()

        messages = messages_response.data or []
        print(f"Found {len(messages)} total messages")

        # Dictionary to hold conversations
        conversations_dict = {}

        for msg in messages:
            # Determine the other user ID and ensure it's a string
            other_user_id = str(msg['receiver_id']) if str(msg['user_id']) == str(user_id) else str(msg['user_id'])

            if other_user_id not in conversations_dict:
                # Check if this message is unread
                is_unread = (str(msg['receiver_id']) == str(user_id) and not msg.get('is_read', False))
                
                conversations_dict[other_user_id] = {
                    'other_user_id': other_user_id,
                    'last_message': msg.get('mes_content'),
                    'last_message_time': msg.get('mes_date'),
                    'is_read': msg.get('is_read', False),
                    'unread_count': 1 if is_unread else 0
                }

        print(f"Grouped into {len(conversations_dict)} conversations")

        # Count all unread messages for each conversation
        for other_user_id in conversations_dict.keys():
            unread_response = service_client.table("message").select(
                "mes_id", count="exact"
            ).eq("user_id", other_user_id).eq("receiver_id", user_id).eq("is_read", False).execute()
            
            unread_count = unread_response.count if unread_response.count else 0
            conversations_dict[other_user_id]['unread_count'] = unread_count
            conversations_dict[other_user_id]['is_read'] = (unread_count == 0)
            
            print(f"User {other_user_id}: {unread_count} unread messages")

        # Fetch partner information for each conversation - ENHANCED VERSION
        conversations_list = []
        for other_user_id, conv_data in conversations_dict.items():
            print(f"\n{'='*60}")
            print(f"Looking up user: {other_user_id}")
            user_info = None
            
            # ========== 1. Check vet_profile FIRST ==========
            try:
                vet_response = service_client.table("vet_profile").select(
                    "vet_id, vet_fname, vet_mname, vet_lname, vet_email, vet_profile_photo"
                ).eq("vet_id", other_user_id).execute()
                
                if vet_response.data and len(vet_response.data) > 0:
                    user = vet_response.data[0]
                    
                    fname = str(user.get('vet_fname', '')).strip()
                    lname = str(user.get('vet_lname', '')).strip()
                    
                    # Build name with middle name if available
                    name_parts = []
                    if fname:
                        name_parts.append(fname)
                    if lname:
                        name_parts.append(lname)
                    
                    name = " ".join(name_parts).strip() if name_parts else 'Veterinarian'
                    
                    # Handle image URL properly
                    avatar_url = None
                    vet_photo = user.get('vet_profile_photo')
                    if vet_photo:
                        if vet_photo.startswith("http://") or vet_photo.startswith("https://"):
                            avatar_url = vet_photo
                        elif vet_photo.startswith("vet_images/") or vet_photo.startswith("profile_photos/"):
                            avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{vet_photo}"
                        else:
                            avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/vet_images/{vet_photo}"
                    
                    user_info = {
                        'name': name,
                        'email': user.get('vet_email', ''),
                        'role': 'veterinarian',
                        'avatar': '🐾',
                        'status': 'active',
                        'profile_image': avatar_url
                    }
                    print(f"✓ SUCCESS - Found in vet_profile: {name}, Image: {avatar_url}")
            except Exception as e:
                print(f"✗ ERROR checking vet_profile: {e}")
            
            # ========== 2. Check kutsero_profile ==========
            if not user_info:
                try:
                    kutsero_response = service_client.table("kutsero_profile").select(
                        "kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_email, kutsero_image"
                    ).eq("kutsero_id", other_user_id).execute()
                    
                    if kutsero_response.data and len(kutsero_response.data) > 0:
                        user = kutsero_response.data[0]
                        
                        fname = str(user.get('kutsero_fname', '')).strip()
                        lname = str(user.get('kutsero_lname', '')).strip()
                        
                        # Build name
                        name = f"{fname} {lname}".strip() if (fname or lname) else 'Kutsero User'
                        
                        # Handle image URL properly
                        avatar_url = None
                        kutsero_image = user.get('kutsero_image')
                        if kutsero_image:
                            if kutsero_image.startswith("http://") or kutsero_image.startswith("https://"):
                                avatar_url = kutsero_image
                            elif kutsero_image.startswith("kutsero_images/"):
                                avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{kutsero_image}"
                            else:
                                avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_images/{kutsero_image}"
                        
                        user_info = {
                            'name': name,
                            'email': user.get('kutsero_email', ''),
                            'role': 'kutsero',
                            'avatar': '🐴',
                            'status': 'active',
                            'profile_image': avatar_url
                        }
                        print(f"✓ SUCCESS - Found in kutsero_profile: {name}, Image: {avatar_url}")
                except Exception as e:
                    print(f"✗ ERROR checking kutsero_profile: {e}")
            
            # ========== 3. Check horse_op_profile ==========
            if not user_info:
                try:
                    operator_response = service_client.table("horse_op_profile").select(
                        "op_id, op_fname, op_mname, op_lname, op_email, op_image"
                    ).eq("op_id", other_user_id).execute()
                    
                    if operator_response.data and len(operator_response.data) > 0:
                        user = operator_response.data[0]
                        
                        fname = str(user.get('op_fname', '')).strip()
                        lname = str(user.get('op_lname', '')).strip()
                        
                        name = f"{fname} {lname}".strip() if (fname or lname) else 'Operator User'
                        
                        # Handle image URL properly
                        avatar_url = None
                        op_image = user.get('op_image')
                        if op_image:
                            if op_image.startswith("http://") or op_image.startswith("https://"):
                                avatar_url = op_image
                            elif op_image.startswith("kutsero_op_profile/"):
                                avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{op_image}"
                            else:
                                avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{op_image}"
                        
                        user_info = {
                            'name': name,
                            'email': user.get('op_email', ''),
                            'role': 'horse_operator',
                            'avatar': '👨‍💼',
                            'status': 'active',
                            'profile_image': avatar_url
                        }
                        print(f"✓ SUCCESS - Found in horse_op_profile: {name}, Image: {avatar_url}")
                except Exception as e:
                    print(f"✗ ERROR checking horse_op_profile: {e}")
            
            # ========== 4. Check ctu_vet_profile ==========
            if not user_info:
                try:
                    ctu_response = service_client.table("ctu_vet_profile").select(
                        "ctu_id, ctu_fname, ctu_lname, ctu_email"
                    ).eq("ctu_id", other_user_id).execute()
                    
                    if ctu_response.data and len(ctu_response.data) > 0:
                        user = ctu_response.data[0]
                        
                        fname = str(user.get('ctu_fname', '')).strip()
                        lname = str(user.get('ctu_lname', '')).strip()
                        
                        name = f"{fname} {lname}".strip() if (fname or lname) else 'CTU Vet'
                        
                        user_info = {
                            'name': name,
                            'email': user.get('ctu_email', ''),
                            'role': 'Ctu-Vetmed',
                            'avatar': '🧑‍⚕️',
                            'status': 'active',
                            'profile_image': None
                        }
                        print(f"✓ SUCCESS - Found in ctu_vet_profile: {name}")
                except Exception as e:
                    print(f"✗ ERROR checking ctu_vet_profile: {e}")
            
            # ========== 5. Check dvmf_user_profile ==========
            if not user_info:
                try:
                    dvmf_response = service_client.table("dvmf_user_profile").select(
                        "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email"
                    ).eq("dvmf_id", other_user_id).execute()
                    
                    if dvmf_response.data and len(dvmf_response.data) > 0:
                        user = dvmf_response.data[0]
                        
                        fname = str(user.get('dvmf_fname', '')).strip()
                        lname = str(user.get('dvmf_lname', '')).strip()
                        
                        name = f"{fname} {lname}".strip() if (fname or lname) else 'DVMF User'
                        
                        user_info = {
                            'name': name,
                            'email': user.get('dvmf_email', ''),
                            'role': 'Dvmf',
                            'avatar': '🧑‍💼',
                            'status': 'active',
                            'profile_image': None
                        }
                        print(f"✓ SUCCESS - Found in dvmf_user_profile: {name}")
                except Exception as e:
                    print(f"✗ ERROR checking dvmf_user_profile: {e}")
            
            # ========== 6. Check kutsero_pres_profile ==========
            if not user_info:
                try:
                    pres_response = service_client.table("kutsero_pres_profile").select(
                        "user_id, pres_fname, pres_lname, pres_email"
                    ).eq("user_id", other_user_id).execute()
                    
                    if pres_response.data and len(pres_response.data) > 0:
                        user = pres_response.data[0]
                        
                        fname = str(user.get('pres_fname', '')).strip()
                        lname = str(user.get('pres_lname', '')).strip()
                        
                        name = f"{fname} {lname}".strip() if (fname or lname) else 'Kutsero President'
                        
                        user_info = {
                            'name': name,
                            'email': user.get('pres_email', ''),
                            'role': 'Kutsero President',
                            'avatar': '👑',
                            'status': 'active',
                            'profile_image': None
                        }
                        print(f"✓ SUCCESS - Found in kutsero_pres_profile: {name}")
                except Exception as e:
                    print(f"✗ ERROR checking kutsero_pres_profile: {e}")
            
            # If user not found in any table
            if not user_info:
                print(f"\n⚠ WARNING: User {other_user_id} NOT FOUND in any profile table!")
                
                # Try one more time with comprehensive user lookup
                try:
                    comprehensive_info = get_comprehensive_user_info(other_user_id)
                    if comprehensive_info and comprehensive_info.get('name') != 'Unknown User':
                        user_info = {
                            'name': comprehensive_info['name'],
                            'email': comprehensive_info.get('profile', {}).get('email', ''),
                            'role': comprehensive_info.get('role', 'unknown'),
                            'avatar': '👤',
                            'status': 'active',
                            'profile_image': comprehensive_info.get('profile', {}).get('image')
                        }
                        print(f"✓ FOUND via comprehensive lookup: {user_info['name']}")
                    else:
                        raise Exception("Comprehensive lookup also failed")
                except:
                    user_info = {
                        'name': 'Unknown User',
                        'email': '',
                        'role': 'unknown',
                        'avatar': '👤',
                        'status': 'unknown',
                        'profile_image': None
                    }
            
            # Format timestamp to Philippine time
            timestamp_ph = ""
            if conv_data['last_message_time']:
                try:
                    dt = datetime.fromisoformat(conv_data['last_message_time'].replace('Z', '+00:00'))
                    dt_ph = dt.astimezone(PHILIPPINE_TZ)
                    timestamp_ph = dt_ph.strftime('%I:%M %p')
                except Exception as e:
                    print(f"Error formatting timestamp: {e}")
            
            # Combine conversation data with user info
            unread_count = conv_data['unread_count']
            conversation_data = {
                'id': f"{user_id}_{other_user_id}",
                'partner_id': other_user_id,
                'sender': user_info['name'],
                'partner_name': user_info['name'],
                'email': user_info['email'],
                'role': user_info['role'],
                'avatar': user_info['avatar'],
                'status': user_info['status'],
                'profile_image': user_info.get('profile_image'),
                'last_message': conv_data['last_message'],
                'preview': conv_data['last_message'],
                'last_message_time': conv_data['last_message_time'],
                'timestamp': timestamp_ph,
                'is_read': conv_data['is_read'],
                'unread': unread_count > 0,
                'unread_count': unread_count
            }
            print(f"Adding conversation - Name: {user_info['name']}, Role: {user_info['role']}, Profile Image: {user_info.get('profile_image')}")
            conversations_list.append(conversation_data)

        # Sort by last message time
        conversations_list = sorted(
            conversations_list,
            key=lambda x: x['last_message_time'] if x['last_message_time'] else '',
            reverse=True
        )

        print(f"\n{'='*60}")
        print(f"Returning {len(conversations_list)} conversations")
        
        for c in conversations_list:
            print(f"  - {c['sender']}: {c['unread_count']} unread | Time: {c['timestamp']}")
        
        print("=" * 80)

        return Response({
            'conversations': conversations_list,
            'total_count': len(conversations_list)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"❌ ERROR in conversations endpoint: {e}")
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
@api_view(['GET'])
def debug_user_lookup(request):
    """
    Debug endpoint to check where a user exists
    """
    try:
        user_id = request.GET.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        results = {}
        
        # Check users table
        try:
            users_response = service_client.table("users").select("*").eq("id", user_id).execute()
            results['users_table'] = users_response.data
        except Exception as e:
            results['users_table_error'] = str(e)
        
        # Check kutsero table
        try:
            kutsero_response = service_client.table("kutsero").select("*").eq("kutsero_id", user_id).execute()
            results['kutsero_table'] = kutsero_response.data
        except Exception as e:
            results['kutsero_table_error'] = str(e)
        
        # Check vet table
        try:
            vet_response = service_client.table("vet").select("*").eq("vet_id", user_id).execute()
            results['vet_table'] = vet_response.data
        except Exception as e:
            results['vet_table_error'] = str(e)
        
        # Check horse_operator table
        try:
            operator_response = service_client.table("horse_operator").select("*").eq("operator_id", user_id).execute()
            results['horse_operator_table'] = operator_response.data
        except Exception as e:
            results['horse_operator_table_error'] = str(e)
        
        return Response(results, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_conversation(request):
    """
    Delete conversation between two users
    """
    try:
        user_id = request.data.get("user_id")
        contact_id = request.data.get("contact_id")
        
        if not user_id or not contact_id:
            return Response({"error": "user_id and contact_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Delete messages between these users (both directions)
        delete_result = service_client.table("message").delete().or_(
            f"and(user_id.eq.{user_id},receiver_id.eq.{contact_id}),"
            f"and(user_id.eq.{contact_id},receiver_id.eq.{user_id})"
        ).execute()

        logger.info(f"Deleted conversation between {user_id} and {contact_id}")

        return Response({
            "message": "Conversation deleted successfully",
            "note": "The other person can still see all messages."
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



def format_time(timestamp_str):
    """
    Format timestamp to relative time (e.g., "2 hours ago", "Yesterday")
    Converted to Philippines timezone
    """
    try:
        if isinstance(timestamp_str, str):
            if timestamp_str.endswith('Z'):
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            elif '+' in timestamp_str:
                timestamp = datetime.fromisoformat(timestamp_str)
            else:
                timestamp = datetime.fromisoformat(timestamp_str)
        else:
            timestamp = timestamp_str
        
        if timestamp.tzinfo is None:
            timestamp = pytz.UTC.localize(timestamp)
        
        # Convert to Philippines timezone
        philippines_tz = pytz.timezone('Asia/Manila')
        local_time = timestamp.astimezone(philippines_tz)
        now = datetime.now(philippines_tz)
        
        time_diff = now - local_time
        
        # Calculate relative time
        seconds = time_diff.total_seconds()
        
        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes}m ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours}h ago"
        elif seconds < 172800:  # Less than 2 days
            return "Yesterday"
        elif seconds < 604800:  # Less than a week
            days = int(seconds / 86400)
            return f"{days}d ago"
        else:
            # More than a week, show date
            return local_time.strftime('%b %d, %Y')
            
    except Exception as e:
        logger.error(f"Error formatting time {timestamp_str}: {e}")
        return "Unknown time"


def format_message_time(timestamp_str):
    """
    Format message timestamp with smart date handling:
    - Time only (e.g., "1:43 PM") for today's messages
    - "Yesterday 1:43 PM" for yesterday's messages  
    - "Wed 1:43 PM" format for older messages
    All times in Philippines timezone (Asia/Manila)
    """
    try:
        # Parse the timestamp
        if isinstance(timestamp_str, str):
            if timestamp_str.endswith('Z'):
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            elif '+' in timestamp_str:
                timestamp = datetime.fromisoformat(timestamp_str)
            else:
                timestamp = datetime.fromisoformat(timestamp_str)
        else:
            timestamp = timestamp_str
        
        # Ensure UTC timezone
        if timestamp.tzinfo is None:
            timestamp = pytz.UTC.localize(timestamp)
        
        # Convert to Philippines timezone
        philippines_tz = pytz.timezone('Asia/Manila')
        local_time = timestamp.astimezone(philippines_tz)
        now = datetime.now(philippines_tz)
        
        # Get date components (ignore time)
        message_date = local_time.date()
        today_date = now.date()
        yesterday_date = today_date - timedelta(days=1)
        
        # Format time (12-hour format)
        time_str = local_time.strftime('%I:%M %p')
        
        # Determine display format
        if message_date == today_date:
            # Today: Return time only (e.g., "1:43 PM")
            return time_str
        elif message_date == yesterday_date:
            # Yesterday: Return "Yesterday 1:43 PM"
            return f"Yesterday {time_str}"
        else:
            # Past dates: Return "Day 1:43 PM" (e.g., "Wed 1:43 PM")
            day_name = local_time.strftime('%a')  # Short day name (Mon, Tue, Wed)
            return f"{day_name} {time_str}"
            
    except Exception as e:
        logger.error(f"Error formatting message time {timestamp_str}: {e}")
        return "Unknown time"


# ================================================= VET SERVICES ===================================

@api_view(['GET'])
def get_vet_services(request):
    """
    Get all services offered by a specific veterinarian
    """
    vet_id = request.GET.get("vet_id")
    
    if not vet_id:
        return Response({"error": "vet_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        logger.info(f"Fetching services for vet_id: {vet_id}")
        
        # Query the vet_services table
        data = supabase.table("vet_services").select(
            "service_id, vet_id, service_name, description, created_at, updated_at"
        ).eq("vet_id", vet_id).order("service_name", desc=False).execute()
        
        logger.info(f"Found {len(data.data) if data.data else 0} services for vet {vet_id}")
        
        if not data.data:
            # Return default services if no custom services found
            default_services = [
                {"service_id": "1", "service_name": "General Consultation", "description": "Routine health check-up and consultation"},
                {"service_id": "2", "service_name": "Vaccination", "description": "Vaccination services for disease prevention"},
                {"service_id": "3", "service_name": "Dental Care", "description": "Teeth examination and dental procedures"},
                {"service_id": "4", "service_name": "Emergency Care", "description": "Emergency medical treatment"},
                {"service_id": "5", "service_name": "Health Check-up", "description": "Comprehensive health assessment"},
                {"service_id": "6", "service_name": "Medication", "description": "Prescription and administration of medications"},
                {"service_id": "7", "service_name": "Surgery Consultation", "description": "Surgical procedure consultation"},
                {"service_id": "8", "service_name": "Reproductive Services", "description": "Breeding and reproductive health services"}
            ]
            return Response(default_services, status=status.HTTP_200_OK)
        
        # Transform the data
        services = []
        for service in data.data:
            services.append({
                "service_id": str(service.get("service_id")),
                "service_name": service.get("service_name", ""),
                "description": service.get("description", ""),
                "vet_id": str(service.get("vet_id"))
            })
        
        return Response(services, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching vet services for vet_id {vet_id}: {e}")
        return Response({"error": "Failed to fetch veterinarian services", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------ APPOINTMENT API ------------------------------------------------

@api_view(['POST'])
def update_appointment_status(request, app_id):
    """
    Update appointment status and send push notification
    FIXED: Now properly releases appointment_slot when status is declined
    """
    try:
        new_status = request.data.get("status")
        decline_reason = request.data.get("decline_reason")
        
        if not new_status:
            return Response({"error": "status is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate status
        valid_statuses = ["pending", "approved", "declined", "cancelled"]
        if new_status not in valid_statuses:
            return Response({
                "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get current appointment
        appointment_check = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        
        if not appointment_check.data:
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        current_appointment = appointment_check.data[0]
        old_status = current_appointment.get("app_status")
        slot_id = current_appointment.get("slot_id")  # Get the slot_id from appointment
        
        # Update appointment
        update_data = {
            "app_status": new_status,
            "updated_at": datetime.now(pytz.UTC).isoformat()
        }
        
        if decline_reason and new_status == "declined":
            update_data["decline_reason"] = decline_reason
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # ====================== ATOMIC TRANSACTION ======================
        try:
            # 1. UPDATE APPOINTMENT STATUS
            update_result = service_client.table("appointment").update(update_data).eq("app_id", app_id).execute()
            
            if not update_result.data:
                raise Exception("Failed to update appointment status")
            
            logger.info(f"Appointment {app_id} status updated: {old_status} -> {new_status}")
            
            # 2. RELEASE APPOINTMENT SLOT if status is declined or cancelled
            if new_status in ["declined", "cancelled"] and slot_id:
                logger.info(f"Attempting to release appointment slot: {slot_id} for status: {new_status}")
                
                # Check if the appointment slot still exists and is not in the past
                slot_check = service_client.table("appointment_slot").select(
                    "slot_id, slot_date, start_time, is_booked"
                ).eq("slot_id", slot_id).execute()
                
                if slot_check.data and len(slot_check.data) > 0:
                    slot_data = slot_check.data[0]
                    slot_date = slot_data.get("slot_date")
                    start_time = slot_data.get("start_time")
                    
                    # Only release if currently booked and not in the past
                    if (slot_data.get("is_booked", False) and 
                        not is_schedule_in_past(slot_date, start_time)):
                        
                        slot_release = service_client.table("appointment_slot").update({
                            "is_booked": False  # ✅ Set back to FALSE
                        }).eq("slot_id", slot_id).execute()
                        
                        if slot_release.data and len(slot_release.data) > 0:
                            logger.info(f"✅ Appointment slot {slot_id} released successfully (is_booked = FALSE) for {new_status} appointment")
                        else:
                            logger.warning(f"Could not release appointment slot {slot_id}")
                    else:
                        if is_schedule_in_past(slot_date, start_time):
                            logger.info(f"Appointment slot {slot_id} is in the past - not releasing")
                        elif not slot_data.get("is_booked", False):
                            logger.info(f"Appointment slot {slot_id} is already available")
                else:
                    logger.warning(f"Appointment slot {slot_id} not found - may have been deleted")
            else:
                logger.info(f"No slot release needed for status: {new_status}, slot_id: {slot_id}")
            
            updated_appointment = update_result.data[0]
            
            # Log the status change for notification tracking
            logger.info(f"Appointment {app_id} status changed: {old_status} -> {new_status}")
            
            return Response({
                "message": f"Appointment status updated to {new_status}",
                "app_id": app_id,
                "old_status": old_status,
                "new_status": new_status,
                "slot_released": (new_status in ["declined", "cancelled"] and bool(slot_id)),
                "appointment": updated_appointment
            }, status=status.HTTP_200_OK)
            
        except Exception as transaction_error:
            logger.error(f"Transaction error in appointment status update: {transaction_error}")
            return Response({"error": f"Status update failed: {str(transaction_error)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"Error updating appointment status: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def book_appointment(request):
    """
    Book an appointment with a veterinarian - UPDATED TO USE appointment_slot TABLE
    """
    try:
        logger.info(f"Booking appointment request data: {request.data}")
        
        # Validate required fields
        user_id = request.data.get("user_id")
        vet_id = request.data.get("vet_id")
        horse_id = request.data.get("horse_id")
        appointment_date = request.data.get("date")
        appointment_time = request.data.get("time")
        service_type = request.data.get("service")
        notes = request.data.get("notes", "")
        slot_id = request.data.get("slot_id")  # Changed from sched_id to slot_id
        
        # Check for missing required fields
        missing_fields = []
        if not user_id:
            missing_fields.append("user_id")
        if not vet_id:
            missing_fields.append("vet_id")
        if not horse_id:
            missing_fields.append("horse_id")
        if not appointment_date:
            missing_fields.append("date")
        if not appointment_time:
            missing_fields.append("time")
        if not service_type:
            missing_fields.append("service")
        if not slot_id:
            missing_fields.append("slot_id")
            
        # ENHANCED VALIDATION: Require notes/complaint to have actual content
        if not notes or not notes.strip():
            missing_fields.append("notes/complaint description")
        elif len(notes.strip()) < 10:
            return Response({
                "error": "Please provide a more detailed description of your concern or complaint (minimum 10 characters required)"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        if missing_fields:
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            logger.error(error_msg)
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

        # ENHANCED VALIDATION: Verify schedule slot is still available and not in the past
        try:
            service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            # Check appointment_slot table instead of vet_schedule
            schedule_check = service_client.table("appointment_slot").select(
                "slot_id, slot_date, start_time, end_time, is_booked"
            ).eq("slot_id", slot_id).execute()
            
            if not schedule_check.data or len(schedule_check.data) == 0:
                error_msg = f"Schedule slot not found: {slot_id}"
                logger.error(error_msg)
                return Response({"error": "Selected time slot is no longer available"}, status=status.HTTP_400_BAD_REQUEST)
            
            schedule_slot = schedule_check.data[0]
            
            # Check if the slot is still available (not booked)
            if schedule_slot.get("is_booked", False):
                logger.error(f"Schedule slot {slot_id} is already booked")
                return Response({"error": "This time slot has been booked by another user. Please select a different time."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if the schedule is in the past
            slot_date = schedule_slot.get("slot_date")
            start_time = schedule_slot.get("start_time")
            
            if is_schedule_in_past(slot_date, start_time):
                logger.error(f"Schedule slot {slot_id} is in the past: {slot_date} {start_time}")
                return Response({"error": "The selected time slot has already passed. Please select a current or future time slot."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate date matching
            if slot_date != appointment_date:
                logger.error(f"Schedule date mismatch - Expected: {appointment_date}, Got: {slot_date}")
                return Response({"error": "Schedule data mismatch. Please refresh and try again."}, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Valid schedule slot found: {schedule_slot}")
            
        except Exception as schedule_error:
            logger.error(f"Error validating schedule: {schedule_error}")
            return Response({"error": "Error validating schedule availability"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # [Rest of the validation for vet_id and horse_id remains the same...]

        # Generate UUID for appointment
        app_id = str(uuid.uuid4())
        current_timestamp = datetime.now(pytz.UTC).isoformat()
        
        logger.info(f"Generated appointment ID: {app_id}")

        # ====================== ATOMIC TRANSACTION ======================
        try:
            service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            # Get the actual start and end times from schedule for storage
            schedule_check = service_client.table("appointment_slot").select("*").eq("slot_id", slot_id).execute()
            schedule_slot = schedule_check.data[0]
            start_time = schedule_slot.get("start_time")
            end_time = schedule_slot.get("end_time")
            time_display = format_time_range(start_time, end_time) if end_time else format_time_to_12_hour(start_time)
            
            # 1. INSERT APPOINTMENT WITH CREATED_AT TIMESTAMP
            appointment_payload = {
                "app_id": app_id,
                "app_service": service_type,
                "app_date": appointment_date,
                "app_time": appointment_time,
                "app_complain": notes.strip(),
                "user_id": user_id,
                "horse_id": horse_id,
                "vet_id": vet_id,
                "slot_id": slot_id,  # Changed from sched_id to slot_id
                "app_status": "pending",
                "created_at": current_timestamp,
                "updated_at": current_timestamp
            }
            
            logger.info(f"Inserting appointment with payload (notes length: {len(notes.strip())}): {appointment_payload}")
            appointment_result = service_client.table("appointment").insert(appointment_payload).execute()
            
            if not appointment_result.data or len(appointment_result.data) == 0:
                raise Exception("Failed to create appointment record")
            
            logger.info(f"Appointment created successfully: {appointment_result.data[0]}")
            
            # 2. UPDATE SLOT AVAILABILITY (mark as booked)
            logger.info(f"Marking slot {slot_id} as booked")
            slot_update = service_client.table("appointment_slot").update({
                "is_booked": True
            }).eq("slot_id", slot_id).execute()
            
            if not slot_update.data or len(slot_update.data) == 0:
                # Rollback: Delete the appointment we just created
                service_client.table("appointment").delete().eq("app_id", app_id).execute()
                return Response({"error": "Failed to reserve time slot. Please try again."}, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Slot {slot_id} marked as booked successfully")
            
            # SUCCESS: Both operations completed
            return Response({
                "message": "Appointment booked successfully",
                "app_id": app_id,
                "appointment_data": appointment_result.data[0],
                "schedule_reserved": True,
                "time_range": time_display,
                "formatted_time": time_display,
                "created_at": current_timestamp,
                "notes_length": len(notes.strip())
            }, status=status.HTTP_201_CREATED)
            
        except Exception as transaction_error:
            logger.error(f"Transaction error in appointment booking: {transaction_error}")
            
            # Cleanup attempt
            try:
                service_client.table("appointment").delete().eq("app_id", app_id).execute()
            except:
                pass
            
            return Response({"error": f"Booking failed: {str(transaction_error)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Exception in book_appointment: {str(e)}", exc_info=True)
        return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def cancel_appointment(request, app_id):
    """
    Cancel an appointment and release the appointment slot
    UPDATED: Now correctly releases appointment_slot instead of vet_schedule
    """
    try:
        logger.info(f"Attempting to cancel appointment: {app_id}")
        
        # First check if appointment exists and get slot info
        appointment_check = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        
        if not appointment_check.data or len(appointment_check.data) == 0:
            logger.error(f"Appointment not found: {app_id}")
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        appointment = appointment_check.data[0]
        logger.info(f"Found appointment: {appointment}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # ====================== ATOMIC TRANSACTION ======================
        try:
            # 1. UPDATE APPOINTMENT STATUS
            update_result = service_client.table("appointment").update({
                "app_status": "cancelled",
                "updated_at": datetime.now().isoformat()
            }).eq("app_id", app_id).execute()
            
            if not update_result.data or len(update_result.data) == 0:
                raise Exception("Failed to update appointment status")
            
            logger.info(f"Appointment status updated to cancelled: {app_id}")
            
            # 2. RELEASE APPOINTMENT SLOT (if slot_id exists and not in past)
            slot_id = appointment.get("slot_id")  # ✅ Changed from sched_id to slot_id
            if slot_id:
                logger.info(f"Attempting to release appointment slot: {slot_id}")
                
                # Check if the appointment slot still exists and is not in the past
                slot_check = service_client.table("appointment_slot").select(
                    "slot_id, slot_date, start_time, is_booked"
                ).eq("slot_id", slot_id).execute()
                
                if slot_check.data and len(slot_check.data) > 0:
                    slot_data = slot_check.data[0]
                    slot_date = slot_data.get("slot_date")
                    start_time = slot_data.get("start_time")
                    
                    # Only release if not in the past and currently booked
                    if (not is_schedule_in_past(slot_date, start_time) and 
                        slot_data.get("is_booked", False)):
                        
                        slot_release = service_client.table("appointment_slot").update({
                            "is_booked": False  # ✅ Set back to FALSE
                        }).eq("slot_id", slot_id).execute()
                        
                        if slot_release.data and len(slot_release.data) > 0:
                            logger.info(f"Appointment slot {slot_id} released successfully (is_booked = FALSE)")
                        else:
                            logger.warning(f"Could not release appointment slot {slot_id}")
                    else:
                        if is_schedule_in_past(slot_date, start_time):
                            logger.info(f"Appointment slot {slot_id} is in the past - not releasing")
                        elif not slot_data.get("is_booked", False):
                            logger.info(f"Appointment slot {slot_id} is already available")
                else:
                    logger.warning(f"Appointment slot {slot_id} not found - may have been deleted")
            else:
                logger.info("No slot_id found in appointment - skipping slot release")
            
            return Response({
                "message": "Appointment cancelled successfully",
                "app_id": app_id,
                "slot_released": bool(slot_id)
            }, status=status.HTTP_200_OK)
            
        except Exception as transaction_error:
            logger.error(f"Transaction error in appointment cancellation: {transaction_error}")
            return Response({"error": f"Cancellation failed: {str(transaction_error)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error cancelling appointment {app_id}: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_appointment(request, app_id):
    """
    Delete an appointment and release the schedule slot
    """
    try:
        logger.info(f"Attempting to delete appointment: {app_id}")
        
        # First check if appointment exists and get schedule info
        appointment_check = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        
        if not appointment_check.data or len(appointment_check.data) == 0:
            logger.error(f"Appointment not found: {app_id}")
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        appointment = appointment_check.data[0]
        logger.info(f"Found appointment: {appointment}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # ====================== ATOMIC TRANSACTION ======================
        try:
            # 1. DELETE APPOINTMENT RECORD
            delete_result = service_client.table("appointment").delete().eq("app_id", app_id).execute()
            
            if not delete_result.data or len(delete_result.data) == 0:
                raise Exception("Failed to delete appointment")
            
            logger.info(f"Appointment deleted successfully: {app_id}")
            
            # 2. RELEASE SCHEDULE SLOT (if sched_id exists and not in past)
            sched_id = appointment.get("sched_id")
            if sched_id:
                logger.info(f"Attempting to release schedule slot: {sched_id}")
                
                # Check if the schedule slot still exists and is not in the past
                schedule_check = service_client.table("vet_schedule").select(
                    "sched_id, sched_date, start_time"
                ).eq("sched_id", sched_id).execute()
                
                if schedule_check.data and len(schedule_check.data) > 0:
                    schedule_slot = schedule_check.data[0]
                    sched_date = schedule_slot.get("sched_date")
                    start_time = schedule_slot.get("start_time")
                    
                    # Only release if not in the past
                    if not is_schedule_in_past(sched_date, start_time):
                        schedule_release = service_client.table("vet_schedule").update({
                            "is_available": True
                        }).eq("sched_id", sched_id).execute()
                        
                        if schedule_release.data and len(schedule_release.data) > 0:
                            logger.info(f"Schedule slot {sched_id} released successfully")
                        else:
                            logger.warning(f"Could not release schedule slot {sched_id}")
                    else:
                        logger.info(f"Schedule slot {sched_id} is in the past - not releasing")
                else:
                    logger.warning(f"Schedule slot {sched_id} not found - may have been deleted")
            else:
                logger.info("No sched_id found in appointment - skipping schedule release")
            
            return Response({
                "message": "Appointment deleted successfully",
                "app_id": app_id,
                "schedule_released": bool(sched_id)
            }, status=status.HTTP_200_OK)
            
        except Exception as transaction_error:
            logger.error(f"Transaction error in appointment deletion: {transaction_error}")
            return Response({"error": f"Deletion failed: {str(transaction_error)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error deleting appointment {app_id}: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['DELETE'])
def delete_appointment_permanently(request, app_id):
    """
    Permanently delete an appointment from the database
    This action cannot be undone and is only allowed for cancelled/declined appointments
    """
    try:
        logger.info(f"Attempting to permanently delete appointment: {app_id}")
        
        # First check if appointment exists and get its details
        appointment_check = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        
        if not appointment_check.data or len(appointment_check.data) == 0:
            logger.error(f"Appointment not found: {app_id}")
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        appointment = appointment_check.data[0]
        appointment_status = appointment.get("app_status", "")
        
        logger.info(f"Found appointment: {appointment}")
        logger.info(f"Appointment status: {appointment_status}")
        
        # SECURITY CHECK: Only allow deletion of cancelled or declined appointments
        if appointment_status not in ['cancelled', 'declined']:
            logger.warning(f"Attempted to delete non-cancelled appointment {app_id} with status: {appointment_status}")
            return Response({
                "error": f"Cannot permanently delete appointment with status '{appointment_status}'. Only cancelled or declined appointments can be permanently deleted."
            }, status=status.HTTP_403_FORBIDDEN)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get additional info for logging before deletion
        user_id = appointment.get("user_id")
        vet_id = appointment.get("vet_id")
        horse_id = appointment.get("horse_id")
        app_date = appointment.get("app_date")
        app_service = appointment.get("app_service")
        
        # Log the deletion attempt for audit purposes
        logger.warning(f"🗑️ PERMANENT DELETION - User: {user_id}, Appointment: {app_id}, Service: {app_service}, Date: {app_date}, Status: {appointment_status}")
        
        try:
            # Perform the permanent deletion
            delete_result = service_client.table("appointment").delete().eq("app_id", app_id).execute()
            
            if not delete_result.data or len(delete_result.data) == 0:
                logger.error(f"Failed to delete appointment {app_id} from database")
                return Response({"error": "Failed to delete appointment from database"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            deleted_appointment = delete_result.data[0]
            logger.info(f"Successfully deleted appointment permanently: {app_id}")
            
            # Optional: Check if there's an associated schedule slot to release (if not already released)
            sched_id = appointment.get("sched_id")
            if sched_id:
                logger.info(f"Checking schedule slot {sched_id} for potential release")
                
                # Check if the schedule slot still exists and release it if not in the past
                schedule_check = service_client.table("vet_schedule").select(
                    "sched_id, sched_date, start_time, is_available"
                ).eq("sched_id", sched_id).execute()
                
                if schedule_check.data and len(schedule_check.data) > 0:
                    schedule_slot = schedule_check.data[0]
                    sched_date = schedule_slot.get("sched_date")
                    start_time = schedule_slot.get("start_time")
                    is_currently_available = schedule_slot.get("is_available", True)
                    
                    # Only release if currently unavailable and not in the past
                    if not is_currently_available and not is_schedule_in_past(sched_date, start_time):
                        schedule_release = service_client.table("vet_schedule").update({
                            "is_available": True
                        }).eq("sched_id", sched_id).execute()
                        
                        if schedule_release.data and len(schedule_release.data) > 0:
                            logger.info(f"Released schedule slot {sched_id} after permanent deletion")
                        else:
                            logger.warning(f"Could not release schedule slot {sched_id} after permanent deletion")
                    else:
                        if is_currently_available:
                            logger.info(f"Schedule slot {sched_id} is already available")
                        else:
                            logger.info(f"Schedule slot {sched_id} is in the past - not releasing")
                else:
                    logger.info(f"Schedule slot {sched_id} not found - may have been deleted")
            
            return Response({
                "message": "Appointment deleted permanently",
                "app_id": app_id,
                "deleted_appointment": deleted_appointment,
                "status": appointment_status,
                "schedule_released": bool(sched_id),
                "action": "permanent_deletion"
            }, status=status.HTTP_200_OK)
            
        except Exception as deletion_error:
            logger.error(f"Error during permanent deletion of appointment {app_id}: {deletion_error}", exc_info=True)
            return Response({
                "error": f"Database deletion failed: {str(deletion_error)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error permanently deleting appointment {app_id}: {e}", exc_info=True)
        return Response({
            "error": f"Internal server error: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def bulk_delete_old_cancelled_appointments(request):
    """
    Utility endpoint to bulk delete old cancelled/declined appointments
    This can be used for cleanup purposes
    """
    try:
        user_id = request.data.get("user_id")  # Optional: filter by user
        days_old = request.data.get("days_old", 30)  # Default: delete appointments older than 30 days
        
        if not isinstance(days_old, int) or days_old < 7:
            return Response({
                "error": "days_old must be an integer >= 7 (minimum 1 week old)"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Calculate cutoff date
        cutoff_date = (datetime.now() - timedelta(days=days_old)).date().isoformat()
        logger.info(f"Bulk deleting cancelled/declined appointments older than {cutoff_date}")
        
        # Build query
        query = service_client.table("appointment").select("*").in_("app_status", ["cancelled", "declined"]).lt("app_date", cutoff_date)
        
        # Optionally filter by user
        if user_id:
            query = query.eq("user_id", user_id)
            logger.info(f"Filtering bulk delete for user_id: {user_id}")
        
        old_appointments = query.execute()
        
        if not old_appointments.data:
            return Response({
                "message": "No old cancelled/declined appointments found to delete",
                "deleted_count": 0
            }, status=status.HTTP_200_OK)
        
        deleted_count = 0
        errors = []
        
        for appointment in old_appointments.data:
            try:
                app_id = appointment.get("app_id")
                app_date = appointment.get("app_date")
                app_status = appointment.get("app_status")
                
                # Log the deletion for audit
                logger.warning(f"🗑️ BULK DELETION - App ID: {app_id}, Date: {app_date}, Status: {app_status}")
                
                # Delete the appointment permanently
                delete_result = service_client.table("appointment").delete().eq("app_id", app_id).execute()
                
                if delete_result.data and len(delete_result.data) > 0:
                    deleted_count += 1
                    logger.info(f"Successfully deleted appointment {app_id}")
                    
                    # Optional: Release associated schedule slot if not in past
                    sched_id = appointment.get("sched_id")
                    if sched_id:
                        try:
                            schedule_check = service_client.table("vet_schedule").select(
                                "sched_id, sched_date, start_time, is_available"
                            ).eq("sched_id", sched_id).execute()
                            
                            if schedule_check.data and len(schedule_check.data) > 0:
                                schedule_slot = schedule_check.data[0]
                                sched_date = schedule_slot.get("sched_date")
                                start_time = schedule_slot.get("start_time")
                                is_currently_available = schedule_slot.get("is_available", True)
                                
                                # Only release if currently unavailable and not in the past
                                if not is_currently_available and not is_schedule_in_past(sched_date, start_time):
                                    service_client.table("vet_schedule").update({
                                        "is_available": True
                                    }).eq("sched_id", sched_id).execute()
                                    logger.info(f"Released schedule slot {sched_id} during bulk deletion")
                        except Exception as schedule_error:
                            logger.warning(f"Could not release schedule slot {sched_id}: {schedule_error}")
                else:
                    errors.append(f"Failed to delete appointment {app_id}")
                    logger.error(f"Failed to delete appointment {app_id}")
                    
            except Exception as delete_error:
                error_msg = f"Error deleting appointment {app_id}: {str(delete_error)}"
                errors.append(error_msg)
                logger.error(error_msg)
                continue
        
        # Prepare response
        response_data = {
            "message": f"Bulk deletion completed. Deleted {deleted_count} appointments.",
            "deleted_count": deleted_count,
            "total_found": len(old_appointments.data),
            "cutoff_date": cutoff_date,
            "days_old": days_old
        }
        
        if user_id:
            response_data["user_id"] = user_id
        
        if errors:
            response_data["errors"] = errors
            response_data["error_count"] = len(errors)
        
        logger.info(f"Bulk deletion summary: {deleted_count} deleted, {len(errors)} errors")
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in bulk delete old appointments: {e}", exc_info=True)
        return Response({
            "error": f"Internal server error: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['POST'])
def bulk_release_schedules(request):
    """
    Utility endpoint to bulk release appointment slots from cancelled/declined appointments
    UPDATED: Now works with appointment_slot table instead of vet_schedule
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get all cancelled or declined appointments with slot IDs
        cancelled_appointments = service_client.table("appointment").select(
            "app_id, slot_id, app_status, app_date"
        ).in_("app_status", ["cancelled", "declined"]).execute()
        
        if not cancelled_appointments.data:
            return Response({
                "message": "No cancelled/declined appointments found",
                "released_slots": 0
            }, status=status.HTTP_200_OK)
        
        released_count = 0
        processed_slots = set()  # Avoid duplicate processing
        
        for appointment in cancelled_appointments.data:
            slot_id = appointment.get("slot_id")
            if not slot_id or slot_id in processed_slots:
                continue
            
            processed_slots.add(slot_id)
            
            # Check if appointment slot exists and get its details
            slot_check = service_client.table("appointment_slot").select(
                "slot_id, slot_date, start_time, is_booked"
            ).eq("slot_id", slot_id).execute()
            
            if slot_check.data and len(slot_check.data) > 0:
                slot_data = slot_check.data[0]
                
                # Only release if currently booked and not in the past
                if (slot_data.get("is_booked", False) and 
                    not is_schedule_in_past(slot_data.get("slot_date"), slot_data.get("start_time"))):
                    
                    release_result = service_client.table("appointment_slot").update({
                        "is_booked": False  # ✅ Set back to FALSE
                    }).eq("slot_id", slot_id).execute()
                    
                    if release_result.data:
                        released_count += 1
                        logger.info(f"Released appointment slot {slot_id} (is_booked = FALSE)")
        
        return Response({
            "message": f"Bulk release completed. Released {released_count} appointment slots.",
            "released_slots": released_count,
            "processed_appointments": len(cancelled_appointments.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in bulk slot release: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Enhanced helper function to release schedule slot
def release_schedule_slot(sched_id, reason="manual"):
    """
    Helper function to release a schedule slot
    Returns True if released, False if not released (with reason logged)
    """
    if not sched_id:
        logger.warning("No sched_id provided for schedule release")
        return False
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if schedule exists and get its details
        schedule_check = service_client.table("vet_schedule").select(
            "sched_id, sched_date, start_time, is_available"
        ).eq("sched_id", sched_id).execute()
        
        if not schedule_check.data or len(schedule_check.data) == 0:
            logger.warning(f"Schedule slot {sched_id} not found")
            return False
        
        schedule_slot = schedule_check.data[0]
        sched_date = schedule_slot.get("sched_date")
        start_time = schedule_slot.get("start_time")
        is_available = schedule_slot.get("is_available", True)
        
        # Check if already available
        if is_available:
            logger.info(f"Schedule slot {sched_id} is already available")
            return True
        
        # Check if in the past
        if is_schedule_in_past(sched_date, start_time):
            logger.info(f"Schedule slot {sched_id} is in the past - not releasing")
            return False
        
        # Release the slot
        release_result = service_client.table("vet_schedule").update({
            "is_available": True
        }).eq("sched_id", sched_id).execute()
        
        if release_result.data and len(release_result.data) > 0:
            logger.info(f"Schedule slot {sched_id} released successfully (reason: {reason})")
            return True
        else:
            logger.error(f"Failed to release schedule slot {sched_id}")
            return False
            
    except Exception as e:
        logger.error(f"Error releasing schedule slot {sched_id}: {e}")
        return False


@api_view(['GET'])
def get_appointments(request):
    """
    Get all appointments for a user with vet + horse info, formatted times, and created_at timestamp
    """
    user_id = request.GET.get("user_id")
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        appointments_data = supabase.table("appointment").select("*").eq("user_id", user_id).order("app_date", desc=True).execute()

        appointments = []
        for appt in appointments_data.data:
            # Format the appointment time if it's in 24-hour format
            app_time = appt.get("app_time", "")
            if app_time and not any(period in app_time.upper() for period in ['AM', 'PM']):
                if '-' in app_time:
                    time_parts = app_time.split(' - ')
                    if len(time_parts) == 2:
                        formatted_start = format_time_to_12_hour(time_parts[0].strip())
                        formatted_end = format_time_to_12_hour(time_parts[1].strip())
                        app_time = f"{formatted_start} - {formatted_end}"
                else:
                    app_time = format_time_to_12_hour(app_time)
            
            appointment_item = {
                "id": appt["app_id"],
                "app_id": appt["app_id"],
                "userId": appt["user_id"],
                "contactId": appt["vet_id"],
                "contactName": "Unknown Vet",
                "horseName": "Unknown Horse",
                "service": appt["app_service"],
                "date": appt["app_date"],
                "time": app_time,
                "notes": appt.get("app_complain", ""),
                "status": appt.get("app_status", "scheduled"),
                "declineReason": appt.get("decline_reason"),
                "schedId": appt.get("sched_id"),
                "created_at": appt.get("created_at")  # ADD THIS LINE
            }

            # Fetch vet info (same as before)
            try:
                vet_data = supabase.table("vet_profile").select("vet_fname, vet_lname").eq("vet_id", appt["vet_id"]).execute()
                if vet_data.data:
                    vet_info = vet_data.data[0]
                    appointment_item["contactName"] = f" {vet_info['vet_fname']} {vet_info['vet_lname']}"
            except Exception as ve:
                logger.warning(f"Vet info fetch failed: {ve}")

            # Fetch horse info (same as before)
            try:
                horse_data = supabase.table("horse_profile").select("horse_name").eq("horse_id", appt["horse_id"]).execute()
                if horse_data.data:
                    horse_info = horse_data.data[0]
                    appointment_item["horseName"] = horse_info["horse_name"]
            except Exception as he:
                logger.warning(f"Horse info fetch failed: {he}")

            appointments.append(appointment_item)

        return Response(appointments, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
# ------------------------------------------------ ANNOUNCEMENT ------------------------------------------------

@api_view(["GET"])
def get_announcements(request):
    """
    Fetch announcements from Supabase with comment counts and multiple images.
    Enhanced to show announcement title instead of user name.
    """
    try:
        logger.info("Fetching announcements...")

        if 'supabase' not in globals():
            logger.error("Supabase client not initialized")
            return Response(
                {"error": "Database connection not available"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Fetch announcements
        announcements_response = supabase.table("announcement") \
            .select("*") \
            .order("announce_date", desc=True) \
            .execute()

        logger.info(f"Found {len(announcements_response.data) if announcements_response.data else 0} announcements")

        if not announcements_response.data:
            return Response({"announcements": []}, status=status.HTTP_200_OK)

        announcements_with_counts = []
        SUPABASE_BASE_URL = "https://drgknejiqupegkyxfaab.supabase.co"
        BUCKET_NAME = "announcement-img"

        # Create service client
        service_client = create_client(SUPABASE_BASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        for announcement in announcements_response.data:
            announce_id = announcement.get("announce_id")
            if not announce_id:
                continue

            # 🔹 Get comment count
            comment_count = 0
            try:
                comment_count_response = supabase.table("comment") \
                    .select("id", count="exact") \
                    .eq("announcement_id", announce_id) \
                    .execute()
                comment_count = comment_count_response.count or 0
            except Exception as comment_error:
                logger.warning(f"Error getting comment count for {announce_id}: {comment_error}")

            # 🔹 Get announcement title - THIS IS THE MAIN DISPLAY NAME NOW
            announcement_title = announcement.get("announce_title", "Announcement")
            
            # 🔹 Get user info for metadata/profile picture only
            user_profile_image = None
            posted_by_id = (
                announcement.get("user_id")
                or announcement.get("created_by")
                or announcement.get("author_id")
                or announcement.get("ctu_id")
                or announcement.get("dvmf_id")
            )

            if posted_by_id:
                try:
                    # Try CTU user first
                    user_response = service_client.table("ctu_vet_profile") \
                        .select("ctu_fname, ctu_lname") \
                        .eq("ctu_id", posted_by_id) \
                        .execute()

                    if user_response.data and len(user_response.data) > 0:
                        # For CTU, use CTU logo
                        user_profile_image = "CTU_LOGO"
                        logger.info(f"CTU user found, using CTU logo")
                    else:
                        # Try DVMF user next
                        user_response = service_client.table("dvmf_user_profile") \
                            .select("dvmf_fname, dvmf_lname") \
                            .eq("dvmf_id", posted_by_id) \
                            .execute()

                        if user_response.data and len(user_response.data) > 0:
                            # For DVMF, use DVMF logo
                            user_profile_image = "DVMF_LOGO"
                            logger.info(f"DVMF user found, using DVMF logo")
                        else:
                            logger.warning(f"User not found in either table for ID {posted_by_id}")
                except Exception as user_error:
                    logger.error(f"Error fetching user info: {user_error}")

            # 🔹 Handle multiple image URLs
            image_urls = []
            announce_img = announcement.get("announce_img")

            if announce_img:
                try:
                    import json
                    if isinstance(announce_img, str) and announce_img.startswith('['):
                        img_array = json.loads(announce_img)
                        for img in img_array:
                            if isinstance(img, str):
                                if img.startswith('http'):
                                    image_urls.append(img)
                                elif img.strip():
                                    image_urls.append(f"{SUPABASE_BASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{img.strip()}")
                    elif isinstance(announce_img, str) and announce_img.startswith('http'):
                        image_urls.append(announce_img)
                    elif isinstance(announce_img, str) and ',' in announce_img:
                        filenames = [f.strip() for f in announce_img.split(',') if f.strip()]
                        for f in filenames:
                            if f.startswith('http'):
                                image_urls.append(f)
                            else:
                                image_urls.append(f"{SUPABASE_BASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{f}")
                    elif isinstance(announce_img, str) and announce_img.strip():
                        image_urls.append(f"{SUPABASE_BASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{announce_img.strip()}")
                except Exception as img_error:
                    logger.warning(f"Error parsing images for {announce_id}: {img_error}")

            # 🔹 Combine all info into one response object
            # ✅ NOW USING ANNOUNCEMENT TITLE AS THE AUTHOR/USER NAME
            announcement_data = {
                "id": str(announce_id),
                "announce_id": announce_id,
                "announce_title": announcement_title,
                "announce_content": announcement.get("announce_content", ""),
                "announce_date": announcement.get("announce_date", ""),
                "announce_status": announcement.get("announce_status", "active"),
                "created_at": announcement.get("created_at", ""),
                "comment_count": comment_count,
                "user_name": announcement_title,  # ✅ USE ANNOUNCEMENT TITLE AS DISPLAY NAME
                "user_profile_image": user_profile_image,  # CTU_LOGO or DVMF_LOGO for profile picture
                "image_url": image_urls or None
            }

            announcements_with_counts.append(announcement_data)

        logger.info(f"Returning {len(announcements_with_counts)} announcements")
        return Response(
            {"announcements": announcements_with_counts},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error in get_announcements: {e}")
        logger.error(traceback.format_exc())
        return Response(
            {"error": "Internal server error occurred while fetching announcements"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def fetch_user_details(service_client, user_id, logger):
    """
    Helper function to fetch user details from multiple possible tables
    Uses service client to bypass RLS policies
    Returns a dict with user information or defaults for unknown users
    """
    try:
        if not user_id:
            return {
                "fname": "Anonymous",
                "lname": "User",
                "username": "Anonymous User",
                "email": None,
            }
        
        logger.info(f"[DEBUG] Fetching user details for user_id: {user_id}")
        
        # Try kutsero_profile table first
        try:
            logger.info(f"[DEBUG] Checking kutsero_profile for user_id: {user_id}")
            profile_response = service_client.table("kutsero_profile") \
                .select("*") \
                .eq("kutsero_id", user_id) \
                .execute()
            
            logger.info(f"[DEBUG] kutsero_profile response: {profile_response.data}")
            
            if profile_response.data and len(profile_response.data) > 0:
                profile_data = profile_response.data[0]
                fname = profile_data.get("kutsero_fname", "Unknown")
                lname = profile_data.get("kutsero_lname", "User")
                username = profile_data.get("kutsero_username")
                
                logger.info(f"[DEBUG] Found in kutsero_profile: {fname} {lname}")
                return {
                    "fname": fname,
                    "lname": lname,
                    "username": username if username else f"{fname} {lname}".strip(),
                    "email": None,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking kutsero_profile: {e}")
        
        # Try ctu_vet_profile table
        try:
            logger.info(f"[DEBUG] Checking ctu_vet_profile for ctu_id: {user_id}")
            ctu_response = service_client.table("ctu_vet_profile") \
                .select("*") \
                .eq("ctu_id", user_id) \
                .execute()
            
            logger.info(f"[DEBUG] ctu_vet_profile response: {ctu_response.data}")
            
            if ctu_response.data and len(ctu_response.data) > 0:
                ctu_data = ctu_response.data[0]
                # Try to get full name first, then fall back to fname/lname
                full_name = ctu_data.get("ctu_name") or ctu_data.get("name")
                
                if full_name:
                    # Split full name into first and last
                    name_parts = full_name.split(maxsplit=1)
                    fname = name_parts[0] if len(name_parts) > 0 else "CTU"
                    lname = name_parts[1] if len(name_parts) > 1 else "User"
                else:
                    # Use separate name fields
                    fname = ctu_data.get("ctu_fname", "CTU")
                    lname = ctu_data.get("ctu_lname", "User")
                
                username = ctu_data.get("ctu_username")
                
                logger.info(f"[DEBUG] Found in ctu_vet_profile: {fname} {lname}")
                return {
                    "fname": fname,
                    "lname": lname,
                    "username": username if username else f"{fname} {lname}".strip(),
                    "email": None,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking ctu_vet_profile: {e}")
        
        # Try dvmf_user_profile table
        try:
            logger.info(f"[DEBUG] Checking dvmf_user_profile for dvmf_id: {user_id}")
            dvmf_response = service_client.table("dvmf_user_profile") \
                .select("*") \
                .eq("dvmf_id", user_id) \
                .execute()
            
            logger.info(f"[DEBUG] dvmf_user_profile response: {dvmf_response.data}")
            
            if dvmf_response.data and len(dvmf_response.data) > 0:
                dvmf_data = dvmf_response.data[0]
                # Try to get full name first, then fall back to fname/lname
                full_name = dvmf_data.get("dvmf_name") or dvmf_data.get("name")
                
                if full_name:
                    # Split full name into first and last
                    name_parts = full_name.split(maxsplit=1)
                    fname = name_parts[0] if len(name_parts) > 0 else "DVMF"
                    lname = name_parts[1] if len(name_parts) > 1 else "User"
                else:
                    # Use separate name fields
                    fname = dvmf_data.get("dvmf_fname", "DVMF")
                    lname = dvmf_data.get("dvmf_lname", "User")
                
                username = dvmf_data.get("dvmf_username")
                
                logger.info(f"[DEBUG] Found in dvmf_user_profile: {fname} {lname}")
                return {
                    "fname": fname,
                    "lname": lname,
                    "username": username if username else f"{fname} {lname}".strip(),
                    "email": None,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking dvmf_user_profile: {e}")
        
        # Try generic users table as last resort
        try:
            logger.info(f"[DEBUG] Checking users table for id: {user_id}")
            user_response = service_client.table("users") \
                .select("*") \
                .eq("id", user_id) \
                .execute()
            
            logger.info(f"[DEBUG] users table response: {user_response.data}")
            
            if user_response.data and len(user_response.data) > 0:
                user_data = user_response.data[0]
                
                # Try different possible field names
                fname = (user_data.get("first_name") or 
                        user_data.get("fname") or 
                        user_data.get("name") or "User")
                lname = (user_data.get("last_name") or 
                        user_data.get("lname") or "")
                username = user_data.get("username")
                
                # If we have a full name field and no separate fname/lname
                if not lname and "name" in user_data:
                    name_parts = user_data["name"].split(maxsplit=1)
                    fname = name_parts[0] if len(name_parts) > 0 else "User"
                    lname = name_parts[1] if len(name_parts) > 1 else ""
                
                # Fallback: use first 8 chars of ID as identifier
                if fname == "User" and not lname:
                    user_id_str = str(user_data.get("id", ""))
                    lname = user_id_str[:8]
                
                logger.info(f"[DEBUG] Found in users table: {fname} {lname}")
                return {
                    "fname": fname,
                    "lname": lname if lname else "User",
                    "username": username if username else f"{fname} {lname}".strip() if lname else fname,
                    "email": None,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking users table: {e}")
        
        # User not found in any table - let's try one more thing: check auth.users
        try:
            logger.info(f"[DEBUG] Checking auth.users table for id: {user_id}")
            auth_response = service_client.table("auth.users") \
                .select("*") \
                .eq("id", user_id) \
                .execute()
            
            logger.info(f"[DEBUG] auth.users response: {auth_response.data}")
            
            if auth_response.data and len(auth_response.data) > 0:
                auth_data = auth_response.data[0]
                email = auth_data.get("email", "")
                
                # Use email username as identifier
                email_username = email.split("@")[0] if email else f"User {str(user_id)[:8]}"
                
                logger.info(f"[DEBUG] Found in auth.users: {email}")
                return {
                    "fname": email_username,
                    "lname": "User",
                    "username": email_username,
                    "email": email,
                }
        except Exception as e:
            logger.warning(f"[WARN] Error checking auth.users: {e}")
        
        # User not found in any table
        logger.warning(f"[WARN] User {user_id} not found in any profile table")
        logger.warning(f"[WARN] Returning default values for Unknown User")
        return {
            "fname": "Unknown",
            "lname": "User",
            "username": "Unknown User",
            "email": None,
        }
        
    except Exception as e:
        logger.error(f"[ERROR] Error in fetch_user_details: {e}")
        return {
            "fname": "Unknown",
            "lname": "User",
            "username": "Unknown User",
            "email": None,
        }


@api_view(['GET'])
def get_user_posts(request, user_id):
    """
    Get all posts/announcements created by a specific user (CTU or DVMF)
    Returns posts with formatted data for display in profile
    """
    try:
        logger.info(f"Fetching posts for user_id: {user_id}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Fetch announcements created by this user (only using user_id column)
        announcements_response = service_client.table("announcement").select("*").eq(
            "user_id", user_id
        ).order("announce_date", desc=True).execute()
        
        if not announcements_response.data:
            logger.info(f"No posts found for user {user_id}")
            return Response({
                "user_id": user_id,
                "posts": [],
                "total_count": 0,
                "message": "No posts found"
            }, status=status.HTTP_200_OK)
        
        # Format posts
        formatted_posts = []
        
        for announcement in announcements_response.data:
            # Parse announcement images
            image_urls = []
            announce_img = announcement.get("announce_img")
            
            if announce_img:
                try:
                    import json
                    if isinstance(announce_img, str) and announce_img.startswith('['):
                        img_array = json.loads(announce_img)
                        for img in img_array:
                            if isinstance(img, str) and img.strip():
                                if img.startswith('http'):
                                    image_urls.append(img)
                                else:
                                    image_urls.append(f"{SUPABASE_URL}/storage/v1/object/public/announcement-img/{img.strip()}")
                    elif isinstance(announce_img, str) and announce_img.strip():
                        if announce_img.startswith('http'):
                            image_urls.append(announce_img)
                        else:
                            image_urls.append(f"{SUPABASE_URL}/storage/v1/object/public/announcement-img/{announce_img.strip()}")
                except Exception as img_error:
                    logger.warning(f"Error parsing images: {img_error}")
            
            # Get first image URL for thumbnail
            first_image = image_urls[0] if image_urls else None
            
            # Format announcement date
            announce_date = announcement.get("announce_date")
            formatted_date = "Unknown date"
            
            if announce_date:
                try:
                    date_obj = datetime.fromisoformat(str(announce_date).replace('Z', '+00:00'))
                    formatted_date = date_obj.strftime('%B %d, %Y at %I:%M %p')
                except:
                    formatted_date = str(announce_date)
            
            # Determine if it's an announcement (you can add logic based on your needs)
            is_announcement = True  # Since all entries in announcement table are announcements
            
            # Get category if exists (you can add a category field to announcement table)
            category = "General"  # Default category
            
            formatted_posts.append({
                "id": str(announcement.get("announce_id")),
                "title": announcement.get("announce_title", "Untitled"),
                "content": announcement.get("announce_content", ""),
                "author": "User",  # Will be filled by frontend from profile
                "author_role": "CTU/DVMF",  # Will be filled by frontend
                "created_at": announce_date,
                "formatted_date": formatted_date,
                "image_url": first_image,  # Single image for preview
                "all_images": image_urls,  # All images
                "is_announcement": is_announcement,
                "category": category,
                "status": "active"
            })
        
        logger.info(f"✅ Returning {len(formatted_posts)} posts for user {user_id}")
        
        return Response({
            "user_id": user_id,
            "posts": formatted_posts,
            "total_count": len(formatted_posts),
            "message": f"Found {len(formatted_posts)} post(s)"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ Error fetching user posts: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch user posts",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


#------------------------------------------------------------ TIME -------------------------------------------------

# Utility function to convert 24-hour time to 12-hour format
def format_time_to_12_hour(time_24):
    """
    Convert 24-hour time format to 12-hour format with AM/PM
    Examples: 
    - "15:00" -> "3:00 PM"
    - "09:30" -> "9:30 AM"
    - "00:00" -> "12:00 AM"
    """
    try:
        if not time_24:
            return time_24
        
        # Handle time formats like "15:00:00" or "15:00"
        time_parts = str(time_24).split(':')
        if len(time_parts) < 2:
            return str(time_24)
        
        hours = int(time_parts[0])
        minutes = time_parts[1]
        
        # Determine AM/PM
        period = 'AM' if hours < 12 else 'PM'
        
        # Convert to 12-hour format
        if hours == 0:
            display_hour = 12  # 00:xx becomes 12:xx AM
        elif hours > 12:
            display_hour = hours - 12  # 13:xx becomes 1:xx PM
        else:
            display_hour = hours  # 1-12 stays the same
        
        return f"{display_hour}:{minutes} {period}"
    except (ValueError, IndexError) as e:
        logger.error(f'Error formatting time {time_24}: {e}')
        return str(time_24)  # Return original if parsing fails


def format_time_range(start_time, end_time):
    """
    Format time range for display
    Example: "15:00", "16:00" -> "3:00 PM - 4:00 PM"
    """
    try:
        formatted_start = format_time_to_12_hour(start_time)
        formatted_end = format_time_to_12_hour(end_time)
        return f"{formatted_start} - {formatted_end}"
    except Exception as e:
        logger.error(f'Error formatting time range {start_time}-{end_time}: {e}')
        return f"{start_time} - {end_time}"


def is_schedule_in_past(schedule_date, start_time):
    """
    Check if a schedule slot is in the past
    """
    try:
        # Get current date and time
        now = datetime.now()
        current_date = now.date()
        current_time = now.time()
        
        # Parse schedule date
        if isinstance(schedule_date, str):
            schedule_date_obj = datetime.strptime(schedule_date, '%Y-%m-%d').date()
        else:
            schedule_date_obj = schedule_date
        
        # If schedule date is before today, it's in the past
        if schedule_date_obj < current_date:
            return True
        
        # If schedule date is today, check the time
        if schedule_date_obj == current_date:
            # Parse start time
            if isinstance(start_time, str):
                # Handle different time formats
                time_str = str(start_time).split(':')
                if len(time_str) >= 2:
                    schedule_hour = int(time_str[0])
                    schedule_minute = int(time_str[1])
                    schedule_time_obj = datetime.now().replace(
                        hour=schedule_hour, 
                        minute=schedule_minute, 
                        second=0, 
                        microsecond=0
                    ).time()
                    
                    return schedule_time_obj <= current_time
            
        # If schedule date is in the future, it's not in the past
        return False
    except Exception as e:
        logger.error(f'Error checking if schedule is in past: {e}')
        return False  # If there's an error, assume it's not in the past to be safe

# ------------------------------------------------ RESCHEDULE LIMIT API ------------------------------------------------

@api_view(['GET'])
def check_reschedule_eligibility(request):
    """
    Check if an appointment can be rescheduled (within 1 hour of creation)
    """
    app_id = request.GET.get("app_id")
    if not app_id:
        return Response({"error": "app_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Get appointment details
        appointment_data = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        
        if not appointment_data.data or len(appointment_data.data) == 0:
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        appointment = appointment_data.data[0]
        
        # Check if appointment can be rescheduled
        eligibility_result = can_reschedule_appointment(appointment)
        
        return Response({
            "app_id": app_id,
            "can_reschedule": eligibility_result["can_reschedule"],
            "reason": eligibility_result["reason"],
            "created_at": appointment.get("created_at"),
            "hours_since_creation": eligibility_result.get("hours_since_creation", 0),
            "remaining_minutes": eligibility_result.get("remaining_minutes", 0)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error checking reschedule eligibility: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def reschedule_appointment(request):
    """
    Reschedule an appointment to a new time slot (with 1-hour limit check)
    """
    try:
        app_id = request.data.get("app_id")
        new_sched_id = request.data.get("new_sched_id")
        new_date = request.data.get("new_date")
        new_time = request.data.get("new_time")
        
        if not all([app_id, new_sched_id, new_date, new_time]):
            return Response({
                "error": "app_id, new_sched_id, new_date, and new_time are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get current appointment
        appointment_data = supabase.table("appointment").select("*").eq("app_id", app_id).execute()
        
        if not appointment_data.data:
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        appointment = appointment_data.data[0]
        
        # Check reschedule eligibility
        eligibility_result = can_reschedule_appointment(appointment)
        
        if not eligibility_result["can_reschedule"]:
            return Response({
                "error": "Reschedule not allowed",
                "reason": eligibility_result["reason"]
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate new schedule slot
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        new_schedule_check = service_client.table("vet_schedule").select("*").eq("sched_id", new_sched_id).eq("is_available", True).execute()
        
        if not new_schedule_check.data:
            return Response({
                "error": "Selected time slot is not available"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        new_schedule = new_schedule_check.data[0]
        
        # Check if new schedule is not in the past
        if is_schedule_in_past(new_schedule["sched_date"], new_schedule["start_time"]):
            return Response({
                "error": "Cannot reschedule to a past time slot"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Perform atomic reschedule operation
        try:
            old_sched_id = appointment.get("sched_id")
            
            # 1. Update appointment with new schedule info
            update_result = service_client.table("appointment").update({
                "sched_id": new_sched_id,
                "app_date": new_date,
                "app_time": new_time,
                "app_status": "pending",  # Reset to pending for vet approval
                "updated_at": datetime.now().isoformat()
            }).eq("app_id", app_id).execute()
            
            if not update_result.data:
                raise Exception("Failed to update appointment")
            
            # 2. Mark new schedule as unavailable
            service_client.table("vet_schedule").update({
                "is_available": False
            }).eq("sched_id", new_sched_id).execute()
            
            # 3. Release old schedule slot (if not in past)
            if old_sched_id:
                old_schedule_check = service_client.table("vet_schedule").select("*").eq("sched_id", old_sched_id).execute()
                if old_schedule_check.data:
                    old_schedule = old_schedule_check.data[0]
                    if not is_schedule_in_past(old_schedule["sched_date"], old_schedule["start_time"]):
                        service_client.table("vet_schedule").update({
                            "is_available": True
                        }).eq("sched_id", old_sched_id).execute()
            
            logger.info(f"Appointment {app_id} rescheduled successfully")
            
            return Response({
                "message": "Appointment rescheduled successfully",
                "app_id": app_id,
                "new_date": new_date,
                "new_time": new_time,
                "status": "pending"
            }, status=status.HTTP_200_OK)
            
        except Exception as transaction_error:
            logger.error(f"Error during reschedule transaction: {transaction_error}")
            return Response({
                "error": "Reschedule failed during processing"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error rescheduling appointment: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------ RESCHEDULE HELPER FUNCTIONS ------------------------------------------------

def can_reschedule_appointment(appointment):
    """
    Check if an appointment can be rescheduled based on creation time (1 hour limit)
    Returns dict with can_reschedule, reason, and additional info
    """
    try:
        created_at = appointment.get("created_at")
        
        if not created_at:
            # For backward compatibility - allow reschedule if no creation timestamp
            logger.warning("No creation timestamp found, allowing reschedule for backward compatibility")
            return {
                "can_reschedule": True, 
                "reason": "No creation timestamp - allowed for backward compatibility",
                "hours_since_creation": 0,
                "remaining_minutes": 60
            }
        
        # Parse creation timestamp
        try:
            if isinstance(created_at, str):
                # Handle different timestamp formats
                if created_at.endswith('Z'):
                    created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                elif '+' in created_at or created_at.endswith('00'):
                    created_time = datetime.fromisoformat(created_at)
                else:
                    created_time = datetime.fromisoformat(created_at)
            else:
                created_time = created_at
            
            # Ensure timezone awareness
            if created_time.tzinfo is None:
                created_time = pytz.UTC.localize(created_time)
            
        except Exception as parse_error:
            logger.error(f"Error parsing creation timestamp {created_at}: {parse_error}")
            return {
                "can_reschedule": True, 
                "reason": "Error parsing timestamp - allowed for safety",
                "hours_since_creation": 0,
                "remaining_minutes": 60
            }
        
        # Get current time
        current_time = datetime.now(pytz.UTC)
        
        # Calculate time difference
        time_difference = current_time - created_time
        hours_difference = time_difference.total_seconds() / 3600
        
        # Check if within 1 hour limit
        if hours_difference > 1:
            hours_passed_formatted = f"{hours_difference:.1f}"
            return {
                "can_reschedule": False,
                "reason": f"Reschedule period expired. {hours_passed_formatted} hours have passed since booking. Reschedule is only allowed within 1 hour of booking.",
                "hours_since_creation": hours_difference,
                "remaining_minutes": 0
            }
        
        # Calculate remaining minutes
        remaining_seconds = max(0, 3600 - time_difference.total_seconds())
        remaining_minutes = remaining_seconds / 60
        
        return {
            "can_reschedule": True,
            "reason": f"{int(remaining_minutes)} minutes remaining to reschedule",
            "hours_since_creation": hours_difference,
            "remaining_minutes": remaining_minutes
        }
        
    except Exception as e:
        logger.error(f"Error checking reschedule eligibility: {e}")
        # In case of error, allow reschedule for safety
        return {
            "can_reschedule": True, 
            "reason": "Error checking eligibility - allowed for safety",
            "hours_since_creation": 0,
            "remaining_minutes": 60
        }

# ----------------------------------------- HORSE HANDLER -----------------------------------------

def format_image_url(image_path, folder='kutsero_images'):
    """
    Helper function to format image URLs consistently
    """
    if not image_path:
        return None
    
    # If already a full URL, return as-is
    if image_path.startswith('http://') or image_path.startswith('https://'):
        return image_path
    
    # If it's a path like 'kutsero_images/filename.jpg'
    if '/' in image_path:
        # Remove any leading slash
        clean_path = image_path.lstrip('/')
        return f"{SUPABASE_URL}/storage/v1/object/public/{clean_path}"
    
    # If it's just a filename
    return f"{SUPABASE_URL}/storage/v1/object/public/{folder}/{image_path}"


@api_view(['GET'])
def get_horse_assignments(request):
    """
    Get horse assignments for horses owned by a specific operator
    Optional: Filter by specific horse_id if provided
    FIXED: Now properly returns kutsero image URLs
    """
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")  # Optional parameter
    
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # First, get the horse IDs owned by this operator
        horses_query = service_client.table("horse_profile").select("horse_id").eq("op_id", user_id).execute()
        
        if not horses_query.data:
            logger.info(f"No horses found for operator {user_id}")
            return Response([], status=status.HTTP_200_OK)
        
        horse_ids = [horse["horse_id"] for horse in horses_query.data]
        logger.info(f"Found {len(horse_ids)} horses for operator {user_id}")
        
        # If specific horse_id is provided, validate it belongs to this operator
        if horse_id:
            if horse_id not in horse_ids:
                logger.warning(f"Horse {horse_id} does not belong to operator {user_id}")
                return Response({"error": "Horse not found or not owned by this operator"}, status=status.HTTP_404_NOT_FOUND)
            
            # Filter to only this specific horse
            horse_ids = [horse_id]
            logger.info(f"Filtering assignments for specific horse: {horse_id}")
        
        # Get assignments for these horses
        assignments_data = service_client.table("horse_assignment").select("*").in_("horse_id", horse_ids).order("date_start", desc=True).execute()
        
        assignments = []
        for assignment in assignments_data.data:
            # Get kutsero info using the correct field names from kutsero_profile table
            kutsero_data = service_client.table("kutsero_profile").select(
                "kutsero_fname, kutsero_mname, kutsero_lname, kutsero_image"
            ).eq("kutsero_id", assignment["kutsero_id"]).execute()
            
            kutsero_name = ""
            kutsero_image = None
            
            if kutsero_data.data and len(kutsero_data.data) > 0:
                kutsero = kutsero_data.data[0]
                fname = kutsero.get('kutsero_fname', '')
                mname = kutsero.get('kutsero_mname', '')
                lname = kutsero.get('kutsero_lname', '')
                
                # Build full name with middle name if available
                if mname and mname.strip():
                    kutsero_name = f"{fname} {mname} {lname}".strip()
                else:
                    kutsero_name = f"{fname} {lname}".strip()
                
                # Get kutsero image and construct full URL if needed
                kutsero_image = kutsero.get('kutsero_image')
                if kutsero_image:
                    if not (kutsero_image.startswith('http://') or kutsero_image.startswith('https://')):
                        # Construct full URL for storage
                        if kutsero_image.startswith('kutsero_images/'):
                            kutsero_image = f"{SUPABASE_URL}/storage/v1/object/public/{kutsero_image}"
                        else:
                            kutsero_image = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_images/{kutsero_image}"
            
            # Get horse info
            horse_data = service_client.table("horse_profile").select("horse_name").eq("horse_id", assignment["horse_id"]).execute()
            horse_name = "Unknown Horse"
            if horse_data.data:
                horse_name = horse_data.data[0].get("horse_name", "Unknown Horse")
            
            # Build assignment object
            assignments.append({
                "assign_id": assignment["assign_id"],
                "kutsero_id": assignment["kutsero_id"],
                "horse_id": assignment["horse_id"],
                "date_start": assignment["date_start"],
                "date_end": assignment.get("date_end"),
                "created_at": assignment["created_at"],
                "updated_at": assignment["updated_at"],
                "kutsero_name": kutsero_name,
                "horse_name": horse_name,
                "kutsero_image": kutsero_image  # Now properly formatted URL
            })
        
        logger.info(f"Returning {len(assignments)} assignments for {'specific horse' if horse_id else 'all horses'}")
        return Response(assignments, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching horse assignments: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ------------------------------------------------ MEDICAL RECORDS API (CORRECTED) ------------------------------------------------

@api_view(['GET'])
def get_horse_medical_records(request):
    """
    Get medical records for a specific horse - CORRECTED VERSION
    Matches the actual database schema
    """
    horse_id = request.GET.get("horse_id")
    user_id = request.GET.get("user_id")
    
    if not horse_id or not user_id:
        return Response({
            "error": "horse_id and user_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Verify the horse belongs to the user
        horse_check = supabase.table("horse_profile").select(
            "horse_name, op_id"
        ).eq("horse_id", horse_id).eq("op_id", user_id).execute()
        
        if not horse_check.data:
            return Response({
                "error": "Horse not found or doesn't belong to user"
            }, status=status.HTTP_404_NOT_FOUND)
        
        horse_info = horse_check.data[0]
        logger.info(f"Fetching medical records for horse {horse_id} owned by user {user_id}")
        
        # Get medical records for this horse - using correct field names
        medical_records = supabase.table("horse_medical_record").select("*").eq(
            "medrec_horse_id", horse_id
        ).order("medrec_date", desc=True).execute()
        
        if not medical_records.data:
            logger.info(f"No medical records found for horse {horse_id}")
            return Response({
                "horse_id": horse_id,
                "horse_name": horse_info.get("horse_name", "Unknown Horse"),
                "medical_records": [],
                "total_records": 0,
                "message": "No medical records found for this horse"
            }, status=status.HTTP_200_OK)
        
        # Collect all unique vet IDs for batch fetching
        vet_ids = list(set([
            record.get("medrec_vet_id") 
            for record in medical_records.data 
            if record.get("medrec_vet_id")
        ]))
        
        # Fetch all vet info in ONE query
        vet_info_map = {}
        if vet_ids:
            try:
                vet_data = supabase.table("vet_profile").select(
                    "vet_id, vet_fname, vet_lname, vet_specialization"
                ).in_("vet_id", vet_ids).execute()
                
                if vet_data.data:
                    for vet in vet_data.data:
                        vet_info_map[vet["vet_id"]] = {
                            "name": f" {vet['vet_fname']} {vet['vet_lname']}",
                            "specialization": vet.get("vet_specialization", "")
                        }
                    logger.info(f"Fetched info for {len(vet_info_map)} veterinarians")
                    
            except Exception as vet_error:
                logger.warning(f"Could not fetch vet info (non-fatal): {vet_error}")
        
        # Transform medical records to match frontend expectations
        formatted_records = []
        for record in medical_records.data:
            # Get veterinarian information from map (with fallback)
            vet_id = record.get("medrec_vet_id")
            vet_info = vet_info_map.get(vet_id, {
                "name": "Unknown Veterinarian", 
                "specialization": ""
            })
            
            # Format the date for display
            record_date = record.get("medrec_date")
            formatted_date = "Unknown Date"
            if record_date:
                try:
                    date_obj = datetime.strptime(str(record_date), '%Y-%m-%d')
                    formatted_date = date_obj.strftime('%B %d, %Y')
                except Exception as date_error:
                    logger.warning(f"Error formatting date {record_date}: {date_error}")
                    formatted_date = str(record_date)
            
            # Build the formatted record matching your schema
            formatted_record = {
                "medrec_id": record["medrec_id"],
                "horse_id": record["medrec_horse_id"],
                "vet_id": record["medrec_vet_id"],
                "vet_name": vet_info["name"],
                "vet_specialization": vet_info["specialization"],
                "date": record["medrec_date"],
                "formatted_date": formatted_date,
                
                # Vital signs
                "vital_signs": {
                    "heart_rate": record["medrec_heart_rate"],
                    "respiratory_rate": record["medrec_resp_rate"],
                    "body_temperature": record["medrec_body_temp"]
                },
                
                # Clinical findings
                "clinical_findings": {
                    "clinical_signs": record["medrec_clinical_signs"],
                    "diagnostic_protocol": record["medrec_diagnostic_protocol"],
                    "lab_results": record.get("medrec_lab_results"),
                    "lab_image": record.get("medrec_lab_img")
                },
                
                # Assessment
                "assessment": {
                    "diagnosis": record["medrec_diagnosis"],
                    "prognosis": record["medrec_prognosis"],
                    "recommendations": record["medrec_recommendation"]
                },
                
                # Additional fields from your schema
                "horse_status": record.get("medrec_horsestatus"),
                "parent_medrec_id": record.get("parent_medrec_id"),
                "followup_date": record.get("medrec_followup_date")
            }
            
            formatted_records.append(formatted_record)
        
        logger.info(f"Returning {len(formatted_records)} medical records for horse {horse_id}")
        
        return Response({
            "horse_id": horse_id,
            "horse_name": horse_info.get("horse_name", "Unknown Horse"),
            "medical_records": formatted_records,
            "total_records": len(formatted_records),
            "message": f"Found {len(formatted_records)} medical record(s)"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching medical records for horse {horse_id}: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch medical records",
            "detail": "Please try again. If the problem persists, contact support."
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_medical_record_details(request):
    """
    Get details of a specific medical record by ID - ULTIMATE FIXED VERSION
    Now properly handles both images and PDFs from Supabase Storage with URL validation
    """
    medrec_id = request.GET.get("medrec_id")
    user_id = request.GET.get("user_id")
    
    if not medrec_id or not user_id:
        return Response({
            "error": "medrec_id and user_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get the medical record with ALL fields
        medical_record = supabase.table("horse_medical_record").select(
            "*"
        ).eq("medrec_id", medrec_id).execute()
        
        if not medical_record.data:
            return Response({
                "error": "Medical record not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        record = medical_record.data[0]
        horse_id = record["medrec_horse_id"]
        
        # Verify the horse belongs to the user
        horse_check = supabase.table("horse_profile").select(
            "horse_name, op_id"
        ).eq("horse_id", horse_id).eq("op_id", user_id).execute()
        
        if not horse_check.data:
            return Response({
                "error": "Medical record not found or access denied"
            }, status=status.HTTP_403_FORBIDDEN)
        
        horse_info = horse_check.data[0]
        
        # Get veterinarian information
        vet_name = "Unknown Veterinarian"
        vet_info_full = {}
        
        vet_id = record.get("medrec_vet_id")
        if vet_id:
            try:
                vet_data = supabase.table("vet_profile").select("*").eq(
                    "vet_id", vet_id
                ).execute()
                
                if vet_data.data:
                    vet_profile = vet_data.data[0]
                    vet_name = f" {vet_profile['vet_fname']} {vet_profile['vet_lname']}"
                    vet_info_full = {
                        "vet_id": vet_id,
                        "name": vet_name,
                        "first_name": vet_profile.get("vet_fname", ""),
                        "last_name": vet_profile.get("vet_lname", ""),
                        "email": vet_profile.get("vet_email", ""),
                        "phone": vet_profile.get("vet_phone_num", ""),
                        "specialization": vet_profile.get("vet_specialization", "")
                    }
            except Exception as vet_error:
                logger.warning(f"Could not fetch vet info for record {medrec_id}: {vet_error}")
        
        # Format the examination date
        record_date = record.get("medrec_date")
        formatted_date = "Unknown Date"
        if record_date:
            try:
                date_obj = datetime.strptime(str(record_date), '%Y-%m-%d')
                formatted_date = date_obj.strftime('%B %d, %Y')
            except:
                formatted_date = str(record_date)
        
        # Format followup date if exists
        followup_date = record.get("medrec_followup_date")
        followup_date_formatted = None
        if followup_date:
            try:
                followup_obj = datetime.strptime(str(followup_date), '%Y-%m-%d')
                followup_date_formatted = followup_obj.strftime('%B %d, %Y')
            except:
                followup_date_formatted = str(followup_date)
        
        # Get parent medical record info if this is a follow-up
        parent_record_info = None
        parent_medrec_id = record.get("parent_medrec_id")
        if parent_medrec_id:
            try:
                parent_record = supabase.table("horse_medical_record").select(
                    "medrec_id, medrec_date, medrec_diagnosis"
                ).eq("medrec_id", parent_medrec_id).execute()
                
                if parent_record.data:
                    parent_data = parent_record.data[0]
                    parent_date = parent_data.get("medrec_date")
                    parent_date_formatted = "Unknown Date"
                    if parent_date:
                        try:
                            parent_date_obj = datetime.strptime(str(parent_date), '%Y-%m-%d')
                            parent_date_formatted = parent_date_obj.strftime('%B %d, %Y')
                        except:
                            parent_date_formatted = str(parent_date)
                    
                    parent_record_info = {
                        "medrec_id": parent_data["medrec_id"],
                        "medrec_date": parent_date,
                        "formatted_date": parent_date_formatted,
                        "diagnosis": parent_data.get("medrec_diagnosis", "")
                    }
            except Exception as parent_error:
                logger.warning(f"Could not fetch parent record info: {parent_error}")
        
        # ✅ FIXED: Properly handle lab image/document URLs from JSON arrays
        lab_file_url = record.get("medrec_lab_img")
        formatted_lab_file_url = None
        file_type = "unknown"
        
        if lab_file_url:
            try:
                # Log the raw value from database
                logger.info(f"📄 Raw lab file value from DB: {lab_file_url}")
                
                # Convert to string and clean
                lab_file_str = str(lab_file_url).strip()
                
                # Handle JSON array format
                if lab_file_str.startswith('[') and lab_file_str.endswith(']'):
                    try:
                        # Try to parse as JSON array
                        import json
                        url_array = json.loads(lab_file_str)
                        
                        if url_array and len(url_array) > 0:
                            # Get the first URL from the array
                            lab_file_url = str(url_array[0]).strip()
                            logger.info(f"✅ Extracted URL from JSON array: {lab_file_url}")
                        else:
                            logger.warning("JSON array is empty")
                            lab_file_url = None
                    except json.JSONDecodeError:
                        # If JSON parsing fails, extract manually
                        logger.info("Manual extraction from array-like string")
                        lab_file_str = lab_file_str.strip('[]')
                        # Split by comma and get first item
                        parts = lab_file_str.split(',')
                        if parts and len(parts) > 0:
                            lab_file_url = parts[0].strip().strip('"\'').strip()
                            logger.info(f"✅ Manually extracted URL: {lab_file_url}")
                        else:
                            lab_file_url = None
                else:
                    # Already a string URL
                    lab_file_url = lab_file_str.strip()
                
                # If we have a URL, process it
                if lab_file_url and lab_file_url != 'None' and lab_file_url != 'null':
                    # Remove any remaining quotes
                    lab_file_url = lab_file_url.replace('"', '').replace("'", '').strip()
                    
                    # Determine file type
                    lab_file_url_lower = lab_file_url.lower()
                    if '.pdf' in lab_file_url_lower:
                        file_type = "pdf"
                    elif any(ext in lab_file_url_lower for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']):
                        file_type = "image"
                    else:
                        # Default to image if unknown but has image-like content
                        file_type = "image"
                    
                    logger.info(f"📁 File type determined: {file_type}")
                    
                    # Remove any existing query parameters
                    if '?' in lab_file_url:
                        lab_file_url = lab_file_url.split('?')[0]
                    
                    # Case 1: Already a complete public URL
                    if lab_file_url.startswith('https://') or lab_file_url.startswith('http://'):
                        formatted_lab_file_url = lab_file_url
                        logger.info(f"✅ Using existing full URL: {formatted_lab_file_url}")
                    
                    # Case 2: Storage path without full URL
                    else:
                        # Clean the path
                        path_parts = lab_file_url.split('/')
                        clean_parts = []
                        for part in path_parts:
                            part = part.strip()
                            if part and part not in ['"', "'", '[', ']', '{', '}']:
                                clean_parts.append(part)
                        
                        filename = clean_parts[-1] if clean_parts else f"lab_result_{medrec_id}"
                        
                        # Construct proper Supabase public URL
                        formatted_lab_file_url = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{filename}"
                        logger.info(f"✅ Constructed public URL: {formatted_lab_file_url}")
                    
                    # Final cleanup
                    if formatted_lab_file_url:
                        # Remove any remaining invalid characters
                        invalid_chars = ['[', ']', '{', '}', '(', ')', ' ', '\\']
                        for char in invalid_chars:
                            formatted_lab_file_url = formatted_lab_file_url.replace(char, '')
                        
                        # Ensure it's a proper URL
                        if not formatted_lab_file_url.startswith('https://'):
                            logger.error(f"❌ Invalid URL after processing: {formatted_lab_file_url}")
                            formatted_lab_file_url = None
                        else:
                            logger.info(f"✅ Final validated URL: {formatted_lab_file_url}")
                            
                            # Optional: Test URL accessibility
                            try:
                                import requests
                                test_response = requests.head(formatted_lab_file_url, timeout=3, allow_redirects=True)
                                logger.info(f"✅ URL test response: {test_response.status_code}")
                                
                                if test_response.status_code >= 400:
                                    logger.warning(f"⚠️ URL might not be accessible: HTTP {test_response.status_code}")
                                    # Still return URL, let frontend handle the error
                            except Exception as test_error:
                                logger.warning(f"⚠️ Could not test URL (non-critical): {test_error}")
                                # Continue anyway, URL might still work in browser
                else:
                    logger.info("No valid lab file URL found")
                    formatted_lab_file_url = None
                
            except Exception as url_error:
                logger.error(f"❌ Error processing lab file URL: {url_error}", exc_info=True)
                formatted_lab_file_url = None
                file_type = "unknown"
        else:
            logger.info("No lab file in this record")
            formatted_lab_file_url = None
        
        # Generate a fallback filename
        file_name = f"lab_result_{medrec_id}"
        if formatted_lab_file_url:
            try:
                # Extract filename from URL
                if '/' in formatted_lab_file_url:
                    file_name = formatted_lab_file_url.split('/')[-1].split('?')[0]
            except:
                pass
        
        # Build detailed response
        detailed_record = {
            "medrec_id": record["medrec_id"],
            "horse": {
                "horse_id": horse_id,
                "horse_name": horse_info.get("horse_name", "Unknown Horse"),
                "status": record.get("medrec_horsestatus")
            },
            "veterinarian": vet_info_full,
            "examination_date": record["medrec_date"],
            "formatted_date": formatted_date,
            
            "vital_signs": {
                "heart_rate": record["medrec_heart_rate"],
                "respiratory_rate": record["medrec_resp_rate"],
                "body_temperature": record["medrec_body_temp"]
            },
            
            "clinical_examination": {
                "clinical_signs": record["medrec_clinical_signs"],
                "diagnostic_protocol": record["medrec_diagnostic_protocol"]
            },
            
            "laboratory": {
                "results": record.get("medrec_lab_results"),
                "file_url": formatted_lab_file_url,
                "file_type": file_type,
                "file_name": file_name
            },
            
            "assessment": {
                "diagnosis": record["medrec_diagnosis"],
                "prognosis": record["medrec_prognosis"],
                "recommendations": record["medrec_recommendation"]
            },
            
            "followup": {
                "parent_record_id": parent_medrec_id,
                "parent_record_info": parent_record_info,
                "followup_date": followup_date,
                "followup_date_formatted": followup_date_formatted,
                "is_followup": bool(parent_medrec_id)
            }
        }
        
        logger.info(f"✅ Returning detailed medical record {medrec_id}")
        logger.info(f"📎 Lab file: {formatted_lab_file_url}")
        logger.info(f"📄 File type: {file_type}")
        
        return Response(detailed_record, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ Error fetching medical record details {medrec_id}: {e}", exc_info=True)
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_medical_records_summary(request):
    """
    Get a summary of medical records for all horses owned by a user - CORRECTED VERSION
    """
    user_id = request.GET.get("user_id")
    
    if not user_id:
        return Response({
            "error": "user_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get all horses owned by this user
        horses_data = supabase.table("horse_profile").select(
            "horse_id, horse_name"
        ).eq("op_id", user_id).execute()
        
        if not horses_data.data:
            return Response({
                "user_id": user_id,
                "horses_summary": [],
                "total_horses": 0,
                "total_records": 0,
                "message": "No horses found for this user"
            }, status=status.HTTP_200_OK)
        
        horses_summary = []
        total_records = 0
        
        for horse in horses_data.data:
            horse_id = horse["horse_id"]
            horse_name = horse["horse_name"]
            
            # Get medical records count for this horse
            records_data = supabase.table("horse_medical_record").select(
                "medrec_id, medrec_date, medrec_vet_id"
            ).eq("medrec_horse_id", horse_id).order("medrec_date", desc=True).execute()
            
            records_count = len(records_data.data) if records_data.data else 0
            total_records += records_count
            
            # Get last medical record info
            last_record_info = {
                "date": None,
                "formatted_date": "Never",
                "vet_name": "No records",
                "days_ago": None
            }
            
            if records_data.data and len(records_data.data) > 0:
                last_record = records_data.data[0]  # Most recent
                last_date = last_record.get("medrec_date")
                
                if last_date:
                    try:
                        # Calculate days ago
                        record_date = datetime.strptime(str(last_date), '%Y-%m-%d').date()
                        current_date = datetime.now().date()
                        days_difference = (current_date - record_date).days
                        
                        # Format relative time
                        if days_difference == 0:
                            relative_time = "Today"
                        elif days_difference == 1:
                            relative_time = "Yesterday"
                        elif days_difference <= 7:
                            relative_time = f"{days_difference} days ago"
                        elif days_difference <= 30:
                            weeks_ago = days_difference // 7
                            relative_time = f"{weeks_ago} week{'s' if weeks_ago != 1 else ''} ago"
                        elif days_difference <= 365:
                            months_ago = days_difference // 30
                            relative_time = f"{months_ago} month{'s' if months_ago != 1 else ''} ago"
                        else:
                            years_ago = days_difference // 365
                            relative_time = f"{years_ago} year{'s' if years_ago != 1 else ''} ago"
                        
                        # Format date for display
                        formatted_date = datetime.strptime(str(last_date), '%Y-%m-%d').strftime('%b %d, %Y')
                        
                        last_record_info.update({
                            "date": str(last_date),
                            "formatted_date": f"{formatted_date} ({relative_time})",
                            "days_ago": days_difference
                        })
                        
                        # Get vet name for last record
                        vet_id = last_record.get("medrec_vet_id")
                        if vet_id:
                            try:
                                vet_data = supabase.table("vet_profile").select(
                                    "vet_fname, vet_lname"
                                ).eq("vet_id", vet_id).execute()
                                if vet_data.data:
                                    vet_info = vet_data.data[0]
                                    last_record_info["vet_name"] = f" {vet_info['vet_fname']} {vet_info['vet_lname']}"
                            except:
                                last_record_info["vet_name"] = "Unknown Veterinarian"
                        
                    except Exception as date_error:
                        logger.error(f"Error processing last record date for horse {horse_id}: {date_error}")
            
            horses_summary.append({
                "horse_id": horse_id,
                "horse_name": horse_name,
                "total_records": records_count,
                "last_record": last_record_info
            })
        
        logger.info(f"Returning medical records summary for {len(horses_summary)} horses, {total_records} total records")
        
        return Response({
            "user_id": user_id,
            "horses_summary": horses_summary,
            "total_horses": len(horses_summary),
            "total_records": total_records,
            "message": f"Summary for {len(horses_summary)} horse(s) with {total_records} total medical record(s)"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching medical records summary for user {user_id}: {e}")
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ================================================ ENHANCED COMMENT API WITH REPLIES ================================================

@api_view(['GET'])
def get_announcement_comments(request):
    """
    Get ALL comments for a specific announcement INCLUDING replies
    Returns both parent comments and their nested replies in a structured format
    Optimized to use database indexes (idx_comment_announcement_id, idx_comment_created_at)
    """
    announcement_id = request.GET.get("announcement_id")
    
    if not announcement_id:
        return Response({
            "error": "announcement_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # ✅ Validate announcement_id is a valid UUID
        try:
            uuid.UUID(announcement_id)
        except ValueError:
            return Response({
                "error": "Invalid announcement_id format. Must be a valid UUID."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ✅ Fetch ALL comments for this announcement (uses idx_comment_announcement_id index)
        # Ordered by created_at (uses idx_comment_created_at index)
        all_comments_data = service_client.table("comment").select(
            "id, comment_text, comment_date, user_id, announcement_id, "
            "created_at, updated_at, parent_comment_id, reply_level, reply_count"
        ).eq(
            "announcement_id", announcement_id
        ).order("created_at", desc=False).execute()
        
        if not all_comments_data.data:
            return Response({
                "announcement_id": announcement_id,
                "comments": [],
                "replies": {},
                "total_comments": 0,
                "total_replies": 0,
                "message": "No comments found for this announcement"
            }, status=status.HTTP_200_OK)
        
        logger.info(f"📊 Retrieved {len(all_comments_data.data)} total comments from database")
        
        # ✅ Separate parent comments and replies with batch user info fetching
        parent_comments = []
        replies_map = {}
        
        # Collect all unique user IDs for batch fetching
        user_ids = list(set([comment["user_id"] for comment in all_comments_data.data]))
        
        # Batch fetch user info (more efficient than one-by-one)
        user_info_cache = {}
        for user_id in user_ids:
            user_info_cache[user_id] = get_comprehensive_user_info(user_id)
        
        # Process comments with cached user info
        for comment in all_comments_data.data:
            user_info = user_info_cache.get(comment["user_id"], {
                "name": "Unknown User",
                "role": "user",
                "profile": {}
            })
            
            comment_date = comment.get("comment_date") or comment.get("created_at")
            relative_time = format_relative_time(comment_date)
            
            formatted_comment = {
                "id": str(comment["id"]),  # Ensure UUID is string
                "text": comment["comment_text"],
                "user": user_info["name"],
                "user_id": str(comment["user_id"]),  # Ensure UUID is string
                "user_role": user_info["role"],
                "user_profile": user_info["profile"],
                "time": relative_time,
                "formatted_date": comment_date,
                "comment_date": comment_date,
                "parent_comment_id": str(comment["parent_comment_id"]) if comment.get("parent_comment_id") else None,
                "reply_level": comment.get("reply_level", 0),
                "reply_count": comment.get("reply_count", 0),
                "has_replies": (comment.get("reply_count") or 0) > 0,
                "announcement_id": str(comment["announcement_id"])
            }
            
            # Separate into parent comments and replies
            if comment.get("parent_comment_id"):
                # This is a reply - add to replies_map
                parent_id = str(comment["parent_comment_id"])
                if parent_id not in replies_map:
                    replies_map[parent_id] = []
                replies_map[parent_id].append(formatted_comment)
            else:
                # This is a parent comment (reply_level = 0 or parent_comment_id is NULL)
                parent_comments.append(formatted_comment)
        
        # Sort replies by created_at within each parent
        for parent_id in replies_map:
            replies_map[parent_id].sort(key=lambda x: x.get("created_at", x.get("comment_date", "")))
        
        total_replies = sum(len(replies) for replies in replies_map.values())
        
        logger.info(f"✅ Processed {len(parent_comments)} parent comments and {len(replies_map)} reply groups ({total_replies} total replies)")
        
        return Response({
            "announcement_id": announcement_id,
            "comments": parent_comments,
            "replies": replies_map,
            "total_comments": len(parent_comments),
            "total_replies": total_replies,
            "message": f"Found {len(parent_comments)} comment(s) with {total_replies} total reply(ies)"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ Error fetching comments for announcement {announcement_id}: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch comments",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def add_comment(request):
    """
    Add a new top-level comment to an announcement - WITH USER INFO IN RESPONSE
    Validates announcement_id as UUID and enforces comment_text constraints
    """
    try:
        user_id = request.data.get("user_id")
        announcement_id = request.data.get("announcement_id")
        comment_text = request.data.get("comment_text")
        
        # Validate required fields
        if not all([user_id, announcement_id, comment_text]):
            return Response({
                "error": "user_id, announcement_id, and comment_text are required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate UUIDs
        try:
            uuid.UUID(user_id)
            uuid.UUID(announcement_id)
        except ValueError as ve:
            return Response({
                "error": f"Invalid UUID format: {str(ve)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate comment text length (per table constraint: 0 < length <= 500)
        comment_text = comment_text.strip()
        if len(comment_text) == 0:
            return Response({"error": "Comment text cannot be empty"}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(comment_text) > 500:
            return Response({"error": "Comment text cannot exceed 500 characters"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Verify the announcement exists
        try:
            supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            announcement_check = supabase.table("announcement").select("announce_id").eq("announce_id", announcement_id).execute()
            if not announcement_check.data:
                return Response({"error": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as announcement_error:
            logger.error(f"Error checking announcement existence: {announcement_error}")
            return Response({"error": "Error validating announcement"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Get comprehensive user info for the comment author
        user_info = get_comprehensive_user_info(user_id)
        
        # Create the comment
        current_timestamp = datetime.now(pytz.UTC).isoformat()
        
        comment_payload = {
            "id": str(uuid.uuid4()),
            "comment_text": comment_text,
            "comment_date": current_timestamp,
            "user_id": user_id,
            "announcement_id": announcement_id,
            "parent_comment_id": None,  # Top-level comment
            "reply_level": 0,           # Top-level
            "reply_count": 0,           # No replies yet
            "created_at": current_timestamp,
            "updated_at": current_timestamp
        }
        
        logger.info(f"Creating top-level comment for announcement {announcement_id}")
        
        insert_result = service_client.table("comment").insert(comment_payload).execute()
        
        if not insert_result.data or len(insert_result.data) == 0:
            logger.error(f"Failed to create comment - no data returned")
            return Response({"error": "Failed to create comment"}, status=status.HTTP_400_BAD_REQUEST)
        
        created_comment = insert_result.data[0]
        logger.info(f"✅ Comment created successfully: {created_comment['id']}")
        
        # Return the formatted comment
        return Response({
            "message": "Comment added successfully",
            "comment": {
                "id": str(created_comment["id"]),
                "text": created_comment["comment_text"],
                "user": user_info["name"],
                "user_id": str(user_id),
                "user_role": user_info["role"],
                "user_profile": user_info["profile"],
                "time": "Just now",
                "formatted_date": current_timestamp,
                "comment_date": current_timestamp,
                "reply_level": 0,
                "reply_count": 0,
                "has_replies": False,
                "parent_comment_id": None
            }
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"❌ Error creating comment: {e}", exc_info=True)
        return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


@api_view(['GET'])
def get_comment_count(request):
    """
    Get the total number of comments for an announcement
    """
    announcement_id = request.GET.get("announcement_id")
    
    if not announcement_id:
        return Response({"error": "announcement_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Count comments for this announcement
        comments_data = supabase.table("comment").select("id", count="exact").eq("announcement_id", announcement_id).execute()
        
        comment_count = comments_data.count if comments_data.count is not None else 0
        
        return Response({
            "announcement_id": announcement_id,
            "comment_count": comment_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting comment count for announcement {announcement_id}: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def add_comment_reply(request):
    """
    Add a reply to a specific comment with proper reply_level handling and reply_count update
    """
    try:
        user_id = request.data.get("user_id")
        comment_id = request.data.get("comment_id")
        reply_text = request.data.get("reply_text")
        
        # Log incoming request
        logger.info(f"📥 Received reply request - User: {user_id}, Comment: {comment_id}")
        logger.info(f"📥 Reply text: '{reply_text}' (length: {len(reply_text) if reply_text else 0})")
        
        if not all([user_id, comment_id, reply_text]):
            return Response({
                "error": "user_id, comment_id, and reply_text are required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate UUIDs
        try:
            uuid.UUID(user_id)
            uuid.UUID(comment_id)
        except ValueError as ve:
            return Response({
                "error": f"Invalid UUID format: {str(ve)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate reply text (per table constraint: 0 < length <= 500)
        reply_text = reply_text.strip()
        if len(reply_text) == 0:
            return Response({"error": "Reply text cannot be empty"}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(reply_text) > 500:
            return Response({"error": "Reply text cannot exceed 500 characters"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Verify the parent comment exists and get its reply_level
        parent_comment_check = service_client.table("comment").select(
            "id, announcement_id, reply_level, reply_count"
        ).eq("id", comment_id).execute()
        
        if not parent_comment_check.data:
            logger.error(f"Parent comment not found: {comment_id}")
            return Response({"error": "Parent comment not found"}, status=status.HTTP_404_NOT_FOUND)
        
        parent_comment = parent_comment_check.data[0]
        parent_reply_level = parent_comment.get("reply_level", 0)
        announcement_id = parent_comment.get("announcement_id")
        current_reply_count = parent_comment.get("reply_count", 0)
        
        logger.info(f"Parent comment found - Level: {parent_reply_level}, Current replies: {current_reply_count}")
        
        # Calculate reply level (max 3 levels deep per table constraint)
        new_reply_level = parent_reply_level + 1
        if new_reply_level > 3:
            return Response({
                "error": "Maximum reply depth (3 levels) reached. Cannot reply to this comment."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        current_timestamp = datetime.now(pytz.UTC).isoformat()
        
        # Generate a NEW UUID each time to avoid duplicates
        reply_id = str(uuid.uuid4())
        logger.info(f"🆔 Generated new reply ID: {reply_id}")
        
        # Get user info for the response
        user_info = get_comprehensive_user_info(user_id)
        
        # Create reply payload - ENSURE comment_text is included
        reply_payload = {
            "id": reply_id,
            "comment_text": reply_text,  # ✅ This is the critical field
            "comment_date": current_timestamp,
            "user_id": user_id,
            "announcement_id": announcement_id,
            "parent_comment_id": comment_id,
            "reply_level": new_reply_level,
            "reply_count": 0,
            "created_at": current_timestamp,
            "updated_at": current_timestamp
        }
        
        logger.info(f"💾 Attempting to save reply with comment_text: '{reply_text}'")
        
        # Atomic transaction: Insert reply and update parent's reply_count
        try:
            # Insert the reply
            insert_result = service_client.table("comment").insert(reply_payload).execute()
            
            if not insert_result.data or len(insert_result.data) == 0:
                logger.error(f"Failed to create reply - no data returned")
                return Response({"error": "Failed to create reply"}, status=status.HTTP_400_BAD_REQUEST)
            
            created_reply = insert_result.data[0]
            logger.info(f"✅ Reply created successfully: {created_reply['id']}")
            logger.info(f"✅ Saved comment_text: '{created_reply.get('comment_text')}'")
            
            # Update parent comment's reply_count atomically
            new_reply_count = current_reply_count + 1
            update_result = service_client.table("comment").update({
                "reply_count": new_reply_count,
                "updated_at": current_timestamp
            }).eq("id", comment_id).execute()
            
            if update_result.data and len(update_result.data) > 0:
                logger.info(f"✅ Updated parent comment {comment_id} reply_count: {current_reply_count} -> {new_reply_count}")
            else:
                logger.warning(f"⚠️ Reply created but failed to update parent reply_count")
            
        except Exception as transaction_error:
            logger.error(f"❌ Transaction error: {transaction_error}", exc_info=True)
            return Response({
                "error": "Failed to create reply",
                "detail": str(transaction_error)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Format reply for frontend - ENSURE text field is populated
        formatted_reply = {
            "id": str(created_reply["id"]),
            "text": created_reply.get("comment_text", reply_text),  # ✅ Fallback to original text
            "comment_text": created_reply.get("comment_text", reply_text),  # ✅ Also send as comment_text
            "user": user_info["name"],
            "user_id": str(user_id),
            "user_role": user_info["role"],
            "user_profile": user_info["profile"],
            "time": "Just now",
            "formatted_date": current_timestamp,
            "comment_date": current_timestamp,
            "parent_comment_id": str(comment_id),
            "reply_level": new_reply_level,
            "reply_count": 0,
            "has_replies": False,
            "is_reply": True,
            "announcement_id": str(announcement_id)
        }
        
        logger.info(f"📤 Sending reply to frontend with text: '{formatted_reply['text']}'")
        
        # Return formatted reply
        return Response({
            "message": "Reply posted successfully",
            "reply": formatted_reply,
            "parent_new_reply_count": new_reply_count,
            "success": True
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"❌ Error creating reply: {e}", exc_info=True)
        return Response({
            "error": f"Internal server error: {str(e)}",
            "success": False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_comment_replies(request):
    """
    Get all replies for a specific comment - Horse Operator version
    Returns replies with user information
    """
    comment_id = request.GET.get("comment_id")
    
    if not comment_id:
        return Response({
            "error": "comment_id is required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        logger.info(f"📥 Fetching replies for comment: {comment_id}")
        
        # Get direct replies only (parent_comment_id matches this comment)
        replies_data = service_client.table("comment").select("*").eq(
            "parent_comment_id", comment_id
        ).order("created_at", desc=False).execute()
        
        if not replies_data.data:
            logger.info(f"No replies found for comment {comment_id}")
            return Response({
                "comment_id": comment_id,
                "replies": [],
                "total_replies": 0
            }, status=status.HTTP_200_OK)
        
        logger.info(f"Found {len(replies_data.data)} replies for comment {comment_id}")
        
        formatted_replies = []
        
        for reply in replies_data.data:
            # Get comprehensive user info for the reply author
            user_info = get_comprehensive_user_info(reply["user_id"])
            
            # Format time
            comment_date = reply.get("comment_date") or reply.get("created_at")
            relative_time = format_relative_time(comment_date)
            
            formatted_replies.append({
                "id": str(reply["id"]),
                "text": reply["comment_text"],
                "user": user_info["name"],
                "user_id": str(reply["user_id"]),
                "user_role": user_info["role"],
                "user_profile": user_info["profile"],
                "time": relative_time,
                "formatted_date": comment_date,
                "comment_date": comment_date,
                "parent_comment_id": str(comment_id),
                "reply_level": reply.get("reply_level", 1),
                "reply_count": reply.get("reply_count", 0),
                "has_replies": reply.get("has_replies", False) or (reply.get("reply_count", 0) > 0),
                "is_reply": True
            })
        
        logger.info(f"✅ Returning {len(formatted_replies)} formatted replies")
        
        return Response({
            "comment_id": comment_id,
            "replies": formatted_replies,
            "total_replies": len(formatted_replies)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ Error fetching replies for comment {comment_id}: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch replies",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ================================================ HELPER FUNCTIONS ================================================

def get_comprehensive_user_info(user_id):
    """
    Get comprehensive user information from all user tables - UPDATED VERSION
    """
    from supabase import create_client
    service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    try:
        # Convert to string for comparison
        user_id_str = str(user_id)
        
        # 1. Try horse_op_profile (Horse Operators)
        try:
            # ✅ FIXED: Use service_client instead of supabase
            op_data = service_client.table("horse_op_profile").select(
                "op_id, op_fname, op_mname, op_lname, op_email, op_image"
            ).eq("op_id", user_id_str).execute()
            
            if op_data.data and len(op_data.data) > 0:
                profile = op_data.data[0]
                fname = profile.get("op_fname", "")
                lname = profile.get("op_lname", "")
                
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if lname:
                    name_parts.append(lname)
                
                user_name = " ".join(name_parts).strip()
                if not user_name:
                    user_name = "Horse Operator"
                
                return {
                    "name": user_name,
                    "role": "horse_operator",
                    "profile": {
                        "full_name": user_name,
                        "first_name": fname,
                        "last_name": lname,
                        "email": profile.get("op_email"),
                        "image": profile.get("op_image")
                    }
                }
        except Exception as e:
            logger.debug(f"Not in horse_op_profile: {e}")
        
        # 2. Try kutsero_profile (Kutseros)
        try:
            # ✅ FIXED: Use service_client
            kutsero_data = service_client.table("kutsero_profile").select(
                "kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_email, kutsero_image"
            ).eq("kutsero_id", user_id_str).execute()
            
            if kutsero_data.data and len(kutsero_data.data) > 0:
                profile = kutsero_data.data[0]
                fname = profile.get("kutsero_fname", "")
                lname = profile.get("kutsero_lname", "")
                
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if lname:
                    name_parts.append(lname)
                
                user_name = " ".join(name_parts).strip()
                if not user_name:
                    user_name = "Kutsero"
                
                return {
                    "name": user_name,
                    "role": "kutsero",
                    "profile": {
                        "full_name": user_name,
                        "first_name": fname,
                        "last_name": lname,
                        "email": profile.get("kutsero_email"),
                        "image": profile.get("kutsero_image")
                    }
                }
        except Exception as e:
            logger.debug(f"Not in kutsero_profile: {e}")
        
        # 3. Try vet_profile (Veterinarians)
        try:
            # ✅ FIXED: Use service_client
            vet_data = service_client.table("vet_profile").select(
                "vet_id, vet_fname, vet_mname, vet_lname, vet_email, vet_profile_photo"
            ).eq("vet_id", user_id_str).execute()
            
            if vet_data.data and len(vet_data.data) > 0:
                profile = vet_data.data[0]
                fname = profile.get("vet_fname", "")
                lname = profile.get("vet_lname", "")
                
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if lname:
                    name_parts.append(lname)
                
                user_name = " ".join(name_parts).strip()
                if not user_name:
                    user_name = "Veterinarian"
                
                return {
                    "name": user_name,
                    "role": "veterinarian",
                    "profile": {
                        "full_name": user_name,
                        "first_name": fname,
                        "last_name": lname,
                        "email": profile.get("vet_email"),
                        "image": profile.get("vet_profile_photo")
                    }
                }
        except Exception as e:
            logger.debug(f"Not in vet_profile: {e}")
        
        # 4. Try ctu_vet_profile (CTU Veterinarians) - FIXED
        try:
            # ✅ CRITICAL FIX: Use service_client
            ctu_data = service_client.table("ctu_vet_profile").select(
                "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_role"
            ).eq("ctu_id", user_id_str).execute()
            
            if ctu_data.data and len(ctu_data.data) > 0:
                profile = ctu_data.data[0]
                fname = profile.get("ctu_fname", "").strip()
                lname = profile.get("ctu_lname", "").strip()
                
                ctu_role = profile.get("ctu_role")
                
                if not ctu_role:
                    if fname and "admin" in fname.lower():
                        ctu_role = "Ctu-Admin"
                    else:
                        ctu_role = "Ctu-Vetmed"
                
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if lname:
                    name_parts.append(lname)
                
                user_name = " ".join(name_parts).strip()
                if not user_name:
                    user_name = "CTU User"
                
                logger.info(f"✅ Found CTU user: {user_name} with role: {ctu_role}")
                
                return {
                    "name": user_name,
                    "role": ctu_role,
                    "profile": {
                        "full_name": user_name,
                        "first_name": fname,
                        "last_name": lname,
                        "email": profile.get("ctu_email"),
                        "image": None
                    }
                }
        except Exception as e:
            logger.debug(f"Not in ctu_vet_profile: {e}")
        
        # 5. Try dvmf_user_profile (DVMF Users)
        try:
            # ✅ FIXED: Use service_client
            dvmf_data = service_client.table("dvmf_user_profile").select(
                "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email, dvmf_role"
            ).eq("dvmf_id", user_id_str).execute()
            
            if dvmf_data.data and len(dvmf_data.data) > 0:
                profile = dvmf_data.data[0]
                fname = profile.get("dvmf_fname", "")
                lname = profile.get("dvmf_lname", "")

                dvmf_role = profile.get("dvmf_role", "Dvmf")
                
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if lname:
                    name_parts.append(lname)
                
                user_name = " ".join(name_parts).strip()
                if not user_name:
                    user_name = "DVMF User"
                
                return {
                    "name": user_name,
                    "role": dvmf_role,
                    "profile": {
                        "full_name": user_name,
                        "first_name": fname,
                        "last_name": lname,
                        "email": profile.get("dvmf_email"),
                        "image": None
                    }
                }
        except Exception as e:
            logger.debug(f"Not in dvmf_user_profile: {e}")
        
        # 6. Try kutsero_pres_profile (Kutsero Presidents)
        try:
            # ✅ FIXED: Use service_client
            kpres_data = service_client.table("kutsero_pres_profile").select(
                "user_id, pres_fname, pres_lname, pres_email"
            ).eq("user_id", user_id_str).execute()
            
            if kpres_data.data and len(kpres_data.data) > 0:
                profile = kpres_data.data[0]
                fname = profile.get("pres_fname", "")
                lname = profile.get("pres_lname", "")
                
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if lname:
                    name_parts.append(lname)
                
                user_name = " ".join(name_parts).strip()
                if not user_name:
                    user_name = "Kutsero President"
                
                return {
                    "name": user_name,
                    "role": "kutsero_president",
                    "profile": {
                        "full_name": user_name,
                        "first_name": fname,
                        "last_name": lname,
                        "email": profile.get("pres_email"),
                        "image": None
                    }
                }
        except Exception as e:
            logger.debug(f"Not in kutsero_pres_profile: {e}")
        
        # 7. Try users table as fallback
        try:
            # ✅ FIXED: Use service_client
            users_data = service_client.table("users").select(
                "id, email, role, status"
            ).eq("id", user_id_str).execute()
            
            if users_data.data and len(users_data.data) > 0:
                user = users_data.data[0]
                return {
                    "name": "User",
                    "role": user.get("role", "user"),
                    "profile": {
                        "full_name": "User",
                        "first_name": "User",
                        "last_name": "",
                        "email": user.get("email"),
                        "image": None
                    }
                }
        except Exception as e:
            logger.debug(f"Not in users table: {e}")
        
        # Final fallback
        logger.warning(f"Could not find user {user_id_str} in any profile table")
        return {
            "name": "Unknown User",
            "role": "user",
            "profile": {
                "full_name": "Unknown User",
                "first_name": "Unknown",
                "last_name": "User",
                "image": None
            }
        }
        
    except Exception as user_error:
        logger.error(f"Error fetching user info for {user_id}: {user_error}")
        return {
            "name": "Unknown User",
            "role": "user",
            "profile": {
                "full_name": "Unknown User",
                "first_name": "Unknown",
                "last_name": "User",
                "image": None
            }
        }


def format_relative_time(timestamp_str):
    """
    Format timestamp to relative time (e.g., "2 hours ago", "Yesterday")
    """
    try:
        if isinstance(timestamp_str, str):
            if timestamp_str.endswith('Z'):
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            elif '+' in timestamp_str:
                timestamp = datetime.fromisoformat(timestamp_str)
            else:
                timestamp = datetime.fromisoformat(timestamp_str)
        else:
            timestamp = timestamp_str
        
        if timestamp.tzinfo is None:
            timestamp = pytz.UTC.localize(timestamp)
        
        now = datetime.now(pytz.UTC)
        time_diff = now - timestamp
        
        # Calculate relative time
        seconds = time_diff.total_seconds()
        
        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"
        else:
            # More than a week, show date
            return timestamp.strftime('%b %d, %Y')
            
    except Exception as e:
        logger.error(f"Error formatting time {timestamp_str}: {e}")
        return "Unknown time"

# ------------------------------------------------ WATERING SCHEDULE API ------------------------------------------------

@api_view(['GET'])
def get_watering_schedule(request):
    """
    Get TODAY'S watering schedule only (excludes past schedules)
    Returns only today's water_detail records for the horse
    """
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")
    
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get today's date
        today = datetime.now().date().isoformat()
        
        # Get only today's water_detail records for this horse
        data = supabase.table("water_detail").select(
            "water_id, water_period, water_amount, water_time, completed, completed_at, op_id, kutsero_id, user_type, created_at"
        ).eq("horse_id", horse_id).gte("created_at", today).execute()
        
        # Format response with who gave water (for completed schedules)
        formatted_data = []
        for record in data.data if data.data else []:
            given_by_name = "Not given yet"
            given_by_id = None
            user_type = record.get("user_type", "unknown")
            
            # If water is completed, get who gave it
            if record.get("completed") and record.get("completed_at"):
                given_by_id = record.get("op_id") or record.get("kutsero_id")
                
                if record.get("op_id"):
                    op_data = supabase.table("horse_op_profile").select("op_fname, op_lname").eq("op_id", given_by_id).execute()
                    if op_data.data:
                        given_by_name = f"{op_data.data[0].get('op_fname', '')} {op_data.data[0].get('op_lname', '')}".strip()
                elif record.get("kutsero_id"):
                    kutsero_data = supabase.table("kutsero_profile").select("kutsero_fname, kutsero_lname").eq("kutsero_id", given_by_id).execute()
                    if kutsero_data.data:
                        given_by_name = f"{kutsero_data.data[0].get('kutsero_fname', '')} {kutsero_data.data[0].get('kutsero_lname', '')}".strip()
            
            formatted_data.append({
                "water_id": record["water_id"],
                "water_period": record["water_period"],
                "water_amount": record["water_amount"],
                "water_time": record["water_time"],
                "completed": record.get("completed", False),
                "completed_at": record.get("completed_at"),
                "given_by": given_by_name,
                "given_by_id": given_by_id,
                "user_type": user_type
            })
        
        return Response(formatted_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching watering schedule: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_period_name_from_time(time_str):
    """
    Determine period type based on time string
    Matches the logic from the React Native frontend getPeriodName function
    """
    try:
        # Split time and period
        time_parts = time_str.split(' ')
        time_component = time_parts[0]
        period = time_parts[1] if len(time_parts) > 1 else 'AM'
        
        # Parse hour
        hour = int(time_component.split(':')[0])
        
        # Convert to 24-hour format
        if period.upper() == 'PM' and hour != 12:
            hour24 = hour + 12
        elif period.upper() == 'AM' and hour == 12:
            hour24 = 0
        else:
            hour24 = hour
        
        # Classify period based on 24-hour time
        if hour24 < 10:
            return 'Morning'   # 12:00 AM - 9:59 AM
        elif hour24 < 16:
            return 'Afternoon' # 10:00 AM - 3:59 PM
        else:
            return 'Evening'   # 4:00 PM - 11:59 PM
            
    except Exception as e:
        logger.error(f'Error parsing time {time_str}: {e}')
        return 'Period'  # Default fallback


@api_view(['POST'])
def save_watering_schedule(request):
    """
    Save watering schedule to database for notifications
    Now properly saves all water schedules to water_detail table
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    schedule = request.data.get("schedule")
    
    if not user_id or not horse_id or not schedule:
        return Response({"error": "user_id, horse_id, and schedule are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # First, delete existing incomplete schedules for this horse
        service_client.table("water_detail").delete().eq(
            "op_id", user_id
        ).eq("horse_id", horse_id).eq("completed", False).execute()
        
        # Save each water schedule to water_detail for notifications
        for water in schedule:
            if not all(k in water for k in ['time', 'amount', 'period']):
                return Response({"error": "Invalid schedule format"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate unique ID for each water detail
            water_id = str(uuid.uuid4())
            water_payload = {
                "water_id": water_id,
                "op_id": user_id,
                "horse_id": horse_id,
                "water_time": water.get("time"),
                "water_amount": water.get("amount"),
                "water_period": water.get("period"),
                "completed": False,
                "created_at": datetime.now().isoformat()
            }
            
            # Insert the water detail
            insert_result = service_client.table("water_detail").insert(water_payload).execute()
            
            if not insert_result.data:
                logger.error(f"Failed to insert water detail for period: {water.get('period')}")
                return Response({"error": "Failed to save watering schedule"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.info(f"Saved {len(schedule)} watering schedules to database for user {user_id}, horse {horse_id}")
        
        return Response({
            "message": "Watering schedule saved successfully for notifications",
            "saved_count": len(schedule)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error saving watering schedule: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mark_water_given(request):
    """
    Mark water as given - CORRECTED VERSION with proper field names
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    water_time = request.data.get("water_time")
    water_period = request.data.get("water_period")
    water_amount = request.data.get("water_amount")
    completed_at = request.data.get("completed_at") or datetime.now().isoformat()

    if not all([user_id, horse_id, water_time, water_period, water_amount]):
        return Response({
            "error": "All water details are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if water already given today by ANYONE
        today = datetime.now().date().isoformat()
        existing = service_client.table("water_detail").select("water_id, op_id, kutsero_id").eq(
            "horse_id", horse_id
        ).eq("water_period", water_period).eq("completed", True).gte(
            "completed_at", today
        ).execute()
        
        if existing.data:
            # Water already given - get who gave it
            given_by = existing.data[0]
            given_by_id = given_by.get("op_id") or given_by.get("kutsero_id")
            
            # Get the name of who gave it
            given_by_name = "Another user"
            if given_by.get("op_id"):
                op_data = supabase.table("horse_op_profile").select("op_fname, op_lname").eq("op_id", given_by_id).execute()
                if op_data.data:
                    given_by_name = f"{op_data.data[0].get('op_fname', '')} {op_data.data[0].get('op_lname', '')}".strip()
            elif given_by.get("kutsero_id"):
                kutsero_data = supabase.table("kutsero_profile").select("kutsero_fname, kutsero_lname").eq("kutsero_id", given_by_id).execute()
                if kutsero_data.data:
                    given_by_name = f"{kutsero_data.data[0].get('kutsero_fname', '')} {kutsero_data.data[0].get('kutsero_lname', '')}".strip()
            
            logger.info(f"Water {water_period} already given today by {given_by_name}")
            return Response({
                "error": f"This water has already been given today by {given_by_name}",
                "already_given": True,
                "given_by": given_by_name,
                "water_id": existing.data[0]["water_id"]
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the existing water_detail record to update
        water_record = service_client.table("water_detail").select("*").eq(
            "horse_id", horse_id
        ).eq("water_period", water_period).eq("completed", False).execute()
        
        if not water_record.data:
            return Response({
                "error": "No active watering schedule found for this period"
            }, status=status.HTTP_404_NOT_FOUND)
        
        water_to_update = water_record.data[0]
        water_id = water_to_update["water_id"]
        
        # Determine user type and set correct foreign key
        user_type = None
        op_id = None
        kutsero_id = None
        user_full_name = "Unknown User"
        
        # Try horse_op_profile first
        op_check = service_client.table("horse_op_profile").select("op_id, op_fname, op_lname").eq("op_id", user_id).execute()
        
        if op_check.data:
            user_type = "op"
            op_id = user_id
            fn = op_check.data[0].get("op_fname", "")
            ln = op_check.data[0].get("op_lname", "")
            user_full_name = f"{fn} {ln}".strip()
            logger.info(f"Identified as horse operator: {user_full_name}")
        else:
            # Try kutsero_profile
            kutsero_check = service_client.table("kutsero_profile").select("kutsero_id, kutsero_fname, kutsero_lname").eq("kutsero_id", user_id).execute()
            
            if kutsero_check.data:
                user_type = "kutsero"
                kutsero_id = user_id
                fn = kutsero_check.data[0].get("kutsero_fname", "")
                ln = kutsero_check.data[0].get("kutsero_lname", "")
                user_full_name = f"{fn} {ln}".strip()
                logger.info(f"Identified as kutsero: {user_full_name}")
            else:
                return Response({
                    "error": "User not found in system. Must be a registered operator or kutsero."
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Update the existing water_detail record
        update_data = {
            "completed": True,
            "completed_at": completed_at,
            "user_type": user_type
        }
        
        # Set the correct user ID field
        if user_type == "op":
            update_data["op_id"] = op_id
        elif user_type == "kutsero":
            update_data["kutsero_id"] = kutsero_id
        
        update_result = service_client.table("water_detail").update(update_data).eq("water_id", water_id).execute()
        
        if not update_result.data:
            return Response({"error": "Failed to update water detail record"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Get horse name
        horse_data = supabase.table("horse_profile").select("horse_name").eq("horse_id", horse_id).execute()
        horse_name = "Unknown Horse"
        if horse_data.data:
            horse_name = horse_data.data[0].get("horse_name", "Unknown Horse")

        # Insert into water_log - CORRECTED: Use proper field names
        log_payload = {
            "wlog_id": str(uuid.uuid4()),
            "wlog_user_full_name": user_full_name,
            "wlog_date": datetime.now().date().isoformat(),
            "wlog_period": water_period,
            "wlog_time": water_time,
            "wlog_amount": water_amount,
            "wlog_status": "Given",
            "wlog_action": "Completed",
            "user_id": user_id,
            "horse_id": horse_id,
            "horse_op_id": op_id,  # ✅ CORRECTED: Use horse_op_id instead of op_id
            "kutsero_id": kutsero_id,
            "created_at": completed_at
        }
        
        try:
            water_log_result = service_client.table("water_log").insert(log_payload).execute()
            logger.info(f"Water log created: {water_log_result.data}")
        except Exception as log_error:
            logger.error(f"Error creating water log: {log_error}")
            # Continue even if log fails - the main operation succeeded

        logger.info(f"Water marked as given by {user_full_name} ({user_type}): {horse_name} - {water_period}")

        return Response({
            "message": f"Water marked as given for {horse_name}",
            "water_id": water_id,
            "water_detail_updated": True,
            "horse_name": horse_name,
            "given_by": user_full_name,
            "user_type": user_type
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error marking water as given: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_water_schedule(request):
    """
    Delete a specific water schedule from database
    Only allows deletion of incomplete schedules
    FIXED: Better error handling and response formatting
    """
    try:
        # Parse JSON data with error handling
        try:
            request_data = json.loads(request.body)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in delete_water_schedule: {e}")
            return Response({
                "error": "Invalid JSON data",
                "detail": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

        user_id = request_data.get("user_id")
        water_id = request_data.get("water_id")
        
        if not user_id or not water_id:
            return Response({
                "error": "user_id and water_id are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if the water schedule exists and is not completed
        water_check = service_client.table("water_detail").select("*").eq("water_id", water_id).execute()
        
        if not water_check.data:
            return Response({
                "error": "Water schedule not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        water_schedule = water_check.data[0]
        
        # Check if the schedule is completed
        if water_schedule.get("completed", False):
            return Response({
                "error": "Cannot delete completed water schedules"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify ownership (either op_id or kutsero_id should match)
        if water_schedule.get("op_id") != user_id and water_schedule.get("kutsero_id") != user_id:
            return Response({
                "error": "Unauthorized to delete this schedule"
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Delete the schedule
        delete_result = service_client.table("water_detail").delete().eq("water_id", water_id).execute()
        
        if delete_result.data:
            logger.info(f"Water schedule {water_id} deleted successfully")
            return Response({
                "message": "Water schedule deleted successfully",
                "water_id": water_id,
                "success": True
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": "Failed to delete water schedule from database",
                "success": False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error deleting water schedule: {e}", exc_info=True)
        return Response({
            "error": "Internal server error",
            "detail": str(e),
            "success": False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_water_logs(request):
    """
    Get water logs for a user - CORRECTED VERSION with proper field names
    """
    user_id = request.GET.get("user_id")
    
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        logger.info(f"🔍 Fetching water logs for user: {user_id}")
        
        # First, get all horse IDs owned by this user
        horses_data = service_client.table("horse_profile").select("horse_id").eq("op_id", user_id).execute()
        
        if not horses_data.data:
            logger.info(f"No horses found for user {user_id}")
            return Response([], status=status.HTTP_200_OK)
        
        horse_ids = [horse["horse_id"] for horse in horses_data.data]
        logger.info(f"Found {len(horse_ids)} horses for user {user_id}")
        
        # Get ALL water logs for these horses (regardless of who performed the action)
        data = service_client.table("water_log").select("*").in_("horse_id", horse_ids).order("created_at", desc=True).execute()
        
        logger.info(f"Found {len(data.data) if data.data else 0} water logs for user's horses")
        
        # Transform data to match frontend expectations
        transformed_data = []
        for log in data.data:
            # Get horse name
            horse_data = supabase.table("horse_profile") \
                .select("horse_name") \
                .eq("horse_id", log["horse_id"]).execute()
            horse_name = "Unknown Horse"
            if horse_data.data:
                horse_name = horse_data.data[0].get("horse_name", "Unknown Horse")
            
            # Determine who performed the action - CORRECTED: Use horse_op_id instead of op_id
            performer_name = log["wlog_user_full_name"]
            performer_type = "Unknown"
            
            if log.get("horse_op_id"):  # ✅ CORRECTED: Use horse_op_id
                performer_type = "horse_operator"
            elif log.get("kutsero_id"):
                performer_type = "kutsero"
            
            transformed_data.append({
                "log_id": log["wlog_id"],
                "date": log["wlog_date"],
                "horse": horse_name,
                "horse_id": log["horse_id"],
                "timestamp": log["created_at"],
                "user_full_name": performer_name,
                "period": log["wlog_period"],
                "time": log["wlog_time"],
                "amount": log["wlog_amount"],
                "status": log["wlog_status"],
                "action": log["wlog_action"].lower(),
                "performed_by_type": performer_type,
                "performed_by_id": log.get("horse_op_id") or log.get("kutsero_id")  # ✅ CORRECTED
            })
        
        logger.info(f"Returning {len(transformed_data)} water logs for user {user_id}")
        return Response(transformed_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching water logs: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def clear_water_logs(request):
    """
    Clear water logs for a user - CORRECTED VERSION with proper field names
    """
    user_id = request.data.get("user_id")
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Determine user type and build appropriate query
        is_horse_operator = False
        
        # Check if user exists in horse_op_profile
        op_check = service_client.table("horse_op_profile").select("op_id").eq("op_id", user_id).execute()
        if op_check.data and len(op_check.data) > 0:
            is_horse_operator = True
        
        if is_horse_operator:
            # Delete logs where this user is the horse operator - CORRECTED: Use horse_op_id
            service_client.table("water_log").delete().eq("horse_op_id", user_id).execute()
        else:
            # Delete logs where this user is the kutsero
            service_client.table("water_log").delete().eq("kutsero_id", user_id).execute()
        
        return Response({"message": "All water logs cleared successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error clearing water logs: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def reset_daily_watering(request):
    """
    Reset daily watering - deletes today's water_detail entries
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Delete today's completed water schedules
        today = datetime.now().date().isoformat()
        delete_result = service_client.table("water_detail").delete().eq(
            "op_id", user_id
        ).eq("horse_id", horse_id).gte("created_at", today).execute()
        
        if delete_result.data:
            logger.info(f"Reset daily watering for user {user_id}, horse {horse_id}")
            return Response({"message": "Daily watering reset successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "No watering schedules found to reset"}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Error resetting daily watering: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------ SOS EMERGENCY API ------------------------------------------------

@api_view(['POST'])
def create_sos_request(request):
    """
    Create a new SOS emergency request - FIXED VERSION
    """
    try:
        # Log the incoming request for debugging
        logger.info(f"Received SOS request data: {request.data}")
        
        # Extract data from request
        user_id = request.data.get("user_id")
        emergency_type = request.data.get("emergency_type")
        horse_status = request.data.get("horse_status")
        description = request.data.get("description")
        contact_number = request.data.get("contact_number")
        additional_info = request.data.get("additional_info", "")
        location_text = request.data.get("location_text", "")
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        
        # Validate required fields
        if not user_id:
            logger.error("Missing op_id")
            return Response({"error": "op_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not emergency_type:
            logger.error("Missing emergency_type")
            return Response({"error": "emergency_type is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not horse_status or (isinstance(horse_status, list) and len(horse_status) == 0):
            logger.error("Missing or empty horse_status")
            return Response({"error": "horse_status is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not description or not description.strip():
            logger.error("Missing description")
            return Response({"error": "description is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not contact_number or not contact_number.strip():
            logger.error("Missing contact_number")
            return Response({"error": "contact_number is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify op_id exists in horse_op_profile
        user_name = "Horse Operator"
        try:
            op_check = supabase.table("horse_op_profile").select("op_id, op_fname, op_lname").eq("op_id", user_id).execute()
            
            if not op_check.data or len(op_check.data) == 0:
                logger.error(f"Invalid op_id: {user_id} not found in horse_op_profile")
                return Response({
                    "error": "Invalid operator ID. User not found."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user_info = op_check.data[0]
            fname = user_info.get("op_fname", "")
            lname = user_info.get("op_lname", "")
            user_name = f"{fname} {lname}".strip() if fname or lname else "Horse Operator"
            
            logger.info(f"Verified operator: {user_name} (ID: {user_id})")
            
        except Exception as op_error:
            logger.error(f"Error verifying op_id: {op_error}", exc_info=True)
            return Response({
                "error": "Error verifying operator information"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Convert horse_status array to string
        if isinstance(horse_status, list):
            horse_status_str = ", ".join(horse_status)
        else:
            horse_status_str = str(horse_status)
        
        logger.info(f"Horse status: {horse_status_str}")
        
        # Generate UUID and timestamp
        sos_id = str(uuid.uuid4())
        current_timestamp = datetime.now(pytz.UTC).isoformat()
        
        # Create payload matching actual table schema
        sos_payload = {
            "id": sos_id,
            "user_id": user_id,
            "user_name": user_name,
            "emergency_type": emergency_type,
            "horse_status": horse_status_str,
            "description": description.strip(),
            "contact_number": contact_number.strip(),
            "additional_info": additional_info.strip() if additional_info else None,
            "location_text": location_text if location_text else None,
            "latitude": float(latitude) if latitude else None,
            "longitude": float(longitude) if longitude else None,
            "status": "pending",
            "created_at": current_timestamp,
            "kutsero_profile_id": None
        }
        
        logger.info(f"Attempting to insert SOS request: {sos_id}")
        logger.info(f"Payload keys: {list(sos_payload.keys())}")
        
        # Insert into database
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        try:
            insert_result = service_client.table("sos_requests").insert(sos_payload).execute()
            
            # FIXED: Better error handling
            logger.info(f"Insert result type: {type(insert_result)}")
            logger.info(f"Insert result has data: {hasattr(insert_result, 'data')}")
            
            # Check if insert was successful
            if hasattr(insert_result, 'data') and insert_result.data:
                if isinstance(insert_result.data, list) and len(insert_result.data) > 0:
                    created_sos = insert_result.data[0]
                    logger.info(f"✅ SOS created successfully: {sos_id}")
                    
                    return Response({
                        "message": "SOS emergency alert sent successfully",
                        "sos_id": sos_id,
                        "status": "pending",
                        "created_at": current_timestamp,
                        "data": created_sos
                    }, status=status.HTTP_201_CREATED)
                else:
                    logger.error(f"Insert returned empty data array")
                    return Response({
                        "error": "Database returned empty result",
                        "detail": "The SOS request may have been created but confirmation failed"
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                # Check for error in response
                error_msg = "Unknown database error"
                if hasattr(insert_result, 'error') and insert_result.error:
                    error_msg = str(insert_result.error)
                
                logger.error(f"Insert failed: {error_msg}")
                return Response({
                    "error": "Failed to create SOS request in database",
                    "detail": error_msg
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as insert_error:
            logger.error(f"Database insert exception: {str(insert_error)}", exc_info=True)
            
            # Provide more specific error information
            error_detail = str(insert_error)
            if "violates foreign key constraint" in error_detail:
                error_detail = "Invalid user ID - user does not exist in the system"
            elif "duplicate key" in error_detail:
                error_detail = "Duplicate SOS request detected"
            
            return Response({
                "error": "Database error while creating SOS request",
                "detail": error_detail
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"Unexpected error creating SOS: {str(e)}", exc_info=True)
        return Response({
            "error": f"Server error: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_sos_requests(request):
    """
    Get SOS requests - can filter by user_id or status
    """
    user_id = request.GET.get("user_id")  # Changed from op_id
    status_filter = request.GET.get("status")
    
    try:
        # Build query
        query = supabase.table("sos_requests").select("*").order("created_at", desc=True)
        
        # Apply filters if provided
        if user_id:
            query = query.eq("user_id", user_id)  # Changed from op_id
        
        if status_filter:
            query = query.eq("status", status_filter)
        
        result = query.execute()
        
        # Format the response
        formatted_requests = []
        for sos_request in result.data:
            # Calculate time ago
            created_at = sos_request.get("created_at")
            time_ago = "Unknown time"
            
            if created_at:
                try:
                    if isinstance(created_at, str):
                        sos_datetime = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        sos_datetime = created_at
                    
                    if sos_datetime.tzinfo is None:
                        sos_datetime = pytz.UTC.localize(sos_datetime)
                    
                    now = datetime.now(pytz.UTC)
                    time_diff = now - sos_datetime
                    
                    if time_diff.total_seconds() < 60:
                        time_ago = "Just now"
                    elif time_diff.total_seconds() < 3600:
                        minutes = int(time_diff.total_seconds() / 60)
                        time_ago = f"{minutes} minute{'s' if minutes != 1 else ''} ago"
                    elif time_diff.total_seconds() < 86400:
                        hours = int(time_diff.total_seconds() / 3600)
                        time_ago = f"{hours} hour{'s' if hours != 1 else ''} ago"
                    else:
                        days = int(time_diff.total_seconds() / 86400)
                        time_ago = f"{days} day{'s' if days != 1 else ''} ago"
                except:
                    time_ago = str(created_at)
            
            formatted_requests.append({
                "id": sos_request["id"],
                "user_id": sos_request.get("user_id"),  # Changed from op_id
                "user_name": sos_request.get("user_name", "Unknown User"),
                "emergency_type": sos_request.get("emergency_type"),
                "horse_status": sos_request.get("horse_status"),  # String format
                "horse_status_array": sos_request.get("horse_status", "").split(", ") if sos_request.get("horse_status") else [],  # Array format
                "description": sos_request.get("description"),
                "contact_number": sos_request.get("contact_number"),
                "additional_info": sos_request.get("additional_info"),
                "location_text": sos_request.get("location_text"),
                "latitude": sos_request.get("latitude"),
                "longitude": sos_request.get("longitude"),
                "status": sos_request.get("status", "pending"),
                "created_at": created_at,
                "time_ago": time_ago
            })
        
        return Response({
            "sos_requests": formatted_requests,
            "total_count": len(formatted_requests)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching SOS requests: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def update_sos_status(request, sos_id):
    """
    Update SOS request status (for admin/vet use)
    """
    try:
        new_status = request.data.get("status")
        
        if not new_status:
            return Response({"error": "status is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate status value
        valid_statuses = ["pending", "in_progress", "resolved", "cancelled"]
        if new_status not in valid_statuses:
            return Response({
                "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if SOS request exists
        sos_check = supabase.table("sos_requests").select("*").eq("id", sos_id).execute()
        
        if not sos_check.data:
            return Response({"error": "SOS request not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Update the status
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        update_result = service_client.table("sos_requests").update({
            "status": new_status
        }).eq("id", sos_id).execute()
        
        if not update_result.data:
            return Response({"error": "Failed to update SOS status"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        updated_sos = update_result.data[0]
        logger.info(f"SOS request {sos_id} status updated to {new_status}")
        
        return Response({
            "message": f"SOS status updated to {new_status}",
            "sos_id": sos_id,
            "status": new_status,
            "updated_sos": updated_sos
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error updating SOS status: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_sos_details(request, sos_id):
    """
    Get detailed information about a specific SOS request
    """
    try:
        sos_data = supabase.table("sos_requests").select("*").eq("id", sos_id).execute()
        
        if not sos_data.data:
            return Response({"error": "SOS request not found"}, status=status.HTTP_404_NOT_FOUND)
        
        sos_request = sos_data.data[0]
        
        # Get additional operator information if needed
        user_id = sos_request.get("user_id")  # Changed from op_id
        operator_details = {}
        
        if user_id:
            try:
                # Note: Still using op_id as the column name in horse_op_profile table
                op_data = supabase.table("horse_op_profile").select("*").eq("op_id", user_id).execute()
                if op_data.data:
                    operator_details = op_data.data[0]
            except Exception as op_error:
                logger.warning(f"Could not fetch operator details: {op_error}")
        
        return Response({
            "sos_request": sos_request,
            "operator_details": operator_details
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching SOS details: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


# ------------------------------------------------ TREATMENT API ------------------------------------------------

@api_view(['GET'])
def get_medical_record_treatments(request):
    """
    Get all treatments for a specific medical record
    """
    medrec_id = request.GET.get("medrec_id")
    user_id = request.GET.get("user_id")
    
    if not medrec_id or not user_id:
        return Response({
            "error": "medrec_id and user_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get the medical record first
        medrec_data = supabase.table("horse_medical_record").select("*").eq(
            "medrec_id", medrec_id
        ).execute()
        
        if not medrec_data.data or len(medrec_data.data) == 0:
            return Response({
                "error": "Medical record not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        medical_record = medrec_data.data[0]
        horse_id = medical_record["medrec_horse_id"]
        
        # Verify the horse belongs to the user
        horse_check = supabase.table("horse_profile").select(
            "horse_name, op_id"
        ).eq("horse_id", horse_id).eq("op_id", user_id).execute()
        
        if not horse_check.data:
            return Response({
                "error": "Access denied - horse doesn't belong to this user"
            }, status=status.HTTP_403_FORBIDDEN)
        
        horse_info = horse_check.data[0]
        
        # Get treatments for this specific medical record
        treatments_data = supabase.table("horse_treatment").select("*").eq(
            "medrec_id", medrec_id
        ).execute()
        
        # Format treatments
        formatted_treatments = []
        for treatment in treatments_data.data if treatments_data.data else []:
            # Format followup date if exists
            followup_date = treatment.get("followup_date")
            formatted_followup = None
            if followup_date:
                try:
                    date_obj = datetime.strptime(str(followup_date), '%Y-%m-%d')
                    formatted_followup = date_obj.strftime('%B %d, %Y')
                except:
                    formatted_followup = str(followup_date)
            
            formatted_treatments.append({
                "treatment_id": treatment["treatment_id"],
                "treatment_name": treatment["treatment_name"],
                "treatment_dosage": treatment["treatment_dosage"],
                "treatment_duration": treatment["treatment_duration"],
                "followup_date": followup_date,
                "followup_date_formatted": formatted_followup,
                "treatment_outcome": treatment.get("treatment_outcome")
            })
        
        # Format examination date
        examination_date = medical_record.get("medrec_date")
        formatted_exam_date = examination_date
        if examination_date:
            try:
                date_obj = datetime.strptime(str(examination_date), '%Y-%m-%d')
                formatted_exam_date = date_obj.strftime('%B %d, %Y')
            except:
                formatted_exam_date = str(examination_date)
        
        logger.info(f"Returning {len(formatted_treatments)} treatments for medical record {medrec_id}")
        
        return Response({
            "medrec_id": medrec_id,
            "horse_name": horse_info.get("horse_name", "Unknown Horse"),
            "horse_id": horse_id,
            "examination_date": examination_date,
            "examination_date_formatted": formatted_exam_date,
            "treatments": formatted_treatments,
            "total_treatments": len(formatted_treatments),
            "message": f"Found {len(formatted_treatments)} treatment(s) for this medical record"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching treatments for medical record {medrec_id}: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch treatments",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------- AI MESSAGE -----------------------------------------

@api_view(['POST'])
def ai_assistant(request):
    """
    AI assistant restricted to horse health for Horse Operators.
    Chat history is stored per user for 7 days and then automatically removed.
    """
    try:
        user_prompt = request.data.get("prompt")

        if not user_prompt:
            return Response({"success": False, "error": "Prompt is required"},
                            status=status.HTTP_400_BAD_REQUEST)

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        system_message = (
            "You are an AI assistant that ONLY answers questions about horse health "
            "(feeding, diseases, injuries, grooming, care, well-being). "
            "If the user asks anything unrelated to horse health, "
            "respond strictly with: 'I can only answer questions about horse health.'"
        )

        ai_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )

        answer = ai_response.choices[0].message.content.strip()

        # ✅ Save chat history in cache for 7 days
        session_id = str(request.user.id) if request.user.is_authenticated else "guest"
        history_key = f"chat_history_{session_id}"

        history = cache.get(history_key, [])
        history.append({
            "id": str(uuid.uuid4()),
            "prompt": user_prompt,
            "answer": answer
        })
        cache.set(history_key, history, timeout=7*24*60*60)  # 7 days in seconds

        return Response({"success": True, "prompt": user_prompt, "answer": answer},
                        status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"success": False, "error": str(e)},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_chat_history(request):
    """
    Retrieve chat history for the current user (kept for 7 days).
    """
    session_id = str(request.user.id) if request.user.is_authenticated else "guest"
    history_key = f"chat_history_{session_id}"

    history = cache.get(history_key, [])

    return Response({"success": True, "history": history}, status=status.HTTP_200_OK)



@api_view(['GET'])
def get_all_dvmf(request):
    """
    Fetch all DVMF users (excluding admins)
    Returns DVMF user profiles for contact list
    """
    try:
        logger.info("Fetching all DVMF users...")
        
        # <CHANGE> Validate environment variables before creating client
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            logger.error("Missing Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)")
            return Response({
                "error": "Server configuration error",
                "detail": "Missing Supabase credentials"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # <CHANGE> Create service client with error handling
        try:
            service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        except Exception as e:
            logger.error(f"Failed to create Supabase client: {e}", exc_info=True)
            return Response({
                "error": "Database connection error",
                "detail": "Could not connect to database"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # <CHANGE> Query with explicit error handling and table existence check
        try:
            # Try to fetch DVMF users - table name might be 'dvmf_user_profile' or 'dvmf_users'
            dvmf_data = service_client.table("dvmf_user_profile").select(
                "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email, dvmf_phonenum, dvmf_role"
            ).execute()
        except Exception as e:
            logger.error(f"Query error - checking if table exists: {e}", exc_info=True)
            # Try alternative table name
            try:
                dvmf_data = service_client.table("dvmf_users").select(
                    "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email, dvmf_phonenum, dvmf_role"
                ).execute()
            except Exception as e2:
                logger.error(f"Failed to query DVMF table with both names: {e2}", exc_info=True)
                return Response({
                    "error": "Database query error",
                    "detail": "Could not fetch DVMF users from database"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        if not dvmf_data.data or len(dvmf_data.data) == 0:
            logger.info("No DVMF users found")
            return Response([], status=status.HTTP_200_OK)
        
        logger.info(f"Found {len(dvmf_data.data)} DVMF users in database")
        
        # Transform data to match frontend expectations
        dvmf_users = []
        for dvmf in dvmf_data.data:
            try:
                dvmf_id = dvmf.get("dvmf_id")
                if not dvmf_id:
                    logger.warning("Skipping DVMF record with missing dvmf_id")
                    continue
                
                # Skip admin users
                dvmf_role = dvmf.get("dvmf_role", "").strip()
                if dvmf_role and (dvmf_role.lower() == 'admin' or 'admin' in dvmf_role.lower()):
                    logger.debug(f"Skipping DVMF admin: {dvmf_id}")
                    continue
                
                # Handle avatar/image URL properly
                avatar_url = None
                dvmf_image = dvmf.get("dvmf_image", "").strip() if dvmf.get("dvmf_image") else None
                
                if dvmf_image:
                    if dvmf_image.startswith("http://") or dvmf_image.startswith("https://"):
                        avatar_url = dvmf_image
                    elif dvmf_image.startswith("dvmf_images/"):
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{dvmf_image}"
                    else:
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/dvmf_images/{dvmf_image}"
                
                dvmf_user_data = {
                    "dvmf_id": dvmf_id,
                    "dvmf_fname": dvmf.get("dvmf_fname", "").strip(),
                    "dvmf_lname": dvmf.get("dvmf_lname", "").strip(),
                    "dvmf_email": dvmf.get("dvmf_email", "").strip(),
                    "dvmf_phonenum": dvmf.get("dvmf_phonenum", "").strip(),
                    "dvmf_role": dvmf_role,
                }
                
                dvmf_users.append(dvmf_user_data)
            except Exception as e:
                logger.warning(f"Error processing DVMF record: {e}", exc_info=True)
                continue
        
        logger.info(f"Returning {len(dvmf_users)} DVMF users (admins excluded)")
        return Response(dvmf_users, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Unexpected error fetching DVMF users: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch DVMF users",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



    

@api_view(['GET'])
def search_users_by_name(request):
    """
    Search users by name across all user types (Horse Operators, Kutseros, Veterinarians, CTU Vets, DVMF, Kutsero Presidents)
    Returns users whose first_name OR last_name contains the search query (case-insensitive)
    """
    name_query = request.GET.get("name", "").strip()
    
    if not name_query:
        return Response({"error": "name parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(name_query) < 2:
        return Response({"error": "Search query must be at least 2 characters"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        all_users = []
        
        logger.info(f"🔍 Searching for users with name containing: '{name_query}'")
        
        # ========== 1. Search Horse Operators ==========
        try:
            # Get approved horse operators
            approved_ops = service_client.table("users").select("id").eq("role", "Horse Operator").eq("status", "approved").execute()
            
            if approved_ops.data and len(approved_ops.data) > 0:
                op_ids = [user["id"] for user in approved_ops.data]
                
                # Search by first name OR last name (case-insensitive using ilike)
                op_data = service_client.table("horse_op_profile").select(
                    "op_id, op_fname, op_mname, op_lname, op_email, op_image"
                ).in_("op_id", op_ids).or_(
                    f"op_fname.ilike.%{name_query}%,op_lname.ilike.%{name_query}%"
                ).execute()
                
                for op in op_data.data if op_data.data else []:
                    avatar_url = None
                    if op.get("op_image"):
                        op_image = op.get("op_image")
                        if op_image.startswith("http://") or op_image.startswith("https://"):
                            avatar_url = op_image
                        elif op_image.startswith("kutsero_op_profile/"):
                            avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{op_image}"
                        else:
                            avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{op_image}"
                    
                    all_users.append({
                        "id": op["op_id"],
                        "user_id": op["op_id"],
                        "first_name": op.get("op_fname", ""),
                        "last_name": op.get("op_lname", ""),
                        "middle_name": op.get("op_mname", ""),
                        "full_name": f"{op.get('op_fname', '')} {op.get('op_lname', '')}".strip(),
                        "email": op.get("op_email", ""),
                        "user_role": "horse_operator",
                        "image": avatar_url,
                    })
                
                logger.info(f"✅ Found {len(op_data.data) if op_data.data else 0} horse operators")
        except Exception as op_error:
            logger.error(f"Error searching horse operators: {op_error}")
        
        # ========== 2. Search Kutseros ==========
        try:
            approved_kutseros = service_client.table("users").select("id").eq("role", "Kutsero").eq("status", "approved").execute()
            
            if approved_kutseros.data and len(approved_kutseros.data) > 0:
                kutsero_ids = [user["id"] for user in approved_kutseros.data]
                
                kutsero_data = service_client.table("kutsero_profile").select(
                    "kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_email, kutsero_image"
                ).in_("kutsero_id", kutsero_ids).or_(
                    f"kutsero_fname.ilike.%{name_query}%,kutsero_lname.ilike.%{name_query}%"
                ).execute()
                
                for kutsero in kutsero_data.data if kutsero_data.data else []:
                    avatar_url = None
                    if kutsero.get("kutsero_image"):
                        kutsero_image = kutsero.get("kutsero_image")
                        if kutsero_image.startswith("http://") or kutsero_image.startswith("https://"):
                            avatar_url = kutsero_image
                        elif kutsero_image.startswith("kutsero_images/"):
                            avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{kutsero_image}"
                        else:
                            avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_images/{kutsero_image}"
                    
                    all_users.append({
                        "id": kutsero["kutsero_id"],
                        "user_id": kutsero["kutsero_id"],
                        "first_name": kutsero.get("kutsero_fname", ""),
                        "last_name": kutsero.get("kutsero_lname", ""),
                        "middle_name": kutsero.get("kutsero_mname", ""),
                        "full_name": f"{kutsero.get('kutsero_fname', '')} {kutsero.get('kutsero_lname', '')}".strip(),
                        "email": kutsero.get("kutsero_email", ""),
                        "user_role": "kutsero",
                        "image": avatar_url,
                    })
                
                logger.info(f"✅ Found {len(kutsero_data.data) if kutsero_data.data else 0} kutseros")
        except Exception as kutsero_error:
            logger.error(f"Error searching kutseros: {kutsero_error}")
        
        # ========== 3. Search Regular Veterinarians ==========
        try:
            approved_vets = service_client.table("users").select("id").eq("role", "Veterinarian").eq("status", "approved").execute()
            
            if approved_vets.data and len(approved_vets.data) > 0:
                vet_ids = [user["id"] for user in approved_vets.data]
                
                vet_data = service_client.table("vet_profile").select(
                    "vet_id, vet_fname, vet_lname, vet_email, vet_phone_num, vet_specialization, vet_profile_photo"
                ).in_("vet_id", vet_ids).or_(
                    f"vet_fname.ilike.%{name_query}%,vet_lname.ilike.%{name_query}%"
                ).execute()
                
                for vet in vet_data.data if vet_data.data else []:
                    avatar_url = None
                    if vet.get("vet_profile_photo"):
                        vet_photo = vet.get("vet_profile_photo")
                        if vet_photo.startswith("http://") or vet_photo.startswith("https://"):
                            avatar_url = vet_photo
                        elif vet_photo.startswith("vet_images/") or vet_photo.startswith("profile_photos/"):
                            avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{vet_photo}"
                        else:
                            avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/vet_images/{vet_photo}"
                    
                    all_users.append({
                        "id": vet["vet_id"],
                        "user_id": vet["vet_id"],
                        "first_name": vet.get("vet_fname", ""),
                        "last_name": vet.get("vet_lname", ""),
                        "middle_name": "",
                        "full_name": f" {vet.get('vet_fname', '')} {vet.get('vet_lname', '')}".strip(),
                        "email": vet.get("vet_email", ""),
                        "phone_num": vet.get("vet_phone_num"),
                        "user_role": "veterinarian",
                        "image": avatar_url,
                        "specialization": vet.get("vet_specialization"),
                    })
                
                logger.info(f"✅ Found {len(vet_data.data) if vet_data.data else 0} veterinarians")
        except Exception as vet_error:
            logger.error(f"Error searching veterinarians: {vet_error}")
        
        # ========== 4. Search CTU Veterinarians ==========
        try:
            ctu_vet_data = service_client.table("ctu_vet_profile").select(
                "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_phonenum, ctu_role"
            ).or_(
                f"ctu_fname.ilike.%{name_query}%,ctu_lname.ilike.%{name_query}%"
            ).execute()
            
            for ctu_vet in ctu_vet_data.data if ctu_vet_data.data else []:
                all_users.append({
                    "id": ctu_vet["ctu_id"],
                    "user_id": ctu_vet["ctu_id"],
                    "first_name": ctu_vet.get("ctu_fname", ""),
                    "last_name": ctu_vet.get("ctu_lname", ""),
                    "middle_name": "",
                    "full_name": f" {ctu_vet.get('ctu_fname', '')} {ctu_vet.get('ctu_lname', '')}".strip(),
                    "email": ctu_vet.get("ctu_email", ""),
                    "phone_num": ctu_vet.get("ctu_phonenum"),
                    "user_role": "ctu_veterinarian",
                    "image": None,
                    "specialization": "",
                })
            
            logger.info(f"✅ Found {len(ctu_vet_data.data) if ctu_vet_data.data else 0} CTU veterinarians")
        except Exception as ctu_error:
            logger.error(f"Error searching CTU veterinarians: {ctu_error}")
        
        # ========== 5. Search DVMF Users ==========
        try:
            dvmf_data = service_client.table("dvmf_user_profile").select(
                "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email"
            ).or_(
                f"dvmf_fname.ilike.%{name_query}%,dvmf_lname.ilike.%{name_query}%"
            ).execute()
            
            for dvmf in dvmf_data.data if dvmf_data.data else []:
                all_users.append({
                    "id": dvmf["dvmf_id"],
                    "user_id": dvmf["dvmf_id"],
                    "first_name": dvmf.get("dvmf_fname", ""),
                    "last_name": dvmf.get("dvmf_lname", ""),
                    "middle_name": "",
                    "full_name": f"{dvmf.get('dvmf_fname', '')} {dvmf.get('dvmf_lname', '')}".strip(),
                    "email": dvmf.get("dvmf_email", ""),
                    "user_role": "dvmf",
                    "image": None,
                })
            
            logger.info(f"✅ Found {len(dvmf_data.data) if dvmf_data.data else 0} DVMF users")
        except Exception as dvmf_error:
            logger.error(f"Error searching DVMF users: {dvmf_error}")
        
        # ========== 6. Search Kutsero Presidents ==========
        try:
            kutsero_pres_data = service_client.table("kutsero_pres_profile").select(
                "user_id, pres_fname, pres_lname, pres_email"
            ).or_(
                f"pres_fname.ilike.%{name_query}%,pres_lname.ilike.%{name_query}%"
            ).execute()
            
            for kpres in kutsero_pres_data.data if kutsero_pres_data.data else []:
                all_users.append({
                    "id": kpres["user_id"],
                    "user_id": kpres["user_id"],
                    "first_name": kpres.get("pres_fname", ""),
                    "last_name": kpres.get("pres_lname", ""),
                    "middle_name": "",
                    "full_name": f"{kpres.get('pres_fname', '')} {kpres.get('pres_lname', '')}".strip(),
                    "email": kpres.get("pres_email", ""),
                    "user_role": "kutsero_president",
                    "image": None,
                })
            
            logger.info(f"✅ Found {len(kutsero_pres_data.data) if kutsero_pres_data.data else 0} kutsero presidents")
        except Exception as kpres_error:
            logger.error(f"Error searching kutsero presidents: {kpres_error}")
        
        # Sort results by relevance (exact match first, then alphabetically)
        name_query_lower = name_query.lower()
        
        def sort_key(user):
            full_name_lower = user['full_name'].lower()
            first_name_lower = user['first_name'].lower()
            last_name_lower = user['last_name'].lower()
            
            # Exact match gets highest priority
            if name_query_lower == first_name_lower or name_query_lower == last_name_lower:
                return (0, user['full_name'])
            # Starts with query gets second priority
            elif first_name_lower.startswith(name_query_lower) or last_name_lower.startswith(name_query_lower):
                return (1, user['full_name'])
            # Contains query gets third priority
            else:
                return (2, user['full_name'])
        
        all_users.sort(key=sort_key)
        
        logger.info(f"🎯 Total search results: {len(all_users)} users found for query '{name_query}'")
        
        return Response(all_users, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error searching users by name: {e}", exc_info=True)
        return Response({
            "error": "Failed to search users",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_users_by_role(request):
    """
    Enhanced version: Get users by role with better filtering for Veterinarian role
    Now includes both regular Veterinarians AND CTU Veterinarians when searching for "Veterinarian"
    """
    role = request.GET.get("role")
    
    if not role:
        return Response({"error": "role parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        all_users = []
        
        logger.info(f"📋 Fetching users with role: {role}")
        
        # ========== Handle Veterinarian role (includes CTU Vets) ==========
        if role.lower() == "veterinarian":
            # Get regular veterinarians
            approved_vets = service_client.table("users").select("id").eq("role", "Veterinarian").eq("status", "approved").execute()
            
            if approved_vets.data and len(approved_vets.data) > 0:
                vet_ids = [user["id"] for user in approved_vets.data]
                
                vet_data = service_client.table("vet_profile").select(
                    "vet_id, vet_fname, vet_lname, vet_email, vet_phone_num, vet_specialization, vet_profile_photo"
                ).in_("vet_id", vet_ids).execute()
                
                for vet in vet_data.data if vet_data.data else []:
                    avatar_url = None
                    if vet.get("vet_profile_photo"):
                        vet_photo = vet.get("vet_profile_photo")
                        if vet_photo.startswith("http://") or vet_photo.startswith("https://"):
                            avatar_url = vet_photo
                        elif vet_photo.startswith("vet_images/") or vet_photo.startswith("profile_photos/"):
                            avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{vet_photo}"
                        else:
                            avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/vet_images/{vet_photo}"
                    
                    all_users.append({
                        "id": vet["vet_id"],
                        "user_id": vet["vet_id"],
                        "first_name": vet.get("vet_fname", ""),
                        "last_name": vet.get("vet_lname", ""),
                        "full_name": f" {vet.get('vet_fname', '')} {vet.get('vet_lname', '')}".strip(),
                        "email": vet.get("vet_email", ""),
                        "phone_num": vet.get("vet_phone_num"),
                        "user_role": "veterinarian",
                        "image": avatar_url,
                        "specialization": vet.get("vet_specialization"),
                    })
            
            # Also get CTU veterinarians
            ctu_vet_data = service_client.table("ctu_vet_profile").select(
                "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_phonenum, ctu_role"
            ).execute()
            
            for ctu_vet in ctu_vet_data.data if ctu_vet_data.data else []:
                all_users.append({
                    "id": ctu_vet["ctu_id"],
                    "user_id": ctu_vet["ctu_id"],
                    "first_name": ctu_vet.get("ctu_fname", ""),
                    "last_name": ctu_vet.get("ctu_lname", ""),
                    "full_name": f" {ctu_vet.get('ctu_fname', '')} {ctu_vet.get('ctu_lname', '')}".strip(),
                    "email": ctu_vet.get("ctu_email", ""),
                    "phone_num": ctu_vet.get("ctu_phonenum"),
                    "user_role": ctu_vet.get("ctu_role", "Ctu-Vetmed"),
                    "image": None,
                    "specialization": "CTU Veterinarian",
                })
            
            logger.info(f"✅ Found {len(all_users)} veterinarians (regular + CTU)")
        
        # ========== Handle other roles ==========
        else:
            # Map frontend role names to database role names
            role_mapping = {
                "Horse Operator": "Horse Operator",
                "Kutsero": "Kutsero",
                "CTU Veterinarian": "ctu_vet",
                "DVMF": "dvmf",
                "Kutsero President": "kutsero_president"
            }
            
            db_role = role_mapping.get(role, role)
            
            if db_role == "Horse Operator":
                approved_users = service_client.table("users").select("id").eq("role", "Horse Operator").eq("status", "approved").execute()
                
                if approved_users.data:
                    user_ids = [u["id"] for u in approved_users.data]
                    profile_data = service_client.table("horse_op_profile").select(
                        "op_id, op_fname, op_mname, op_lname, op_email, op_image"
                    ).in_("op_id", user_ids).execute()
                    
                    for op in profile_data.data if profile_data.data else []:
                        avatar_url = None
                        if op.get("op_image"):
                            op_image = op.get("op_image")
                            if op_image.startswith("http://") or op_image.startswith("https://"):
                                avatar_url = op_image
                            elif op_image.startswith("kutsero_op_profile/"):
                                avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{op_image}"
                            else:
                                avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{op_image}"
                        
                        all_users.append({
                            "id": op["op_id"],
                            "user_id": op["op_id"],
                            "first_name": op.get("op_fname", ""),
                            "last_name": op.get("op_lname", ""),
                            "full_name": f"{op.get('op_fname', '')} {op.get('op_lname', '')}".strip(),
                            "email": op.get("op_email", ""),
                            "user_role": "horse_operator",
                            "image": avatar_url,
                        })
            
            elif db_role == "Kutsero":
                approved_users = service_client.table("users").select("id").eq("role", "Kutsero").eq("status", "approved").execute()
                
                if approved_users.data:
                    user_ids = [u["id"] for u in approved_users.data]
                    profile_data = service_client.table("kutsero_profile").select(
                        "kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_email, kutsero_image"
                    ).in_("kutsero_id", user_ids).execute()
                    
                    for kutsero in profile_data.data if profile_data.data else []:
                        avatar_url = None
                        if kutsero.get("kutsero_image"):
                            kutsero_image = kutsero.get("kutsero_image")
                            if kutsero_image.startswith("http://") or kutsero_image.startswith("https://"):
                                avatar_url = kutsero_image
                            elif kutsero_image.startswith("kutsero_images/"):
                                avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{kutsero_image}"
                            else:
                                avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_images/{kutsero_image}"
                        
                        all_users.append({
                            "id": kutsero["kutsero_id"],
                            "user_id": kutsero["kutsero_id"],
                            "first_name": kutsero.get("kutsero_fname", ""),
                            "last_name": kutsero.get("kutsero_lname", ""),
                            "full_name": f"{kutsero.get('kutsero_fname', '')} {kutsero.get('kutsero_lname', '')}".strip(),
                            "email": kutsero.get("kutsero_email", ""),
                            "user_role": "kutsero",
                            "image": avatar_url,
                        })
            
            elif db_role == "ctu_vet":
                ctu_vet_data = service_client.table("ctu_vet_profile").select("*").execute()
                
                for ctu_vet in ctu_vet_data.data if ctu_vet_data.data else []:
                    # Get the actual role from ctu_vet_profile table
                    ctu_role = ctu_vet.get("ctu_role", "Ctu-Vetmed")  # Default to "Ctu-Vetmed" if not found
                    
                    all_users.append({
                        "id": ctu_vet["ctu_id"],
                        "user_id": ctu_vet["ctu_id"],
                        "first_name": ctu_vet.get("ctu_fname", ""),
                        "last_name": ctu_vet.get("ctu_lname", ""),
                        "full_name": f"{ctu_vet.get('ctu_fname', '')} {ctu_vet.get('ctu_lname', '')}".strip(),
                        "email": ctu_vet.get("ctu_email", ""),
                        "phone_num": ctu_vet.get("ctu_phonenum"),
                        "user_role": ctu_role,  # ✅ Use the actual role from database
                        "image": None,
                        "specialization": "CTU Veterinarian",
                    })
            
            elif db_role == "dvmf":
                dvmf_data = service_client.table("dvmf_user_profile").select("*").execute()
                
                for dvmf in dvmf_data.data if dvmf_data.data else []:

                    # Get the role from dvmf_user_profile table
                    dvmf_role = dvmf.get("dvmf_role", "Dvmf")  # Default to "Dvmf" if not found

                    all_users.append({
                        "id": dvmf["dvmf_id"],
                        "user_id": dvmf["dvmf_id"],
                        "first_name": dvmf.get("dvmf_fname", ""),
                        "last_name": dvmf.get("dvmf_lname", ""),
                        "full_name": f"{dvmf.get('dvmf_fname', '')} {dvmf.get('dvmf_lname', '')}".strip(),
                        "email": dvmf.get("dvmf_email", ""),
                        "user_role": dvmf_role,
                        "image": None,
                    })
            
            elif db_role == "kutsero_president":
                kpres_data = service_client.table("kutsero_pres_profile").select("*").execute()
                
                for kpres in kpres_data.data if kpres_data.data else []:
                    all_users.append({
                        "id": kpres["user_id"],
                        "user_id": kpres["user_id"],
                        "first_name": kpres.get("pres_fname", ""),
                        "last_name": kpres.get("pres_lname", ""),
                        "full_name": f"{kpres.get('pres_fname', '')} {kpres.get('pres_lname', '')}".strip(),
                        "email": kpres.get("pres_email", ""),
                        "user_role": "kutsero_president",
                        "image": None,
                    })
        
        # Sort alphabetically
        all_users.sort(key=lambda x: x['full_name'])
        
        logger.info(f"✅ Returning {len(all_users)} users for role '{role}'")
        return Response(all_users, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching users by role: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch users",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_user_profile_by_id(request):
    """
    Get complete user profile by user_id - FIXED VERSION
    Returns formatted profile data for any user type
    Enhanced with better error handling and comprehensive table checking
    """
    user_id = request.GET.get("user_id")
    
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        logger.info(f"🔍 Fetching profile for user_id: {user_id}")
        
        # Try Horse Operator first
        try:
            op_data = service_client.table("horse_op_profile").select("*").eq("op_id", user_id).execute()
            
            if op_data.data and len(op_data.data) > 0:
                profile = op_data.data[0]
                
                # Build full address
                address_parts = []
                if profile.get("op_house_add"):
                    address_parts.append(profile["op_house_add"])
                if profile.get("op_brgy"):
                    address_parts.append(f"Brgy. {profile['op_brgy']}")
                if profile.get("op_municipality") or profile.get("op_city"):
                    address_parts.append(profile.get("op_municipality") or profile.get("op_city"))
                if profile.get("op_province"):
                    address_parts.append(profile["op_province"])
                if profile.get("op_zipcode"):
                    address_parts.append(profile["op_zipcode"])
                
                full_address = ", ".join(address_parts) if address_parts else None
                
                # Handle image URL
                avatar_url = None
                if profile.get("op_image"):
                    op_image = profile["op_image"]
                    if op_image.startswith("http://") or op_image.startswith("https://"):
                        avatar_url = op_image
                    elif op_image.startswith("kutsero_op_profile/"):
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{op_image}"
                    else:
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_op_profile/{op_image}"
                
                logger.info(f"✅ Found horse operator profile - phone: {profile.get('op_phone_num')}, address: {full_address}")
                
                return Response({
                    "id": profile["op_id"],
                    "user_id": profile["op_id"],
                    "first_name": profile.get("op_fname", ""),
                    "last_name": profile.get("op_lname", ""),
                    "middle_name": profile.get("op_mname", ""),
                    "full_name": f"{profile.get('op_fname', '')} {profile.get('op_lname', '')}".strip(),
                    "email": profile.get("op_email", ""),
                    "phone_num": profile.get("op_phone_num"),
                    "address": full_address,
                    "user_role": "horse_operator",
                    "image": avatar_url,
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.debug(f"Not a horse operator: {e}")
        
        # Try Kutsero
        try:
            kutsero_data = service_client.table("kutsero_profile").select("*").eq("kutsero_id", user_id).execute()
            
            if kutsero_data.data and len(kutsero_data.data) > 0:
                profile = kutsero_data.data[0]
                
                # Build full address
                address_parts = []
                if profile.get("kutsero_house_add"):
                    address_parts.append(profile["kutsero_house_add"])
                if profile.get("kutsero_brgy"):
                    address_parts.append(f"Brgy. {profile['kutsero_brgy']}")
                if profile.get("kutsero_municipality") or profile.get("kutsero_city"):
                    address_parts.append(profile.get("kutsero_municipality") or profile.get("kutsero_city"))
                if profile.get("kutsero_province"):
                    address_parts.append(profile["kutsero_province"])
                if profile.get("kutsero_zipcode"):
                    address_parts.append(profile["kutsero_zipcode"])
                
                full_address = ", ".join(address_parts) if address_parts else None
                
                # Handle image URL
                avatar_url = None
                if profile.get("kutsero_image"):
                    kutsero_image = profile["kutsero_image"]
                    if kutsero_image.startswith("http://") or kutsero_image.startswith("https://"):
                        avatar_url = kutsero_image
                    elif kutsero_image.startswith("kutsero_images/"):
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{kutsero_image}"
                    else:
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_images/{kutsero_image}"
                
                phone_number = profile.get("kutsero_phone_num")
                
                logger.info(f"✅ Found kutsero profile - phone: {phone_number}, address: {full_address}")
                
                return Response({
                    "id": profile["kutsero_id"],
                    "user_id": profile["kutsero_id"],
                    "first_name": profile.get("kutsero_fname", ""),
                    "last_name": profile.get("kutsero_lname", ""),
                    "middle_name": profile.get("kutsero_mname", ""),
                    "full_name": f"{profile.get('kutsero_fname', '')} {profile.get('kutsero_lname', '')}".strip(),
                    "email": profile.get("kutsero_email", ""),
                    "phone_num": phone_number,
                    "address": full_address,
                    "user_role": "kutsero",
                    "image": avatar_url,
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.debug(f"Not a kutsero: {e}")
        
        # Try Veterinarian
        try:
            vet_data = service_client.table("vet_profile").select("*").eq("vet_id", user_id).execute()
            
            if vet_data.data and len(vet_data.data) > 0:
                profile = vet_data.data[0]
                
                # Build home/personal address
                address_parts = []
                if profile.get("vet_street"):
                    address_parts.append(profile["vet_street"])
                if profile.get("vet_brgy"):
                    address_parts.append(f"Brgy. {profile['vet_brgy']}")
                if profile.get("vet_city"):
                    address_parts.append(profile["vet_city"])
                if profile.get("vet_province"):
                    address_parts.append(profile["vet_province"])
                if profile.get("vet_zipcode"):
                    address_parts.append(profile["vet_zipcode"])
                
                full_address = ", ".join(address_parts) if address_parts else None
                
                # Build clinic address
                clinic_address = None
                address_is_clinic = profile.get("vet_address_is_clinic", True)
                
                if address_is_clinic:
                    clinic_address = full_address
                else:
                    clinic_parts = []
                    if profile.get("vet_clinic_street"):
                        clinic_parts.append(profile["vet_clinic_street"])
                    if profile.get("vet_clinic_brgy"):
                        clinic_parts.append(f"Brgy. {profile['vet_clinic_brgy']}")
                    if profile.get("vet_clinic_city"):
                        clinic_parts.append(profile["vet_clinic_city"])
                    if profile.get("vet_clinic_province"):
                        clinic_parts.append(profile["vet_clinic_province"])
                    if profile.get("vet_clinic_zipcode"):
                        clinic_parts.append(profile["vet_clinic_zipcode"])
                    
                    clinic_address = ", ".join(clinic_parts) if clinic_parts else None
                
                # Handle image URL
                avatar_url = None
                if profile.get("vet_profile_photo"):
                    vet_photo = profile["vet_profile_photo"]
                    if vet_photo.startswith("http://") or vet_photo.startswith("https://"):
                        avatar_url = vet_photo
                    elif vet_photo.startswith("vet_images/") or vet_photo.startswith("profile_photos/"):
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/{vet_photo}"
                    else:
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/vet_images/{vet_photo}"
                
                logger.info(f"✅ Found veterinarian profile - phone: {profile.get('vet_phone_num')}, address: {full_address}")
                
                return Response({
                    "id": profile["vet_id"],
                    "user_id": profile["vet_id"],
                    "first_name": profile.get("vet_fname", ""),
                    "last_name": profile.get("vet_lname", ""),
                    "middle_name": profile.get("vet_mname", ""),
                    "full_name": f"{profile.get('vet_fname', '')} {profile.get('vet_lname', '')}".strip(),
                    "email": profile.get("vet_email", ""),
                    "phone_num": profile.get("vet_phone_num"),
                    "clinic_address": clinic_address,
                    "address": full_address,
                    "specialization": profile.get("vet_specialization"),
                    "user_role": "veterinarian",
                    "image": avatar_url,
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.debug(f"Not a veterinarian: {e}")
        
        # Try CTU Veterinarian
        try:
            ctu_vet_data = service_client.table("ctu_vet_profile").select("*").eq("ctu_id", user_id).execute()
            
            if ctu_vet_data.data and len(ctu_vet_data.data) > 0:
                profile = ctu_vet_data.data[0]
                
                ctu_role = profile.get("ctu_role", "Ctu-Vetmed")
                
                logger.info(f"✅ Found CTU veterinarian profile - phone: {profile.get('ctu_phonenum')}, role: {ctu_role}")
                
                return Response({
                    "id": profile["ctu_id"],
                    "user_id": profile["ctu_id"],
                    "first_name": profile.get("ctu_fname", ""),
                    "last_name": profile.get("ctu_lname", ""),
                    "full_name": f"{profile.get('ctu_fname', '')} {profile.get('ctu_lname', '')}".strip(),
                    "email": profile.get("ctu_email", ""),
                    "phone_num": profile.get("ctu_phonenum"),
                    "user_role": ctu_role,
                    "image": None,
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.debug(f"Not a CTU veterinarian: {e}")
        
        # Try DVMF
        try:
            dvmf_data = service_client.table("dvmf_user_profile").select("*").eq("dvmf_id", user_id).execute()
            
            if dvmf_data.data and len(dvmf_data.data) > 0:
                profile = dvmf_data.data[0]
                
                dvmf_role = profile.get("dvmf_role", "Dvmf")
                
                logger.info(f"✅ Found DVMF profile - phone: {profile.get('dvmf_phonenum')}, role: {dvmf_role}")
                
                return Response({
                    "id": profile["dvmf_id"],
                    "user_id": profile["dvmf_id"],
                    "first_name": profile.get("dvmf_fname", ""),
                    "last_name": profile.get("dvmf_lname", ""),
                    "full_name": f"{profile.get('dvmf_fname', '')} {profile.get('dvmf_lname', '')}".strip(),
                    "email": profile.get("dvmf_email", ""),
                    "phone_num": profile.get("dvmf_phonenum"),
                    "user_role": dvmf_role,
                    "image": None,
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.debug(f"Not DVMF: {e}")
        
        # Try Kutsero President
        try:
            kpres_data = service_client.table("kutsero_pres_profile").select("*").eq("user_id", user_id).execute()
            
            if kpres_data.data and len(kpres_data.data) > 0:
                profile = kpres_data.data[0]
                
                user_role_data = service_client.table("users").select("role").eq("id", user_id).execute()
                user_role = "Kutsero President"
                if user_role_data.data and len(user_role_data.data) > 0:
                    user_role = user_role_data.data[0].get("role", "Kutsero President")
                
                logger.info(f"✅ Found kutsero president profile - phone: {profile.get('pres_phonenum')}, role: {user_role}")
                
                return Response({
                    "id": profile["user_id"],
                    "user_id": profile["user_id"],
                    "first_name": profile.get("pres_fname", ""),
                    "last_name": profile.get("pres_lname", ""),
                    "full_name": f"{profile.get('pres_fname', '')} {profile.get('pres_lname', '')}".strip(),
                    "email": profile.get("pres_email", ""),
                    "phone_num": profile.get("pres_phonenum"),
                    "user_role": user_role,
                    "image": None,
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.debug(f"Not kutsero president: {e}")
        
        # NEW: Check if user exists in users table but has no profile
        try:
            user_data = service_client.table("users").select("*").eq("id", user_id).execute()
            
            if user_data.data and len(user_data.data) > 0:
                user = user_data.data[0]
                user_role = user.get("role", "user")
                user_status = user.get("status", "active")
                
                logger.info(f"⚠️ User found in users table but no profile - ID: {user_id}, Role: {user_role}, Status: {user_status}")
                
                # Return basic user info
                return Response({
                    "id": user["id"],
                    "user_id": user["id"],
                    "first_name": "User",
                    "last_name": "",
                    "full_name": "User",
                    "email": user.get("email", ""),
                    "phone_num": None,
                    "user_role": user_role,
                    "user_status": user_status,
                    "image": None,
                    "note": "User exists but has no detailed profile"
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.debug(f"Not in users table either: {e}")
        
        # User not found in any table
        logger.error(f"❌ User {user_id} not found in any profile or users table")
        return Response({
            "error": "User profile not found",
            "user_id": user_id,
            "detail": "The user ID was not found in any profile table or users table"
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        logger.error(f"❌ Error fetching user profile by ID: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch user profile",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_vet_schedule_for_profile(request):
    """
    Get veterinarian's available schedule for displaying in profile
    Shows only future available time slots
    """
    vet_id = request.GET.get("vet_id")
    
    if not vet_id:
        return Response({"error": "vet_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        logger.info(f"Fetching schedule for vet profile: {vet_id}")
        
        # Get current date and time
        now = datetime.now()
        today = now.date().isoformat()
        
        # Query available schedules
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        data = service_client.table("vet_schedule").select(
            "sched_id, vet_id, sched_date, start_time, end_time, is_available"
        ).eq("vet_id", vet_id).eq("is_available", True).gte("sched_date", today).order(
            "sched_date", desc=False
        ).order("start_time", desc=False).limit(10).execute()  # Limit to next 10 available slots
        
        if not data.data:
            logger.info(f"No available schedules for vet {vet_id}")
            return Response({
                "vet_id": vet_id,
                "schedules": [],
                "message": "No available schedules"
            }, status=status.HTTP_200_OK)
        
        # Format schedules
        formatted_schedules = []
        filtered_count = 0
        
        for schedule_item in data.data:
            sched_date = schedule_item.get("sched_date")
            start_time = schedule_item.get("start_time")
            end_time = schedule_item.get("end_time")
            
            # Skip if essential fields missing
            if not sched_date or not start_time:
                continue
            
            # Filter out past schedules
            if is_schedule_in_past(sched_date, start_time):
                filtered_count += 1
                continue
            
            # Format times
            start_time_formatted = format_time_to_12_hour(start_time)
            end_time_formatted = format_time_to_12_hour(end_time) if end_time else ""
            time_display = format_time_range(start_time, end_time) if end_time else start_time_formatted
            
            # Format date for display
            try:
                date_obj = datetime.strptime(str(sched_date), '%Y-%m-%d')
                formatted_date = date_obj.strftime('%B %d, %Y')  # e.g., "January 15, 2025"
                day_of_week = date_obj.strftime('%A')  # e.g., "Monday"
            except:
                formatted_date = str(sched_date)
                day_of_week = ""
            
            formatted_schedules.append({
                "sched_id": str(schedule_item.get("sched_id")),
                "sched_date": str(sched_date),
                "formatted_date": formatted_date,
                "day_of_week": day_of_week,
                "start_time": str(start_time),
                "end_time": str(end_time) if end_time else "",
                "time_display": time_display,
                "start_time_formatted": start_time_formatted,
                "end_time_formatted": end_time_formatted,
                "is_available": True
            })
        
        logger.info(f"Returning {len(formatted_schedules)} schedule slots for vet profile")
        
        return Response({
            "vet_id": vet_id,
            "schedules": formatted_schedules,
            "total_available": len(formatted_schedules),
            "message": f"Found {len(formatted_schedules)} available slot(s)"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching vet schedule for profile: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch schedule",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ====================================================================================================

@api_view(['GET'])
def get_user_profile(request, user_id):
    """
    MAIN UNIFIED FUNCTION: Get detailed user profile information for any user type
    This is the primary profile endpoint - use this instead of role-specific endpoints
    
    Supports all user types:
    - Horse Operators (horse_op_profile)
    - Kutseros (kutsero_profile)
    - Veterinarians (vet_profile)
    - CTU Veterinarians (ctu_vet_profile)
    - DVMF Users (dvmf_user_profile)
    - Kutsero Presidents (kutsero_pres_profile)
    """
    try:
        logger.info(f"Fetching unified profile for user_id: {user_id}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Try to find user in different tables
        user_data = None
        user_type = None
        
        # Check horse_op_profile
        try:
            horse_op = service_client.table("horse_op_profile").select("*").eq("op_id", user_id).execute()
            if horse_op.data and len(horse_op.data) > 0:
                profile = horse_op.data[0]
                logger.info(f"Found horse operator profile: {profile}")
                
                # Build full address
                address_parts = []
                if profile.get("op_house_add"):
                    address_parts.append(profile["op_house_add"])
                if profile.get("op_brgy"):
                    address_parts.append(f"Brgy. {profile['op_brgy']}")
                if profile.get("op_municipality") or profile.get("op_city"):
                    address_parts.append(profile.get("op_municipality") or profile.get("op_city"))
                if profile.get("op_province"):
                    address_parts.append(profile["op_province"])
                if profile.get("op_zipcode"):
                    address_parts.append(profile["op_zipcode"])
                
                full_address = ", ".join(address_parts) if address_parts else None
                
                user_data = {
                    "id": profile.get("op_id"),
                    "email": profile.get("op_email"),
                    "role": "Horse Operator",
                    "status": "active",
                    "profile": {
                        "fname": profile.get("op_fname"),
                        "mname": profile.get("op_mname"),
                        "lname": profile.get("op_lname"),
                        "username": profile.get("op_username"),
                        "email": profile.get("op_email"),
                        "phone": profile.get("op_phone_num"),
                        "city": profile.get("op_city"),
                        "province": profile.get("op_province"),
                        "address": full_address,
                        "profile_image": profile.get("op_image")
                    }
                }
                user_type = "horse_operator"
                logger.info(f"Horse operator profile - city: {profile.get('op_city')}, province: {profile.get('op_province')}, address: {full_address}")
        except Exception as e:
            logger.error(f"Error checking horse operator: {e}")
        
        # Check kutsero_profile
        if not user_data:
            try:
                kutsero = service_client.table("kutsero_profile").select("*").eq("kutsero_id", user_id).execute()
                if kutsero.data and len(kutsero.data) > 0:
                    profile = kutsero.data[0]
                    logger.info(f"Found kutsero profile: {profile}")
                    
                    # Build full address
                    address_parts = []
                    if profile.get("kutsero_house_add"):
                        address_parts.append(profile["kutsero_house_add"])
                    if profile.get("kutsero_brgy"):
                        address_parts.append(f"Brgy. {profile['kutsero_brgy']}")
                    if profile.get("kutsero_municipality") or profile.get("kutsero_city"):
                        address_parts.append(profile.get("kutsero_municipality") or profile.get("kutsero_city"))
                    if profile.get("kutsero_province"):
                        address_parts.append(profile["kutsero_province"])
                    if profile.get("kutsero_zipcode"):
                        address_parts.append(profile["kutsero_zipcode"])
                    
                    full_address = ", ".join(address_parts) if address_parts else None
                    
                    user_data = {
                        "id": profile.get("kutsero_id"),
                        "email": profile.get("kutsero_email"),
                        "role": "Kutsero",
                        "status": "active",
                        "profile": {
                            "fname": profile.get("kutsero_fname"),
                            "mname": profile.get("kutsero_mname"),
                            "lname": profile.get("kutsero_lname"),
                            "username": profile.get("kutsero_username"),
                            "email": profile.get("kutsero_email"),
                            "phone": profile.get("kutsero_phone_num"),
                            "city": profile.get("kutsero_city"),
                            "province": profile.get("kutsero_province"),
                            "address": full_address,
                            "profile_image": profile.get("kutsero_image")
                        }
                    }
                    user_type = "kutsero"
                    logger.info(f"Kutsero profile - city: {profile.get('kutsero_city')}, province: {profile.get('kutsero_province')}, address: {full_address}")
            except Exception as e:
                logger.error(f"Error checking kutsero: {e}")
        
        # Check vet_profile
        if not user_data:
            try:
                vet = service_client.table("vet_profile").select("*").eq("vet_id", user_id).execute()
                if vet.data and len(vet.data) > 0:
                    profile = vet.data[0]
                    logger.info(f"Found vet profile: {profile}")
                    
                    # Build clinic address for veterinarians
                    clinic_address_parts = []
                    
                    # Check if there's a specific clinic address
                    has_clinic_address = False
                    
                    if profile.get("vet_clinic_name"):
                        clinic_address_parts.append(profile["vet_clinic_name"])
                        has_clinic_address = True
                    
                    if profile.get("vet_clinic_street"):
                        clinic_address_parts.append(profile["vet_clinic_street"])
                        has_clinic_address = True
                    
                    if profile.get("vet_clinic_brgy"):
                        clinic_address_parts.append(f"Brgy. {profile['vet_clinic_brgy']}")
                        has_clinic_address = True
                    
                    if profile.get("vet_clinic_city"):
                        clinic_address_parts.append(profile["vet_clinic_city"])
                        has_clinic_address = True
                    
                    if profile.get("vet_clinic_province"):
                        clinic_address_parts.append(profile["vet_clinic_province"])
                        has_clinic_address = True
                    
                    if profile.get("vet_clinic_zipcode"):
                        clinic_address_parts.append(profile["vet_clinic_zipcode"])
                        has_clinic_address = True
                    
                    # If no clinic address found, use personal address
                    if not has_clinic_address:
                        logger.info("No clinic address found, using personal address")
                        if profile.get("vet_street"):
                            clinic_address_parts.append(profile["vet_street"])
                        if profile.get("vet_brgy"):
                            clinic_address_parts.append(f"Brgy. {profile['vet_brgy']}")
                        if profile.get("vet_city"):
                            clinic_address_parts.append(profile["vet_city"])
                        if profile.get("vet_province"):
                            clinic_address_parts.append(profile["vet_province"])
                        if profile.get("vet_zipcode"):
                            clinic_address_parts.append(profile["vet_zipcode"])
                    
                    clinic_address = ", ".join(clinic_address_parts) if clinic_address_parts else None
                    
                    # Get individual clinic address components for frontend display
                    clinic_street = profile.get("vet_clinic_street")
                    clinic_barangay = profile.get("vet_clinic_brgy")
                    clinic_city = profile.get("vet_clinic_city")
                    clinic_province = profile.get("vet_clinic_province")
                    clinic_zipcode = profile.get("vet_clinic_zipcode")
                    
                    user_data = {
                        "id": profile.get("vet_id"),
                        "email": profile.get("vet_email"),
                        "role": "Veterinarian",
                        "status": "active",
                        "profile": {
                            "fname": profile.get("vet_fname"),
                            "mname": profile.get("vet_mname"),
                            "lname": profile.get("vet_lname"),
                            "username": profile.get("vet_username"),
                            "email": profile.get("vet_email"),
                            "phone": profile.get("vet_phone_num"),
                            "address": clinic_address, 
                            "clinic_street": clinic_street,
                            "clinic_barangay": clinic_barangay,
                            "clinic_city": clinic_city,
                            "clinic_province": clinic_province,
                            "clinic_zipcode": clinic_zipcode,
                            "profile_image": profile.get("vet_profile_photo"),
                            "specialization": profile.get("vet_specialization"),
                            "experience_years": profile.get("vet_exp_yr")
                        }
                    }
                    user_type = "veterinarian"
                    logger.info(f"Vet profile - clinic street: {clinic_street}, barangay: {clinic_barangay}, city: {clinic_city}, province: {clinic_province}, zipcode: {clinic_zipcode}")
                    logger.info(f"Full clinic address: {clinic_address}")
            except Exception as e:
                logger.error(f"Error checking vet: {e}")
        
        # Check ctu_vet_profile
        if not user_data:
            try:
                ctu = service_client.table("ctu_vet_profile").select("*").eq("ctu_id", user_id).execute()
                if ctu.data and len(ctu.data) > 0:
                    profile = ctu.data[0]
                    logger.info(f"Found CTU vet profile: {profile}")
                    
                    # Get the role from the profile, default to "Ctu-Vetmed" if not specified
                    ctu_role = profile.get("ctu_role", "Ctu-Vetmed")
                    
                    # Build address for CTU vets
                    address_parts = []
                    if profile.get("ctu_address"):
                        address_parts.append(profile["ctu_address"])
                    if profile.get("ctu_city"):
                        address_parts.append(profile["ctu_city"])
                    if profile.get("ctu_province"):
                        address_parts.append(profile["ctu_province"])
                    
                    full_address = ", ".join(address_parts) if address_parts else None
                    
                    user_data = {
                        "id": profile.get("ctu_id"),
                        "email": profile.get("ctu_email"),
                        "role": ctu_role,
                        "status": "active",
                        "profile": {
                            "fname": profile.get("ctu_fname"),
                            "lname": profile.get("ctu_lname"),
                            "email": profile.get("ctu_email"),
                            "phone": profile.get("ctu_phonenum"),
                            "city": profile.get("ctu_city"),
                            "province": profile.get("ctu_province"),
                            "address": full_address,
                            "profile_image": None
                        }
                    }
                    user_type = "ctu_vet"
                    logger.info(f"CTU vet profile - role: {ctu_role}, address: {full_address}")
            except Exception as e:
                logger.error(f"Error checking CTU vet: {e}")
        
        # Check dvmf_user_profile
        if not user_data:
            try:
                dvmf = service_client.table("dvmf_user_profile").select("*").eq("dvmf_id", user_id).execute()
                if dvmf.data and len(dvmf.data) > 0:
                    profile = dvmf.data[0]
                    logger.info(f"Found DVMF user profile: {profile}")
                    
                    # Get the role from the profile, default to "Dvmf" if not specified
                    dvmf_role = profile.get("dvmf_role", "Dvmf")
                    
                    # Build address for DVMF users
                    address_parts = []
                    if profile.get("dvmf_address"):
                        address_parts.append(profile["dvmf_address"])
                    if profile.get("dvmf_city"):
                        address_parts.append(profile["dvmf_city"])
                    if profile.get("dvmf_province"):
                        address_parts.append(profile["dvmf_province"])
                    
                    full_address = ", ".join(address_parts) if address_parts else None
                    
                    user_data = {
                        "id": profile.get("dvmf_id"),
                        "email": profile.get("dvmf_email"),
                        "role": dvmf_role,
                        "status": "active",
                        "profile": {
                            "fname": profile.get("dvmf_fname"),
                            "lname": profile.get("dvmf_lname"),
                            "email": profile.get("dvmf_email"),
                            "phone": profile.get("dvmf_phonenum"),
                            "city": profile.get("dvmf_city"),
                            "province": profile.get("dvmf_province"),
                            "address": full_address,
                            "profile_image": None
                        }
                    }
                    user_type = "dvmf_user"
                    logger.info(f"DVMF user profile - role: {dvmf_role}, address: {full_address}")
            except Exception as e:
                logger.error(f"Error checking DVMF user: {e}")
        
        # Check kutsero_pres_profile
        if not user_data:
            try:
                kpres = service_client.table("kutsero_pres_profile").select("*").eq("user_id", user_id).execute()
                if kpres.data and len(kpres.data) > 0:
                    profile = kpres.data[0]
                    logger.info(f"Found Kutsero President profile: {profile}")
                    
                    # Build address for Kutsero President
                    address_parts = []
                    if profile.get("pres_address"):
                        address_parts.append(profile["pres_address"])
                    if profile.get("pres_city"):
                        address_parts.append(profile["pres_city"])
                    if profile.get("pres_province"):
                        address_parts.append(profile["pres_province"])
                    
                    full_address = ", ".join(address_parts) if address_parts else None
                    
                    user_data = {
                        "id": profile.get("user_id"),
                        "email": profile.get("pres_email"),
                        "role": "Kutsero President",
                        "status": "active",
                        "profile": {
                            "fname": profile.get("pres_fname"),
                            "lname": profile.get("pres_lname"), 
                            "email": profile.get("pres_email"),
                            "phone": profile.get("pres_phonenum"),
                            "city": profile.get("pres_city"),
                            "province": profile.get("pres_province"),
                            "address": full_address,
                            "profile_image": None
                        }
                    }
                    user_type = "kutsero_president"
                    logger.info(f"Kutsero President profile - address: {full_address}")
            except Exception as e:
                logger.error(f"Error checking Kutsero President: {e}")
        
        if user_data:
            logger.info(f"✅ Successfully found user: {user_type}")
            logger.info(f"✅ Profile data: {user_data}")
            return Response({
                'success': True,
                'user': user_data,
                'user_type': user_type
            }, status=status.HTTP_200_OK)
        else:
            logger.warning(f"❌ User not found: {user_id}")
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"❌ Error fetching user profile: {e}")
        logger.error(traceback.format_exc())
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ======================================================== CHANGE PASSWORD ==================================================================================
@api_view(["POST"])
def forgot_password(request):
    email = request.data.get("email")
    if not email:
        return Response({"error": "Email is required."},
                        status=status.HTTP_400_BAD_REQUEST)

    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    resp = requests.get(url, headers=headers)

    if not resp.ok:
        return Response({"error": "Failed to query Supabase."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = resp.json()
    users = data.get("users", [])

    # 👇 Check kung naa ba'y match sa email
    user = next((u for u in users if u.get("email") == email), None)

    if not user:
        return Response({"exists": False, "error": "Email not registered."},
                        status=status.HTTP_404_NOT_FOUND)

    return Response({"exists": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
def reset_password(request):
    email = request.data.get("email")
    new_password = request.data.get("newPassword")

    if not email or not new_password:
        return Response({"error": "Email and new password are required."},
                        status=status.HTTP_400_BAD_REQUEST)

    # 1. Get all users from Supabase
    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }

    resp = requests.get(url, headers=headers)
    if not resp.ok:
        return Response({"error": "Failed to query Supabase."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = resp.json()
    users = data.get("users", [])

    # 2. Find user by email
    user = next((u for u in users if u.get("email") == email), None)
    if not user:
        return Response({"error": "Email not registered."},
                        status=status.HTTP_404_NOT_FOUND)

    user_id = user.get("id")

    # 3. Update password
    update_url = f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    payload = {"password": new_password}

    update_resp = requests.put(update_url, headers=headers, json=payload)

    if not update_resp.ok:
        return Response({"error": "Failed to reset password."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"success": True, "message": "Password reset successful."},
                    status=status.HTTP_200_OK)


@api_view(["POST"])
def change_password(request):
    """
    Change user password with current password verification
    """
    email = request.data.get("email")
    current_password = request.data.get("currentPassword")
    new_password = request.data.get("newPassword")
    
    if not email or not current_password or not new_password:
        return Response(
            {"error": "Email, current password and new password are required."}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(new_password) < 8:
        return Response(
            {"error": "New password must be at least 8 characters long."}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # 1. Verify current password by attempting to sign in
        auth_url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
        auth_headers = {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        }
        auth_payload = {
            "email": email,
            "password": current_password,
        }
        
        print(f"🔐 Attempting to verify current password for: {email}")
        auth_resp = requests.post(auth_url, headers=auth_headers, json=auth_payload)
        
        if not auth_resp.ok:
            print(f"❌ Current password verification failed: {auth_resp.status_code}")
            return Response(
                {"error": "Current password is incorrect."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        print("✅ Current password verified successfully")
        
        # 2. Get user ID from auth response
        auth_data = auth_resp.json()
        user_id = auth_data.get("user", {}).get("id")
        
        if not user_id:
            return Response(
                {"error": "Failed to get user information."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        print(f"👤 User ID found: {user_id}")
        
        # 3. Update password using admin API
        update_url = f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}"
        admin_headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        }
        update_payload = {"password": new_password}
        
        print(f"🔄 Attempting to update password for user: {user_id}")
        update_resp = requests.put(update_url, headers=admin_headers, json=update_payload)
        
        print(f"📊 Update response status: {update_resp.status_code}")
        print(f"📊 Update response content: {update_resp.text}")
        
        if not update_resp.ok:
            try:
                error_detail = update_resp.json()
                print(f"❌ Supabase error detail: {error_detail}")
            except:
                error_detail = update_resp.text
                print(f"❌ Supabase error text: {error_detail}")
            
            return Response(
                {"error": "Failed to update password. Please try again."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        print("✅ Password updated successfully in Supabase")
        
        return Response(
            {"success": True, "message": "Password updated successfully."}, 
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        print(f"💥 Exception in change_password: {str(e)}")
        return Response(
            {"error": f"An error occurred: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ------------------------------------------------ REMINDER NOTIF ------------------------------------------------
def get_operator_by_input(operator_input):
    """
    Returns a list of horse operator dicts with 'op_id' from input.
    Accepts either UUID or first name (op_fname)
    """
    try:
        # Try to parse as UUID
        val = uuid.UUID(operator_input, version=4)
        operator_response = supabase.table('horse_op_profile')\
            .select('op_id, op_fname, op_lname')\
            .eq('op_id', str(val))\
            .execute()
    except ValueError:
        # Treat as first name
        operator_response = supabase.table('horse_op_profile')\
            .select('op_id, op_fname, op_lname')\
            .eq('op_fname', operator_input)\
            .execute()

    return operator_response.data if operator_response.data else []


@api_view(['GET'])
def feed_water_notifications(request):
    """
    Get all feed and water notifications for the horse operator.
    """
    try:
        operator_input = request.GET.get('op_id')
        horse_id = request.GET.get('horse_id')

        if not operator_input:
            return Response({
                'success': False,
                'message': 'operator_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        now = datetime.now()
        current_time = now.strftime('%I:%M %p')
        notifications = []

        operators = get_operator_by_input(operator_input)
        if not operators:
            return Response({
                'success': True,
                'data': [],
                'count': 0,
                'current_time': current_time,
                'message': 'Horse operator not found'
            })

        operator_uuid = operators[0]['op_id']

        # Map horse IDs to names
        horses_response = supabase.table('horse_profile')\
            .select('horse_id, horse_name')\
            .eq('op_id', operator_uuid)\
            .execute()
        horse_map = {h['horse_id']: h['horse_name'] for h in (horses_response.data or [])}

        # Fetch feed schedules (ignore horse status)
        feeds = (supabase.table('feed_detail')
                .select('*')
                .eq('op_id', operator_uuid)
                .execute().data or [])
        if horse_id:
            feeds = [f for f in feeds if f.get('horse_id') == horse_id]

        for feed in feeds:
            horse_name = horse_map.get(feed.get('horse_id'), 'Unknown Horse')
            notifications.append({
                'id': f'feed_{feed.get("fd_id")}',
                'type': 'feed',
                'title': f'🍽️ {feed.get("fd_meal_type")} Time',
                'message': f'Time to feed {horse_name}: {feed.get("fd_food_type")} ({feed.get("fd_qty")})',
                'scheduled_time': feed.get('fd_time'),
                'horse_id': feed.get('horse_id'),
                'horse_name': horse_name,
                'details': {
                    'meal_type': feed.get('fd_meal_type'),
                    'food_type': feed.get('fd_food_type'),
                    'quantity': feed.get('fd_qty'),
                },
                'timestamp': now.isoformat(),
            })

        # Fetch water schedules (ignore horse status)
        waters = (supabase.table('water_detail')
                .select('*')
                .eq('op_id', operator_uuid)
                .execute().data or [])
        if horse_id:
            waters = [w for w in waters if w.get('horse_id') == horse_id]

        for water in waters:
            horse_name = horse_map.get(water.get('horse_id'), 'Unknown Horse')
            notifications.append({
                'id': f'water_{water.get("water_id")}',
                'type': 'water',
                'title': f'💧 {water.get("water_period")} Watering Time',
                'message': f'Time to give {horse_name} water: {water.get("water_amount")}',
                'scheduled_time': water.get('water_time'),
                'horse_id': water.get('horse_id'),
                'horse_name': horse_name,
                'details': {
                    'period': water.get('water_period'),
                    'amount': water.get('water_amount'),
                },
                'timestamp': now.isoformat(),
            })

        return Response({
            'success': True,
            'data': notifications,
            'count': len(notifications),
            'current_time': current_time,
        })

    except Exception as e:
        print(f"Error in feed_water_notifications: {str(e)}")
        return Response({
            'success': False,
            'message': f'Error fetching notifications: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def check_current_schedules(request):
    """
    Check if any feed/water schedules are due right now.
    Accepts either UUID or first name.
    """
    try:
        operator_input = request.GET.get('op_id')
        if not operator_input:
            return Response({
                'success': False,
                'message': 'operator_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        now = datetime.now()
        current_time = now.strftime('%I:%M %p')
        prev_minute = (now - timedelta(minutes=1)).strftime('%I:%M %p')
        due_notifications = []

        operators = get_operator_by_input(operator_input)
        if not operators:
            return Response({
                'success': True,
                'data': [],
                'count': 0,
                'current_time': current_time,
                'has_due_schedules': False,
            })

        operator_uuid = operators[0]['op_id']

        # Map horse IDs to names (only horses owned by this operator)
        horses_response = supabase.table('horse_profile')\
            .select('horse_id, horse_name')\
            .eq('op_id', operator_uuid)\
            .execute()
        horse_map = {h['horse_id']: h['horse_name'] for h in (horses_response.data or [])}

        # Check feed schedules (ignore horse status)
        feeds = (supabase.table('feed_detail')
                .select('*')
                .eq('op_id', operator_uuid)
                .execute().data or [])
        for feed in feeds:
            if feed.get('fd_time') in [current_time, prev_minute]:
                horse_name = horse_map.get(feed.get('horse_id'), 'Unknown Horse')
                due_notifications.append({
                    'id': f'feed_{feed.get("fd_id")}',
                    'type': 'feed',
                    'title': f'🍽️ {feed.get("fd_meal_type")} Time!',
                    'message': f'Time to feed {horse_name}: {feed.get("fd_food_type")} ({feed.get("fd_qty")})',
                    'scheduled_time': feed.get('fd_time'),
                    'horse_id': feed.get('horse_id'),
                    'horse_name': horse_name,
                    'priority': 'high',
                    'timestamp': now.isoformat(),
                })

        # Check water schedules (ignore horse status)
        waters = (supabase.table('water_detail')
                .select('*')
                .eq('op_id', operator_uuid)
                .execute().data or [])
        for water in waters:
            if water.get('water_time') in [current_time, prev_minute]:
                horse_name = horse_map.get(water.get('horse_id'), 'Unknown Horse')
                due_notifications.append({
                    'id': f'water_{water.get("water_id")}',
                    'type': 'water',
                    'title': f'💧 {water.get("water_period")} Watering Time!',
                    'message': f'Time to give {horse_name} water: {water.get("water_amount")}',
                    'scheduled_time': water.get('water_time'),
                    'horse_id': water.get('horse_id'),
                    'horse_name': horse_name,
                    'priority': 'high',
                    'timestamp': now.isoformat(),
                })

        return Response({
            'success': True,
            'data': due_notifications,
            'count': len(due_notifications),
            'current_time': current_time,
            'has_due_schedules': len(due_notifications) > 0,
        })

    except Exception as e:
        print(f"Error in check_current_schedules: {str(e)}")
        return Response({
            'success': False,
            'message': f'Error checking schedules: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ------------------------------------------------ HORSE DEATH RECORDS API ------------------------------------------------

@api_view(['POST'])
def mark_horse_deceased(request):
    """
    Mark a horse as deceased and save death record with MULTIPLE images
    """
    try:
        logger.info(f"Received death record request: {request.data}")
        
        user_id = request.data.get("user_id")
        horse_id = request.data.get("horse_id")
        death_date = request.data.get("death_date")
        cause_of_death = request.data.get("cause_of_death")
        death_location = request.data.get("death_location")
        images = request.data.get("images", [])  # List of base64 strings
        
        logger.info(f"Parsed data - user_id: {user_id}, horse_id: {horse_id}, image_count: {len(images)}")

        # Validate required fields
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not horse_id:
            return Response({"error": "horse_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not cause_of_death or not cause_of_death.strip():
            return Response({"error": "cause_of_death is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate death_date
        parsed_death_date = None
        if death_date:
            try:
                parsed_death_date = datetime.strptime(death_date, '%Y-%m-%d').date()
                if parsed_death_date > datetime.now().date():
                    return Response({"error": "Death date cannot be in the future"}, status=status.HTTP_400_BAD_REQUEST)
            except ValueError:
                return Response({"error": "Invalid death_date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            parsed_death_date = datetime.now().date()

        # Verify horse exists and belongs to user
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        horse_check = service_client.table("horse_profile").select("*").eq("horse_id", horse_id).eq("op_id", user_id).execute()
        
        if not horse_check.data:
            return Response({"error": "Horse not found or doesn't belong to user"}, status=status.HTTP_404_NOT_FOUND)
        
        horse_info = horse_check.data[0]
        horse_name = horse_info.get("horse_name", "Unknown Horse")
        
        # Check if horse is already deceased
        if horse_info.get("horse_status") == "Deceased":
            return Response({"error": f"{horse_name} is already marked as deceased"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if death record already exists for this horse
        existing_death_record = service_client.table("horse_death_records").select("*").eq("horse_id", horse_id).execute()
        if existing_death_record.data:
            return Response({"error": f"Death record already exists for {horse_name}"}, status=status.HTTP_400_BAD_REQUEST)

        # Start transaction
        try:
            # Generate UUIDs
            hdeath_id = str(uuid.uuid4())
            current_timestamp = datetime.now(pytz.UTC).isoformat()
            
            # Process multiple images
            uploaded_images = []
            
            if images and isinstance(images, list):
                for idx, image_base64 in enumerate(images):
                    if not image_base64 or not isinstance(image_base64, str):
                        continue
                        
                    try:
                        # Extract base64 data
                        if ',' in image_base64:
                            image_base64 = image_base64.split(',')[1]
                        
                        # Decode base64 to bytes
                        try:
                            image_bytes = base64.b64decode(image_base64, validate=True)
                        except base64.binascii.Error as e:
                            logger.error(f"Invalid base64 data for image {idx}: {e}")
                            continue
                        
                        file_size = len(image_bytes)
                        
                        # Check file size (max 10MB per image)
                        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
                        if file_size > MAX_FILE_SIZE:
                            logger.warning(f"Image {idx} exceeds size limit (10MB). Skipping.")
                            continue
                        
                        # Generate unique filename
                        timestamp = int(datetime.now().timestamp() * 1000)
                        random_suffix = uuid.uuid4().hex[:8]
                        filename = f"{horse_id}_{timestamp}_{idx}_{random_suffix}.jpg"
                        
                        # FIXED: Upload to Supabase Storage with proper headers
                        try:
                            storage_response = service_client.storage.from_('death_records').upload(
                                path=filename,
                                file=image_bytes,
                                file_options={
                                    "content-type": "image/jpeg",
                                    "cache-control": "3600"
                                }
                            )
                            
                            logger.info(f"Storage upload response for {filename}: {storage_response}")
                            
                            # Check for errors
                            if hasattr(storage_response, 'error') and storage_response.error:
                                logger.error(f"Storage upload error for {filename}: {storage_response.error}")
                                continue
                            
                        except Exception as upload_error:
                            logger.error(f"Failed to upload {filename}: {upload_error}", exc_info=True)
                            # Try alternative upload method without file_options
                            try:
                                storage_response = service_client.storage.from_('death_records').upload(
                                    path=filename,
                                    file=image_bytes
                                )
                                logger.info(f"Alternative upload succeeded for {filename}")
                            except Exception as alt_error:
                                logger.error(f"Alternative upload also failed: {alt_error}")
                                continue
                        
                        # Construct public URL
                        image_url = f"{SUPABASE_URL}/storage/v1/object/public/death_records/{filename}"
                        uploaded_images.append(image_url)
                        logger.info(f"Image {idx} uploaded successfully: {image_url}")
                        
                    except Exception as image_error:
                        logger.error(f"Error processing image {idx}: {image_error}", exc_info=True)
                        # Continue processing other images even if one fails
                        continue
            
            # Create death record with image URLs as JSON array
            death_record_payload = {
                "hdeath_id": hdeath_id,
                "horse_id": horse_id,
                "op_id": user_id,
                "hdeath_date": parsed_death_date.isoformat(),
                "cause_of_death": cause_of_death.strip(),
                "death_location": death_location.strip() if death_location else None,
                "status": "recorded",
                "created_at": current_timestamp,
                "updated_at": current_timestamp,
                "images": uploaded_images if uploaded_images else None  # Store as JSON array
            }
            
            logger.info(f"Creating death record for horse {horse_id} ({horse_name})")
            logger.info(f"Death record payload: {death_record_payload}")
            
            # Insert death record
            death_record_result = service_client.table("horse_death_records").insert(death_record_payload).execute()
            
            if not death_record_result.data:
                raise Exception("Failed to create death record")
            
            logger.info(f"✅ Death record created: {hdeath_id} with {len(uploaded_images)} images")
            
            # Update horse status to 'Deceased'
            update_horse_result = service_client.table("horse_profile").update({
                "horse_status": "Deceased",
                "updated_at": current_timestamp
            }).eq("horse_id", horse_id).eq("op_id", user_id).execute()
            
            if not update_horse_result.data:
                raise Exception("Failed to update horse status")
            
            logger.info(f"✅ Horse {horse_id} ({horse_name}) marked as deceased")
            
            return Response({
                "success": True,
                "message": f"{horse_name} has been marked as deceased with {len(uploaded_images)} images.",
                "data": {
                    "horse_id": horse_id,
                    "horse_name": horse_name,
                    "death_record_id": hdeath_id,
                    "death_date": parsed_death_date.isoformat(),
                    "cause_of_death": cause_of_death.strip(),
                    "death_location": death_location.strip() if death_location else None,
                    "images_uploaded": len(uploaded_images),
                    "image_urls": uploaded_images,
                    "new_status": "Deceased",
                    "timestamp": current_timestamp
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as transaction_error:
            logger.error(f"Transaction error in mark_horse_deceased: {transaction_error}", exc_info=True)
            return Response({
                "error": "Failed to complete death record",
                "detail": str(transaction_error)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error in mark_horse_deceased: {e}", exc_info=True)
        return Response({
            "error": "Failed to mark horse as deceased",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horse_death_records(request):
    """
    Get death records for a horse operator's horses
    """
    user_id = request.GET.get("user_id")
    
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get all death records for horses owned by this operator
        death_records = service_client.table("horse_death_records").select(
            "hdeath_id, horse_id, hdeath_date, cause_of_death, death_location, status, created_at, updated_at, images"
        ).eq("op_id", user_id).order("created_at", desc=True).execute()
        
        if not death_records.data:
            return Response({
                "success": True,
                "user_id": user_id,
                "death_records": [],
                "total_records": 0,
                "message": "No death records found"
            }, status=status.HTTP_200_OK)
        
        # Get horse names for the records
        horse_ids = list(set([record["horse_id"] for record in death_records.data]))
        horse_data = service_client.table("horse_profile").select("horse_id, horse_name, horse_image").in_("horse_id", horse_ids).execute()
        
        horse_map = {}
        if horse_data.data:
            for horse in horse_data.data:
                horse_map[horse["horse_id"]] = {
                    "name": horse["horse_name"],
                    "image": horse.get("horse_image")
                }
        
        # Format records
        formatted_records = []
        for record in death_records.data:
            # Format death date
            death_date = record.get("hdeath_date")
            formatted_date = "Unknown Date"
            readable_date = ""
            if death_date:
                try:
                    if isinstance(death_date, str):
                        date_obj = datetime.strptime(str(death_date), '%Y-%m-%d')
                    else:
                        date_obj = death_date
                    formatted_date = date_obj.strftime('%B %d, %Y')
                    readable_date = date_obj.strftime('%Y-%m-%d')
                except Exception as date_error:
                    logger.error(f"Error parsing date {death_date}: {date_error}")
                    formatted_date = str(death_date)
                    readable_date = str(death_date)
            
            # Format timestamps
            created_at = record.get("created_at")
            formatted_created = created_at
            if created_at:
                try:
                    if isinstance(created_at, str):
                        created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        created_dt = created_at
                    
                    if created_dt.tzinfo is None:
                        created_dt = pytz.UTC.localize(created_dt)
                    
                    created_dt_ph = created_dt.astimezone(PHILIPPINE_TZ)
                    formatted_created = created_dt_ph.strftime('%B %d, %Y %I:%M %p')
                except:
                    formatted_created = str(created_at)
            
            horse_info = horse_map.get(record["horse_id"], {})
            
            # Get images array
            images = record.get("images", [])
            if not isinstance(images, list):
                images = []
            
            formatted_records.append({
                "death_record_id": record["hdeath_id"],
                "horse_id": record["horse_id"],
                "horse_name": horse_info.get("name", "Unknown Horse"),
                "horse_image": horse_info.get("image"),
                "death_date": readable_date,
                "formatted_date": formatted_date,
                "cause_of_death": record["cause_of_death"],
                "death_location": record["death_location"],
                "status": record["status"],
                "created_at": created_at,
                "formatted_created": formatted_created,
                "updated_at": record.get("updated_at"),
                "images": images,  # Array of image URLs
                "image_count": len(images),
                "has_images": len(images) > 0
            })
        
        logger.info(f"Returning {len(formatted_records)} death records for user {user_id}")
        
        return Response({
            "success": True,
            "user_id": user_id,
            "death_records": formatted_records,
            "total_records": len(formatted_records)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching death records: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch death records",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horse_death_record_details(request):
    """
    Get detailed death record information
    """
    death_record_id = request.GET.get("death_record_id")
    user_id = request.GET.get("user_id")
    
    if not death_record_id or not user_id:
        return Response({"error": "death_record_id and user_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get death record
        death_record = service_client.table("horse_death_records").select("*").eq("hdeath_id", death_record_id).eq("op_id", user_id).execute()
        
        if not death_record.data:
            return Response({"error": "Death record not found or access denied"}, status=status.HTTP_404_NOT_FOUND)
        
        record = death_record.data[0]
        
        # Get horse information
        horse_data = service_client.table("horse_profile").select(
            "horse_name, horse_breed, horse_age, horse_sex, horse_color, horse_image, horse_status"
        ).eq("horse_id", record["horse_id"]).execute()
        
        horse_info = {}
        if horse_data.data:
            horse_info = horse_data.data[0]
        
        # Format dates
        death_date = record.get("hdeath_date")
        formatted_date = "Unknown Date"
        if death_date:
            try:
                if isinstance(death_date, str):
                    date_obj = datetime.strptime(str(death_date), '%Y-%m-%d')
                else:
                    date_obj = death_date
                formatted_date = date_obj.strftime('%B %d, %Y')
            except:
                formatted_date = str(death_date)
        
        # Format created_at
        created_at = record.get("created_at")
        formatted_created = created_at
        if created_at:
            try:
                if isinstance(created_at, str):
                    created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    created_dt = created_at
                
                if created_dt.tzinfo is None:
                    created_dt = pytz.UTC.localize(created_dt)
                
                created_dt_ph = created_dt.astimezone(PHILIPPINE_TZ)
                formatted_created = created_dt_ph.strftime('%B %d, %Y %I:%M %p')
            except:
                formatted_created = str(created_at)
        
        # Format updated_at if exists
        updated_at = record.get("updated_at")
        formatted_updated = updated_at
        if updated_at:
            try:
                if isinstance(updated_at, str):
                    updated_dt = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                else:
                    updated_dt = updated_at
                
                if updated_dt.tzinfo is None:
                    updated_dt = pytz.UTC.localize(updated_dt)
                
                updated_dt_ph = updated_dt.astimezone(PHILIPPINE_TZ)
                formatted_updated = updated_dt_ph.strftime('%B %d, %Y %I:%M %p')
            except:
                formatted_updated = str(updated_at)
        
        # Get images array
        images = record.get("images", [])
        if not isinstance(images, list):
            images = []
        
        detailed_record = {
            "success": True,
            "death_record_id": record["hdeath_id"],
            "horse": {
                "horse_id": record["horse_id"],
                "horse_name": horse_info.get("horse_name", "Unknown Horse"),
                "breed": horse_info.get("horse_breed"),
                "age": horse_info.get("horse_age"),
                "sex": horse_info.get("horse_sex"),
                "color": horse_info.get("horse_color"),
                "image": horse_info.get("horse_image"),
                "status": horse_info.get("horse_status")
            },
            "death_details": {
                "date": death_date,
                "formatted_date": formatted_date,
                "cause_of_death": record["cause_of_death"],
                "location": record["death_location"],
                "status": record["status"]
            },
            "images": {
                "urls": images,
                "count": len(images),
                "has_images": len(images) > 0
            },
            "record_info": {
                "created_at": created_at,
                "formatted_created": formatted_created,
                "updated_at": updated_at,
                "formatted_updated": formatted_updated
            }
        }
        
        return Response(detailed_record, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching death record details: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch death record details",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_horse_death_record(request):
    """
    Get death record for a specific horse from horse_death_records table
    FIXED: Properly handles image URLs from JSON array
    """
    horse_id = request.GET.get("horse_id")
    user_id = request.GET.get("user_id")
    
    if not horse_id or not user_id:
        return Response({"error": "horse_id and user_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get death record directly from horse_death_records table
        death_record = service_client.table("horse_death_records").select("*").eq("horse_id", horse_id).eq("op_id", user_id).execute()
        
        if not death_record.data or len(death_record.data) == 0:
            return Response({
                "success": True,
                "horse_id": horse_id,
                "user_id": user_id,
                "death_record": None,
                "message": "No death record found for this horse"
            }, status=status.HTTP_200_OK)
        
        record = death_record.data[0]
        
        # ✅ FIXED: Handle images properly (could be JSON string, list, or null)
        images = []
        images_data = record.get("images")
        
        if images_data:
            try:
                # If it's a JSON string, parse it
                if isinstance(images_data, str):
                    import json
                    images = json.loads(images_data)
                    if not isinstance(images, list):
                        images = [images] if images else []
                # If it's already a list, use it
                elif isinstance(images_data, list):
                    images = images_data
                else:
                    images = []
            except Exception as img_error:
                logger.error(f"Error parsing images data: {img_error}")
                images = []
        
        # Ensure all image URLs are properly formatted
        formatted_images = []
        for img_url in images:
            if img_url:
                # If it's already a full URL, use as-is
                if isinstance(img_url, str) and (img_url.startswith('http://') or img_url.startswith('https://')):
                    formatted_images.append(img_url)
                # If it's a storage path, construct full URL
                elif isinstance(img_url, str) and 'death_records/' in img_url:
                    # Extract filename
                    if '/death_records/' in img_url:
                        filename = img_url.split('/death_records/')[-1]
                        formatted_url = f"{SUPABASE_URL}/storage/v1/object/public/death_records/{filename}"
                        formatted_images.append(formatted_url)
                else:
                    # Try to construct URL from filename
                    formatted_url = f"{SUPABASE_URL}/storage/v1/object/public/death_records/{img_url}"
                    formatted_images.append(formatted_url)
        
        # Format dates
        death_date = record.get("hdeath_date")
        formatted_date = "Unknown Date"
        if death_date:
            try:
                if isinstance(death_date, str):
                    date_obj = datetime.strptime(str(death_date), '%Y-%m-%d')
                else:
                    date_obj = death_date
                formatted_date = date_obj.strftime('%B %d, %Y')
            except:
                formatted_date = str(death_date)
        
        # Format created_at
        created_at = record.get("created_at")
        formatted_created = created_at
        if created_at:
            try:
                if isinstance(created_at, str):
                    created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    created_dt = created_at
                
                if created_dt.tzinfo is None:
                    created_dt = pytz.UTC.localize(created_dt)
                
                created_dt_ph = created_dt.astimezone(PHILIPPINE_TZ)
                formatted_created = created_dt_ph.strftime('%B %d, %Y %I:%M %p')
            except:
                formatted_created = str(created_at)
        
        # Get horse info for additional context
        horse_data = service_client.table("horse_profile").select(
            "horse_name, horse_breed, horse_age, horse_sex, horse_color"
        ).eq("horse_id", horse_id).execute()
        
        horse_info = {}
        if horse_data.data:
            horse_info = horse_data.data[0]
        
        response_data = {
            "success": True,
            "death_record": {
                "hdeath_id": record["hdeath_id"],
                "horse_id": record["horse_id"],
                "op_id": record["op_id"],
                "hdeath_date": death_date,
                "cause_of_death": record["cause_of_death"],
                "death_location": record["death_location"],
                "status": record["status"],
                "created_at": created_at,
                "updated_at": record.get("updated_at"),
                "images": formatted_images,  # ✅ Now properly formatted URLs
                "image_count": len(formatted_images),
                "has_images": len(formatted_images) > 0
            },
            "horse_info": horse_info,
            "formatted_date": formatted_date,
            "formatted_created": formatted_created
        }
        
        logger.info(f"✅ Death record fetched for horse {horse_id}: {len(formatted_images)} images")
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ Error fetching death record: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch death record",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------ KUTSERO APPLICATION API ------------------------------------------------

@api_view(['GET'])
def get_kutsero_applications(request):
    """
    Get all kutsero applications for a horse operator
    Includes kutsero profile information
    """
    op_id = request.GET.get("op_id")
    
    if not op_id:
        return Response({"error": "op_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get applications for this operator with kutsero details
        applications_data = service_client.table("op_kutsero_application").select(
            "application_id, op_id, kutsero_id, application_date, status, review_date, review_notes, created_at, updated_at"
        ).eq("op_id", op_id).order("created_at", desc=True).execute()
        
        if not applications_data.data:
            logger.info(f"No kutsero applications found for operator {op_id}")
            return Response([], status=status.HTTP_200_OK)
        
        # Get all kutsero IDs
        kutsero_ids = list(set([app["kutsero_id"] for app in applications_data.data]))
        
        # Get kutsero profiles
        kutsero_profiles = {}
        if kutsero_ids:
            kutsero_data = service_client.table("kutsero_profile").select(
                "kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_email, kutsero_phone_num, kutsero_image"
            ).in_("kutsero_id", kutsero_ids).execute()
            
            for kutsero in kutsero_data.data if kutsero_data.data else []:
                kutsero_profiles[kutsero["kutsero_id"]] = kutsero
        
        # Format applications with kutsero details
        formatted_applications = []
        for app in applications_data.data:
            kutsero_id = app["kutsero_id"]
            kutsero_info = kutsero_profiles.get(kutsero_id, {})
            
            # Build kutsero name
            fname = kutsero_info.get("kutsero_fname", "")
            lname = kutsero_info.get("kutsero_lname", "")
            kutsero_name = f"{fname} {lname}".strip() or "Unknown Kutsero"
            
            # Format application date
            app_date = app.get("application_date")
            formatted_date = "Unknown Date"
            if app_date:
                try:
                    if isinstance(app_date, str):
                        date_obj = datetime.strptime(str(app_date), '%Y-%m-%d')
                    else:
                        date_obj = app_date
                    formatted_date = date_obj.strftime('%B %d, %Y')
                except:
                    formatted_date = str(app_date)
            
            # Format review date if exists
            review_date = app.get("review_date")
            formatted_review_date = None
            if review_date:
                try:
                    if isinstance(review_date, str):
                        rev_date_obj = datetime.strptime(str(review_date), '%Y-%m-%d')
                    else:
                        rev_date_obj = review_date
                    formatted_review_date = rev_date_obj.strftime('%B %d, %Y')
                except:
                    formatted_review_date = str(review_date)
            
            # Handle kutsero image URL
            kutsero_image = None
            if kutsero_info.get("kutsero_image"):
                img = kutsero_info["kutsero_image"]
                if img.startswith("http://") or img.startswith("https://"):
                    kutsero_image = img
                elif img.startswith("kutsero_images/"):
                    kutsero_image = f"{SUPABASE_URL}/storage/v1/object/public/{img}"
                else:
                    kutsero_image = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_images/{img}"
            
            # Get assigned horses count (if any)
            assigned_horses_count = 0
            try:
                assigned_data = service_client.table("horse_assignment").select(
                    "assign_id"
                ).eq("kutsero_id", kutsero_id).eq("op_id", op_id).execute()
                
                assigned_horses_count = len(assigned_data.data) if assigned_data.data else 0
            except:
                assigned_horses_count = 0
            
            # Get application days ago
            created_at = app.get("created_at")
            days_ago = "Today"
            if created_at:
                try:
                    if isinstance(created_at, str):
                        created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        created_dt = created_at
                    
                    if created_dt.tzinfo is None:
                        created_dt = pytz.UTC.localize(created_dt)
                    
                    now = datetime.now(pytz.UTC)
                    time_diff = now - created_dt
                    days = time_diff.days
                    
                    if days == 0:
                        hours = int(time_diff.seconds / 3600)
                        if hours == 0:
                            minutes = int(time_diff.seconds / 60)
                            days_ago = f"{minutes} minute{'s' if minutes != 1 else ''} ago"
                        else:
                            days_ago = f"{hours} hour{'s' if hours != 1 else ''} ago"
                    elif days == 1:
                        days_ago = "Yesterday"
                    else:
                        days_ago = f"{days} days ago"
                except:
                    days_ago = "Recently"
            
            formatted_applications.append({
                "application_id": app["application_id"],
                "kutsero_id": kutsero_id,
                "kutsero_name": kutsero_name,
                "kutsero_fname": kutsero_info.get("kutsero_fname", ""),
                "kutsero_lname": kutsero_info.get("kutsero_lname", ""),
                "kutsero_email": kutsero_info.get("kutsero_email", ""),
                "kutsero_phone": kutsero_info.get("kutsero_phone_num", ""),
                "kutsero_image": kutsero_image,
                "application_date": app_date,
                "formatted_date": formatted_date,
                "status": app["status"],
                "review_date": review_date,
                "formatted_review_date": formatted_review_date,
                "review_notes": app.get("review_notes"),
                "days_ago": days_ago,
                "assigned_horses_count": assigned_horses_count,
                "created_at": created_at
            })
        
        logger.info(f"Returning {len(formatted_applications)} kutsero applications for operator {op_id}")
        
        return Response(formatted_applications, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching kutsero applications: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch kutsero applications",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def update_kutsero_application(request, application_id):
    """
    Update kutsero application status (approve/reject)
    """
    try:
        op_id = request.data.get("op_id")
        new_status = request.data.get("status")
        review_notes = request.data.get("review_notes", "")
        
        if not op_id:
            return Response({"error": "op_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not new_status:
            return Response({"error": "status is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate status - only 'pending', 'approved', 'rejected' are allowed by constraint
        valid_statuses = ["pending", "approved", "rejected"]
        if new_status not in valid_statuses:
            return Response({
                "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if application exists and belongs to operator
        application_check = service_client.table("op_kutsero_application").select("*").eq(
            "application_id", application_id
        ).eq("op_id", op_id).execute()
        
        if not application_check.data:
            return Response({"error": "Application not found or access denied"}, status=status.HTTP_404_NOT_FOUND)
        
        current_application = application_check.data[0]
        
        # Check if already approved/rejected
        current_status = current_application.get("status")
        if current_status in ["approved", "rejected"]:
            return Response({
                "error": f"Application already {current_status}. Cannot change status."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update the application
        update_data = {
            "status": new_status,
            "review_date": datetime.now().date().isoformat(),
            "updated_at": datetime.now(pytz.UTC).isoformat()
        }
        
        if review_notes:
            update_data["review_notes"] = review_notes.strip()
        
        update_result = service_client.table("op_kutsero_application").update(update_data).eq(
            "application_id", application_id
        ).execute()
        
        if not update_result.data:
            return Response({"error": "Failed to update application"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        updated_application = update_result.data[0]
        
        # Get kutsero info for response
        kutsero_id = current_application["kutsero_id"]
        kutsero_data = service_client.table("kutsero_profile").select(
            "kutsero_fname, kutsero_lname"
        ).eq("kutsero_id", kutsero_id).execute()
        
        kutsero_name = "Unknown Kutsero"
        if kutsero_data.data:
            kutsero = kutsero_data.data[0]
            kutsero_name = f"{kutsero.get('kutsero_fname', '')} {kutsero.get('kutsero_lname', '')}".strip()
        
        # If approved, automatically create horse assignments for all operator's horses
        if new_status == "approved":
            try:
                # Get all horses owned by this operator
                horses_data = service_client.table("horse_profile").select(
                    "horse_id, horse_name"
                ).eq("op_id", op_id).eq("horse_status", "Healthy").execute()
                
                if horses_data.data:
                    for horse in horses_data.data:
                        # Check if assignment already exists
                        existing_assignment = service_client.table("horse_assignment").select("*").eq(
                            "horse_id", horse["horse_id"]
                        ).eq("kutsero_id", kutsero_id).execute()
                        
                        if not existing_assignment.data:
                            # Create new assignment
                            assign_id = str(uuid.uuid4())
                            assignment_payload = {
                                "assign_id": assign_id,
                                "kutsero_id": kutsero_id,
                                "horse_id": horse["horse_id"],
                                "date_start": datetime.now().date().isoformat(),
                                "created_at": datetime.now(pytz.UTC).isoformat(),
                                "updated_at": datetime.now(pytz.UTC).isoformat()
                            }
                            
                            service_client.table("horse_assignment").insert(assignment_payload).execute()
                            logger.info(f"Created assignment for horse {horse['horse_name']} to kutsero {kutsero_name}")
                
                logger.info(f"Created assignments for {len(horses_data.data) if horses_data.data else 0} horses")
            except Exception as assignment_error:
                logger.error(f"Error creating horse assignments: {assignment_error}")
                # Continue even if assignments fail - the application was still updated
        
        logger.info(f"Application {application_id} updated to {new_status} for kutsero {kutsero_name}")
        
        return Response({
            "message": f"Application {new_status} successfully",
            "application_id": application_id,
            "status": new_status,
            "kutsero_name": kutsero_name,
            "review_date": update_data["review_date"],
            "assigned_horses": new_status == "approved"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error updating kutsero application: {e}", exc_info=True)
        return Response({
            "error": "Failed to update application",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_approved_kutseros(request):
    """
    Get all approved kutseros for a horse operator
    """
    op_id = request.GET.get("op_id")
    
    if not op_id:
        return Response({"error": "op_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get approved applications
        applications_data = service_client.table("op_kutsero_application").select(
            "application_id, kutsero_id, application_date, review_date"
        ).eq("op_id", op_id).eq("status", "approved").execute()
        
        if not applications_data.data:
            return Response([], status=status.HTTP_200_OK)
        
        # Get kutsero IDs
        kutsero_ids = [app["kutsero_id"] for app in applications_data.data]
        
        # Get kutsero profiles
        kutsero_profiles = {}
        kutsero_data = service_client.table("kutsero_profile").select(
            "kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_email, kutsero_phone_num, kutsero_image"
        ).in_("kutsero_id", kutsero_ids).execute()
        
        for kutsero in kutsero_data.data if kutsero_data.data else []:
            kutsero_profiles[kutsero["kutsero_id"]] = kutsero
        
        # Get assigned horses count for each kutsero
        assigned_counts = {}
        for kutsero_id in kutsero_ids:
            # Get operator's horses
            operator_horses = service_client.table("horse_profile").select(
                "horse_id"
            ).eq("op_id", op_id).execute()
            
            if operator_horses.data:
                operator_horse_ids = [horse["horse_id"] for horse in operator_horses.data]
                
                # Count assignments for this kutsero
                assignments_count = 0
                for horse_id in operator_horse_ids:
                    assignment_check = service_client.table("horse_assignment").select(
                        "assign_id"
                    ).eq("horse_id", horse_id).eq("kutsero_id", kutsero_id).execute()
                    
                    if assignment_check.data:
                        assignments_count += 1
                
                assigned_counts[kutsero_id] = assignments_count
            else:
                assigned_counts[kutsero_id] = 0
        
        # Format approved kutseros
        approved_kutseros = []
        for app in applications_data.data:
            kutsero_id = app["kutsero_id"]
            kutsero_info = kutsero_profiles.get(kutsero_id, {})
            
            # Build name
            fname = kutsero_info.get("kutsero_fname", "")
            lname = kutsero_info.get("kutsero_lname", "")
            kutsero_name = f"{fname} {lname}".strip()
            
            # Handle image
            kutsero_image = None
            if kutsero_info.get("kutsero_image"):
                img = kutsero_info["kutsero_image"]
                if img.startswith("http://") or img.startswith("https://"):
                    kutsero_image = img
                elif img.startswith("kutsero_images/"):
                    kutsero_image = f"{SUPABASE_URL}/storage/v1/object/public/{img}"
                else:
                    kutsero_image = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_images/{img}"
            
            approved_kutseros.append({
                "kutsero_id": kutsero_id,
                "kutsero_name": kutsero_name,
                "kutsero_email": kutsero_info.get("kutsero_email", ""),
                "kutsero_phone": kutsero_info.get("kutsero_phone_num", ""),
                "kutsero_image": kutsero_image,
                "application_id": app["application_id"],
                "application_date": app["application_date"],
                "approval_date": app["review_date"],
                "assigned_horses_count": assigned_counts.get(kutsero_id, 0)
            })
        
        return Response(approved_kutseros, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching approved kutseros: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def remove_kutsero_assignment(request):
    """
    Remove a kutsero assignment (unassign from all horses AND update application status)
    """
    try:
        op_id = request.data.get("op_id")
        kutsero_id = request.data.get("kutsero_id")
        
        if not op_id or not kutsero_id:
            return Response({"error": "op_id and kutsero_id are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if kutsero is approved for this operator
        application_check = service_client.table("op_kutsero_application").select("*").eq(
            "op_id", op_id
        ).eq("kutsero_id", kutsero_id).eq("status", "approved").execute()
        
        if not application_check.data:
            return Response({
                "error": "Kutsero not approved or not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get kutsero name for logging and response
        kutsero_data = service_client.table("kutsero_profile").select(
            "kutsero_fname, kutsero_lname"
        ).eq("kutsero_id", kutsero_id).execute()
        
        kutsero_name = "Unknown Kutsero"
        if kutsero_data.data:
            kutsero = kutsero_data.data[0]
            kutsero_name = f"{kutsero.get('kutsero_fname', '')} {kutsero.get('kutsero_lname', '')}".strip()
        
        deleted_assignments_count = 0
        
        # STEP 1: Remove all horse assignments for this kutsero and operator
        # Get all horses owned by this operator
        operator_horses = service_client.table("horse_profile").select(
            "horse_id, horse_name"
        ).eq("op_id", op_id).execute()
        
        if operator_horses.data:
            operator_horse_ids = [horse["horse_id"] for horse in operator_horses.data]
            
            # Delete horse assignments for these horses and this kutsero
            for horse_id in operator_horse_ids:
                delete_result = service_client.table("horse_assignment").delete().eq(
                    "horse_id", horse_id
                ).eq("kutsero_id", kutsero_id).execute()
                
                if delete_result.data:
                    deleted_assignments_count += len(delete_result.data)
        
        # STEP 2: Update the application status to 'rejected' 
        # (since 'removed' is not allowed by the database constraint)
        application_id = application_check.data[0].get("application_id")
        
        update_data = {
            "status": "rejected",
            "review_notes": f"Kutsero removed and unassigned from all horses on {datetime.now().date().isoformat()}",
            "updated_at": datetime.now(pytz.UTC).isoformat()
        }
        
        update_result = service_client.table("op_kutsero_application").update(update_data).eq(
            "application_id", application_id
        ).execute()
        
        if not update_result.data:
            logger.error(f"Failed to update application status for {application_id}")
            # Even if status update fails, we still report the assignments removed
        
        logger.info(f"Removed {deleted_assignments_count} horse assignments and updated application status for kutsero {kutsero_name}")
        
        return Response({
            "message": f"Successfully removed {kutsero_name}",
            "details": f"Unassigned from {deleted_assignments_count} horse(s) and application status updated to 'rejected'",
            "kutsero_name": kutsero_name,
            "assignments_removed": deleted_assignments_count,
            "application_updated": True if update_result.data else False,
            "new_status": "rejected"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error removing kutsero assignment: {e}")
        return Response({
            "error": "Failed to remove kutsero assignment",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['GET'])
def get_kutsero_application_stats(request):
    """
    Get statistics for kutsero applications
    """
    op_id = request.GET.get("op_id")
    
    if not op_id:
        return Response({"error": "op_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get all applications
        applications_data = service_client.table("op_kutsero_application").select(
            "status"
        ).eq("op_id", op_id).execute()
        
        if not applications_data.data:
            return Response({
                "total": 0,
                "pending": 0,
                "approved": 0,
                "rejected": 0
            }, status=status.HTTP_200_OK)
        
        # Count by status
        total = len(applications_data.data)
        pending = len([app for app in applications_data.data if app.get("status") == "pending"])
        approved = len([app for app in applications_data.data if app.get("status") == "approved"])
        rejected = len([app for app in applications_data.data if app.get("status") == "rejected"])
        
        return Response({
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching application stats: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['GET'])
def get_kutsero_profile_details(request):
    """
    Get detailed kutsero profile information for display in horse operator's view
    """
    try:
        kutsero_id = request.GET.get("kutsero_id")
        op_id = request.GET.get("op_id")
        
        if not kutsero_id:
            return Response({"error": "kutsero_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get kutsero profile information
        kutsero_data = service_client.table("kutsero_profile").select("*").eq("kutsero_id", kutsero_id).execute()
        
        if not kutsero_data.data:
            return Response({"error": "Kutsero profile not found"}, status=status.HTTP_404_NOT_FOUND)
        
        profile = kutsero_data.data[0]
        
        # Handle image URL
        kutsero_image = None
        if profile.get("kutsero_image"):
            img = profile["kutsero_image"]
            if img.startswith("http://") or img.startswith("https://"):
                kutsero_image = img
            elif img.startswith("kutsero_images/"):
                kutsero_image = f"{SUPABASE_URL}/storage/v1/object/public/{img}"
            else:
                kutsero_image = f"{SUPABASE_URL}/storage/v1/object/public/kutsero_images/{img}"
        
        # Format date of birth
        dob = profile.get("kutsero_dob")
        formatted_dob = None
        if dob:
            try:
                if isinstance(dob, str):
                    dob_obj = datetime.strptime(dob, '%Y-%m-%d')
                    formatted_dob = dob_obj.strftime('%B %d, %Y')
                else:
                    formatted_dob = str(dob)
            except:
                formatted_dob = dob
        
        # Build full address
        address_parts = []
        if profile.get("kutsero_brgy"):
            address_parts.append(f"Brgy. {profile['kutsero_brgy']}")
        if profile.get("kutsero_municipality"):
            address_parts.append(profile["kutsero_municipality"])
        if profile.get("kutsero_city"):
            address_parts.append(profile["kutsero_city"])
        if profile.get("kutsero_province"):
            address_parts.append(profile["kutsero_province"])
        if profile.get("kutsero_zipcode"):
            address_parts.append(f"ZIP: {profile['kutsero_zipcode']}")
        
        full_address = ", ".join(address_parts) if address_parts else "No address provided"
        
        # Calculate age from DOB if available
        age = None
        if dob:
            try:
                if isinstance(dob, str):
                    birth_date = datetime.strptime(dob, '%Y-%m-%d')
                else:
                    birth_date = dob
                
                today = datetime.now()
                age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            except:
                age = None
        
        # Get membership information
        membership_status = profile.get("membership_status", "not_applied")
        years_experience = profile.get("years_experience")
        is_member = profile.get("is_member", False)
        
        # If operator ID is provided, get application status for this specific operator
        application_status = None
        assigned_horses = 0
        if op_id:
            # Get application status
            application_data = service_client.table("op_kutsero_application").select(
                "status, application_date, review_date, review_notes"
            ).eq("op_id", op_id).eq("kutsero_id", kutsero_id).execute()
            
            if application_data.data:
                application = application_data.data[0]
                application_status = {
                    "status": application.get("status"),
                    "application_date": application.get("application_date"),
                    "review_date": application.get("review_date"),
                    "review_notes": application.get("review_notes")
                }
            
            # Get assigned horses count
            try:
                # Get horses owned by this operator
                operator_horses = service_client.table("horse_profile").select(
                    "horse_id"
                ).eq("op_id", op_id).execute()
                
                if operator_horses.data:
                    operator_horse_ids = [horse["horse_id"] for horse in operator_horses.data]
                    
                    # Count assignments for these horses and this kutsero
                    assignments_count = 0
                    for horse_id in operator_horse_ids:
                        assignment_check = service_client.table("horse_assignment").select(
                            "assign_id"
                        ).eq("horse_id", horse_id).eq("kutsero_id", kutsero_id).execute()
                        
                        if assignment_check.data:
                            assignments_count += 1
                    
                    assigned_horses = assignments_count
                else:
                    assigned_horses = 0
            except Exception as e:
                logger.error(f"Error fetching assigned horses count: {e}")
                assigned_horses = 0
        
        # Get complete name
        fname = profile.get("kutsero_fname", "")
        mname = profile.get("kutsero_mname", "")
        lname = profile.get("kutsero_lname", "")
        
        name_parts = []
        if fname:
            name_parts.append(fname)
        if mname:
            name_parts.append(mname)
        if lname:
            name_parts.append(lname)
        
        full_name = " ".join(name_parts)
        
        formatted_profile = {
            "kutsero_id": kutsero_id,
            "full_name": full_name,
            "first_name": fname,
            "middle_name": mname,
            "last_name": lname,
            "email": profile.get("kutsero_email", ""),
            "phone_number": profile.get("kutsero_phone_num", ""),
            "date_of_birth": dob,
            "formatted_dob": formatted_dob,
            "age": age,
            "gender": profile.get("kutsero_sex", ""),
            "address": {
                "barangay": profile.get("kutsero_brgy"),
                "municipality": profile.get("kutsero_municipality"),
                "city": profile.get("kutsero_city"),
                "province": profile.get("kutsero_province"),
                "zipcode": profile.get("kutsero_zipcode"),
                "full_address": full_address
            },
            "profile_image": kutsero_image,
            "username": profile.get("kutsero_username"),
            "membership_info": {
                "is_member": is_member,
                "membership_status": membership_status,
                "years_experience": years_experience,
                "membership_verified": profile.get("membership_verified", False),
                "applying_for_membership": profile.get("applying_for_membership", False),
                "membership_application_date": profile.get("membership_application_date"),
                "membership_verification_date": profile.get("membership_verification_date")
            },
            "application_status": application_status,
            "assigned_horses_count": assigned_horses,
            "created_at": profile.get("created_at")
        }
        
        logger.info(f"Returning detailed profile for kutsero {kutsero_id}")
        
        return Response({
            "success": True,
            "profile": formatted_profile
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching kutsero profile details: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch kutsero profile",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_kutsero_horse_assignments(request):
    """
    Get all horse assignments for a specific kutsero under a horse operator
    """
    op_id = request.GET.get("op_id")
    kutsero_id = request.GET.get("kutsero_id")
    
    if not op_id or not kutsero_id:
        return Response({"error": "op_id and kutsero_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        logger.info(f"Fetching horse assignments for operator {op_id} and kutsero {kutsero_id}")
        
        # Get all horse assignments for this kutsero
        assignments_data = service_client.table("horse_assignment").select(
            "assign_id, horse_id, date_start, date_end, created_at, updated_at"
        ).eq("kutsero_id", kutsero_id).execute()
        
        if not assignments_data.data:
            logger.info(f"No assignments found for kutsero {kutsero_id}")
            return Response([], status=status.HTTP_200_OK)
        
        # Get all horse IDs from assignments
        horse_ids = [assignment["horse_id"] for assignment in assignments_data.data]
        
        # Get horses owned by this operator with their details
        horses_data = service_client.table("horse_profile").select(
            "horse_id, horse_name, horse_age, horse_breed, horse_color, horse_image"
        ).eq("op_id", op_id).in_("horse_id", horse_ids).execute()
        
        # Create a mapping of horse_id to horse details
        horse_map = {}
        if horses_data.data:
            for horse in horses_data.data:
                horse_map[horse["horse_id"]] = {
                    "horse_name": horse.get("horse_name", "Unknown Horse"),
                    "horse_age": horse.get("horse_age", "Unknown"),
                    "horse_breed": horse.get("horse_breed"),
                    "horse_color": horse.get("horse_color"),
                    "horse_image": horse.get("horse_image")
                }
        
        # Format assignments with horse details
        formatted_assignments = []
        for assignment in assignments_data.data:
            horse_id = assignment["horse_id"]
            horse_details = horse_map.get(horse_id, {})
            
            # Determine if assignment is active (no end date or future end date)
            date_end = assignment.get("date_end")
            is_active = True
            
            if date_end:
                try:
                    end_date = datetime.fromisoformat(date_end.replace('Z', '+00:00')) if isinstance(date_end, str) else date_end
                    is_active = end_date > datetime.now(pytz.UTC)
                except:
                    is_active = False
            
            formatted_assignments.append({
                "assign_id": assignment["assign_id"],
                "horse_id": horse_id,
                "horse_name": horse_details.get("horse_name", "Unknown Horse"),
                "horse_age": horse_details.get("horse_age", "Unknown"),
                "horse_breed": horse_details.get("horse_breed"),
                "horse_color": horse_details.get("horse_color"),
                "horse_image": horse_details.get("horse_image"),
                "date_start": assignment["date_start"],
                "date_end": date_end,
                "is_active": is_active,
                "created_at": assignment.get("created_at"),
                "updated_at": assignment.get("updated_at")
            })
        
        logger.info(f"Returning {len(formatted_assignments)} horse assignments for kutsero {kutsero_id}")
        
        return Response(formatted_assignments, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching kutsero horse assignments: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch horse assignments",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
