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
                "horse_status": horse.get("horse_status", "Unknown"),
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


@api_view(['DELETE'])
def delete_horse(request, horse_id):
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        data = service_client.table("horse_profile").delete().eq("horse_id", horse_id).execute()
        if data.data:
            return Response({"message": "Horse deleted successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Horse not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error deleting horse: {e}")
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
    MODIFIED: Validate feeding schedule but DON'T save to database yet
    Only saves when user actually marks as fed
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    schedule = request.data.get("schedule")
    
    if not user_id or not horse_id or not schedule:
        return Response({"error": "user_id, horse_id, and schedule are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Validate schedule format
        for meal in schedule:
            if not all(k in meal for k in ['time', 'food', 'amount']):
                return Response({"error": "Invalid schedule format"}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Validated feeding schedule for user {user_id}, horse {horse_id}")
        logger.info(f"Schedule contains {len(schedule)} meals")
        
        return Response({
            "message": "Feeding schedule validated successfully",
            "note": "No database entries created until meal is marked as fed"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error validating feeding schedule: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mark_meal_fed(request):
    """
    Mark meal as fed AND create database entry - UPDATED WITH MULTI-USER SUPPORT
    Automatically detects if user is operator or kutsero based on user_id
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
        
        fd_id = str(uuid.uuid4())
        
        # Create feed_detail entry with correct user type
        feed_detail_payload = {
            "fd_id": fd_id,
            "op_id": op_id,
            "kutsero_id": kutsero_id,
            "horse_id": horse_id,
            "fd_meal_type": fd_meal_type,
            "fd_food_type": fd_food_type,
            "fd_qty": fd_qty,
            "fd_time": fd_time,
            "completed": True,
            "completed_at": completed_at,
            "user_type": user_type
        }
        
        detail_result = service_client.table("feed_detail").insert(feed_detail_payload).execute()
        
        if not detail_result.data:
            return Response({"error": "Failed to create feed detail record"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Get horse name
        horse_data = supabase.table("horse_profile").select("horse_name").eq("horse_id", horse_id).execute()
        horse_name = "Unknown Horse"
        if horse_data.data:
            horse_name = horse_data.data[0].get("horse_name", "Unknown Horse")

        # ⚠️ FIX: Insert into feed_log with op_id and kutsero_id
        log_payload = {
            "log_id": str(uuid.uuid4()),
            "log_user_full_name": user_full_name,
            "log_date": datetime.now().date().isoformat(),
            "log_meal": fd_meal_type,
            "log_time": fd_time,
            "log_food": fd_food_type,
            "log_amount": fd_qty,
            "log_status": "Fed",
            "log_action": "Completed",
            "user_id": user_id,
            "horse_id": horse_id,
            "op_id": op_id,          # ✅ ADD THIS
            "kutsero_id": kutsero_id, # ✅ ADD THIS
            "created_at": completed_at
        }
        service_client.table("feed_log").insert(log_payload).execute()

        logger.info(f"Meal marked as fed by {user_full_name} ({user_type}): {horse_name} - {fd_meal_type}")

        return Response({
            "message": f"Meal marked as fed for {horse_name}",
            "fd_id": fd_id,
            "feed_detail_created": True,
            "horse_name": horse_name,
            "fed_by": user_full_name,
            "user_type": user_type
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error marking meal as fed: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_feeding_schedule(request):
    """
    Get feeding schedule - UPDATED TO CHECK FOR MULTI-USER COMPLETION
    Returns which meals are already fed by anyone today
    """
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")
    
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get today's date
        today = datetime.now().date().isoformat()
        
        # Get all feed_detail records for this horse completed today (by anyone)
        data = supabase.table("feed_detail").select(
            "fd_id, fd_meal_type, fd_food_type, fd_qty, fd_time, completed, completed_at, op_id, kutsero_id, user_type"
        ).eq("horse_id", horse_id).eq("completed", True).gte("completed_at", today).execute()
        
        # Format response with who fed it
        formatted_data = []
        for record in data.data if data.data else []:
            # Determine who fed it
            fed_by_id = record.get("op_id") or record.get("kutsero_id")
            fed_by_name = "Unknown User"
            user_type = record.get("user_type", "unknown")
            
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
                "completed": True,
                "completed_at": record["completed_at"],
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
    Fetch all APPROVED veterinarians WITHOUT PRESENCE
    Includes both regular veterinarians and CTU veterinarians
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        all_vets = []
        
        # ========== 1. Get Regular Approved Veterinarians ==========
        approved_users = service_client.table("users").select("id").eq("role", "Veterinarian").eq("status", "approved").execute()
        
        if approved_users.data and len(approved_users.data) > 0:
            approved_vet_ids = [user["id"] for user in approved_users.data]
            logger.info(f"Found {len(approved_vet_ids)} approved veterinarian IDs from users table")
            
            # Query vet_profile for approved vets only
            data = supabase.table("vet_profile").select(
                "vet_id, vet_fname, vet_lname, vet_email, vet_phone_num, vet_specialization, vet_profile_photo"
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
                    elif vet_photo:
                        avatar_url = f"{SUPABASE_URL}/storage/v1/object/public/vet_images/{vet_photo}"
                
                vet_data = {
                    "id": vet_id,
                    "first_name": vet.get("vet_fname", "Unknown"),
                    "last_name": vet.get("vet_lname", "Veterinarian"),
                    "email": vet.get("vet_email", ""),
                    "phone": vet.get("vet_phone_num"),
                    "specialization": vet.get("vet_specialization"),
                    "avatar": avatar_url,
                    "vet_type": "regular"  # Tag for frontend
                }
                
                all_vets.append(vet_data)
        
        # ========== 2. Get ALL CTU Veterinarians ==========
        # CTU vets don't need approval status - they're pre-approved by being in ctu_vet_profile
        ctu_vets_data = service_client.table("ctu_vet_profile").select(
            "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_phonenum, ctu_role"
        ).execute()
        
        logger.info(f"Fetched {len(ctu_vets_data.data) if ctu_vets_data.data else 0} CTU veterinarians")
        
        # Transform CTU veterinarians
        for ctu_vet in ctu_vets_data.data if ctu_vets_data.data else []:
            ctu_vet_data = {
                "id": ctu_vet["ctu_id"],
                "first_name": ctu_vet.get("ctu_fname", "Unknown"),
                "last_name": ctu_vet.get("ctu_lname", "Veterinarian"),
                "email": ctu_vet.get("ctu_email", ""),
                "phone": ctu_vet.get("ctu_phonenum"),
                "specialization": "",  # Default specialization
                "avatar": None,  # CTU vets might not have profile photos
                "vet_type": "ctu"  # Tag for frontend
            }
            
            all_vets.append(ctu_vet_data)
        
        # Sort all vets alphabetically by last name, then first name
        all_vets.sort(key=lambda x: (x.get("last_name", ""), x.get("first_name", "")))
        
        logger.info(f"Returning {len(all_vets)} total veterinarians (regular + CTU)")
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

@api_view(['GET'])
def get_vet_schedule(request):
    """
    Get veterinarian schedule by vet_id - UPDATED WITH TIME FORMATTING AND PAST FILTERING
    Returns available time slots with properly formatted times and filters out past schedules
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
        
        # Query the vet_schedule table
        data = supabase.table("vet_schedule").select(
            "sched_id, vet_id, sched_date, start_time, end_time, is_available, created_at"
        ).eq("vet_id", vet_id).eq("is_available", True).gte("sched_date", today).order("sched_date", desc=False).order("start_time", desc=False).execute()
        
        logger.info(f"Raw schedule slots retrieved: {len(data.data)} records")
        
        if not data.data:
            logger.warning(f"No schedule slots found for vet_id: {vet_id}")
            return Response([], status=status.HTTP_200_OK)
        
        # Transform and filter data
        formatted_schedule = []
        filtered_count = 0
        
        for schedule_item in data.data:
            try:
                sched_date = schedule_item.get("sched_date")
                start_time = schedule_item.get("start_time")
                end_time = schedule_item.get("end_time")
                
                # Skip if essential fields are missing
                if not sched_date or not start_time:
                    logger.warning(f"Skipping schedule item with missing date/time: {schedule_item}")
                    continue
                
                # Filter out past schedules
                if is_schedule_in_past(sched_date, start_time):
                    filtered_count += 1
                    logger.debug(f"Filtered out past schedule: {sched_date} {start_time}")
                    continue
                
                # Format times for display
                start_time_formatted = format_time_to_12_hour(start_time)
                end_time_formatted = format_time_to_12_hour(end_time) if end_time else ""
                time_display = format_time_range(start_time, end_time) if end_time else start_time_formatted
                
                # Create formatted schedule item
                formatted_item = {
                    "sched_id": str(schedule_item.get("sched_id", "")),
                    "vet_id": str(schedule_item.get("vet_id", "")),
                    "sched_date": str(sched_date),
                    "start_time": str(start_time),  # Keep original for backend processing
                    "end_time": str(end_time) if end_time else "",  # Keep original for backend processing
                    "start_time_formatted": start_time_formatted,  # For display
                    "end_time_formatted": end_time_formatted,      # For display
                    "sched_time": time_display,                    # For backward compatibility
                    "time_display": time_display,                  # Clear field name for display
                    "is_available": bool(schedule_item.get("is_available", True))
                }
                
                # Validate essential fields before adding
                if formatted_item["sched_id"] and formatted_item["sched_date"]:
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
    Updated with time formatting and past schedule checking
    """
    sched_id = request.GET.get("sched_id")
    vet_id = request.GET.get("vet_id")
    
    if not sched_id or not vet_id:
        return Response({"error": "sched_id and vet_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        data = supabase.table("vet_schedule").select(
            "sched_id, is_available, sched_date, start_time, end_time"
        ).eq("sched_id", sched_id).eq("vet_id", vet_id).execute()
        
        if not data.data or len(data.data) == 0:
            return Response({"available": False, "reason": "Schedule slot not found"}, status=status.HTTP_404_NOT_FOUND)
        
        schedule_slot = data.data[0]
        is_available = schedule_slot.get("is_available", False)
        sched_date = schedule_slot.get("sched_date")
        start_time = schedule_slot.get("start_time")
        end_time = schedule_slot.get("end_time")
        
        # Check if schedule is in the past
        is_past = is_schedule_in_past(sched_date, start_time)
        
        # Schedule is only truly available if it's marked available AND not in the past
        truly_available = is_available and not is_past
        
        # Format time display
        time_display = format_time_range(start_time, end_time) if end_time else format_time_to_12_hour(start_time)
        
        reason = "Available"
        if not is_available:
            reason = "Already booked"
        elif is_past:
            reason = "Time has passed"
        
        return Response({
            "available": truly_available,
            "sched_id": sched_id,
            "sched_date": sched_date,
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
    Utility endpoint to clean up past schedule slots
    This can be called periodically or manually to remove outdated schedules
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get all schedules
        all_schedules = service_client.table("vet_schedule").select("*").execute()
        
        past_schedules = []
        for schedule in all_schedules.data:
            sched_date = schedule.get("sched_date")
            start_time = schedule.get("start_time")
            
            if is_schedule_in_past(sched_date, start_time):
                past_schedules.append(schedule["sched_id"])
        
        if past_schedules:
            # Mark past schedules as unavailable
            for sched_id in past_schedules:
                service_client.table("vet_schedule").update({
                    "is_available": False
                }).eq("sched_id", sched_id).execute()
            
            logger.info(f"Marked {len(past_schedules)} past schedules as unavailable")
            
            return Response({
                "message": f"Cleaned up {len(past_schedules)} past schedule slots",
                "cleaned_schedules": len(past_schedules)
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "message": "No past schedules found to clean up",
                "cleaned_schedules": 0
            }, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error cleaning up past schedules: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# ================================================ ENHANCED MESSAGING API WITH SOFT DELETE ================================================

@api_view(['GET'])
def get_conversations(request):
    """
    Get all conversations for a user (latest message per partner).
    """
    try:
        user_id = request.GET.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Fetch all messages where user is sender or receiver
        messages_response = service_client.table("message").select(
            "mes_id, user_id, receiver_id, mes_content, mes_date, is_read"
        ).or_(f"user_id.eq.{user_id},receiver_id.eq.{user_id}").order(
            "mes_date", desc=True
        ).execute()

        messages = messages_response.data or []

        # Build conversation per partner
        conversations_dict = {}
        for msg in messages:
            partner_id = msg['receiver_id'] if msg['user_id'] == user_id else msg['user_id']
            if partner_id not in conversations_dict:
                conversations_dict[partner_id] = {
                    'partner_id': partner_id,
                    'last_message': msg.get('mes_content'),
                    'last_message_time': msg.get('mes_date'),
                    'is_read': msg.get('is_read', False)
                }

        # Convert to list and sort by last_message_time
        conversations_list = sorted(
            conversations_dict.values(),
            key=lambda x: x['last_message_time'],
            reverse=True
        )

        return Response({
            'conversations': conversations_list,
            'total_count': len(conversations_list)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error fetching conversations: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_messages(request):
    """
    Get all messages between two users.
    """
    try:
        user_id = request.GET.get("user_id")
        other_user_id = request.GET.get("other_user_id")
        if not user_id or not other_user_id:
            return Response({"error": "user_id and other_user_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        # Fetch messages between two users
        messages_response = service_client.table("message").select(
            "mes_id, user_id, receiver_id, mes_content, mes_date, is_read"
        ).or_(
            f"and(user_id.eq.{user_id},receiver_id.eq.{other_user_id}),"
            f"and(user_id.eq.{other_user_id},receiver_id.eq.{user_id})"
        ).order("mes_date", desc=False).execute()

        messages = []
        for msg in messages_response.data or []:
            messages.append({
                'id': str(msg['mes_id']),
                'text': msg['mes_content'],
                'isUser': str(msg['user_id']) == str(user_id),
                'timestamp': format_message_time(msg['mes_date']),
                'created_at': msg['mes_date']
            })

        # Mark unread messages as read
        service_client.table("message").update({"is_read": True}).eq("user_id", other_user_id).eq("receiver_id", user_id).eq("is_read", False).execute()

        return Response({
            'success': True,
            'messages': messages
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error fetching messages: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        created_at = datetime.fromisoformat(msg['mes_date'].replace('Z', '+00:00'))

        return Response({
            'success': True,
            'message': {
                'id': str(msg['mes_id']),
                'text': msg['mes_content'],
                'isUser': True,
                'timestamp': created_at.strftime('%I:%M %p'),
                'created_at': msg['mes_date']
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        print(f"Error sending message: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
     
@api_view(['GET'])
def available_users(request):
    """
    Get all users that can be messaged (vets, kutseros, horse operators,
    CTU vets, DVMF users)
    """
    try:
        user_id = request.GET.get("user_id")
        search_query = request.GET.get("search", "").lower()
        role_filter = request.GET.get("role")  # Optional role filter
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        users = []

        # Kutséros
        if role_filter in [None, "kutsero"]:
            kutsero_profiles = service_client.table("kutsero_profile").select(
                "kutsero_id, kutsero_fname, kutsero_lname, kutsero_username, kutsero_phone_num, kutsero_email"
            ).neq("kutsero_id", user_id).execute()
            
            for p in kutsero_profiles.data or []:
                display_name = p.get('kutsero_fname') or p.get('kutsero_username') or 'Unknown'
                if p.get('kutsero_lname'):
                    display_name += f" {p['kutsero_lname']}"
                if search_query and search_query not in display_name.lower() and search_query not in (p.get('kutsero_email') or '').lower():
                    continue
                users.append({
                    'id': p['kutsero_id'],
                    'name': display_name,
                    'role': 'kutsero',
                    'avatar': '🐴',
                    'email': p.get('kutsero_email'),
                    'phone': p.get('kutsero_phone_num'),
                    'status': 'active'
                })

        # Vets
        if role_filter in [None, "vet"]:
            vet_profiles = service_client.table("vet_profile").select(
                "vet_id, vet_fname, vet_lname, vet_phone_num, vet_email"
            ).neq("vet_id", user_id).execute()
            
            for p in vet_profiles.data or []:
                display_name = f" {p.get('vet_fname', '')}"
                if p.get('vet_lname'):
                    display_name += f" {p['vet_lname']}"
                if search_query and search_query not in display_name.lower() and search_query not in (p.get('vet_email') or '').lower():
                    continue
                users.append({
                    'id': p['vet_id'],
                    'name': display_name,
                    'role': 'vet',
                    'avatar': '👩‍⚕️',
                    'email': p.get('vet_email'),
                    'phone': p.get('vet_phone_num'),
                    'status': 'active'
                })

        # Horse Operators
        if role_filter in [None, "horse_operator"]:
            op_profiles = service_client.table("horse_op_profile").select(
                "op_id, op_fname, op_lname, op_phone_num, op_email"
            ).neq("op_id", user_id).execute()
            
            for p in op_profiles.data or []:
                display_name = p.get('op_fname', 'Unknown')
                if p.get('op_lname'):
                    display_name += f" {p['op_lname']}"
                if search_query and search_query not in display_name.lower() and search_query not in (p.get('op_email') or '').lower():
                    continue
                users.append({
                    'id': p['op_id'],
                    'name': display_name,
                    'role': 'horse_operator',
                    'avatar': '👨‍💼',
                    'email': p.get('op_email'),
                    'phone': p.get('op_phone_num'),
                    'status': 'active'
                })

        # CTU Vets
        if role_filter in [None, "ctu_vet"]:
            ctu_profiles = service_client.table("ctu_vet_profile").select(
                "ctu_id, ctu_fname, ctu_lname, ctu_email, ctu_phonenum"
            ).neq("ctu_id", user_id).execute()
            
            for p in ctu_profiles.data or []:
                display_name = f" {p.get('ctu_fname', '')}"
                if p.get('ctu_lname'):
                    display_name += f" {p['ctu_lname']}"
                if search_query and search_query not in display_name.lower() and search_query not in (p.get('ctu_email') or '').lower():
                    continue
                users.append({
                    'id': p['ctu_id'],
                    'name': display_name,
                    'role': 'ctu_vet',
                    'avatar': '🧑‍⚕️',
                    'email': p.get('ctu_email'),
                    'phone': p.get('ctu_phonenum'),
                    'status': 'active'
                })

        # DVMF Users
        if role_filter in [None, "dvmf_user"]:
            dvmf_profiles = service_client.table("dvmf_user_profile").select(
                "dvmf_id, dvmf_fname, dvmf_lname, dvmf_email, dvmf_phonenum"
            ).neq("dvmf_id", user_id).execute()
            
            for p in dvmf_profiles.data or []:
                display_name = p.get('dvmf_fname', 'Unknown')
                if p.get('dvmf_lname'):
                    display_name += f" {p['dvmf_lname']}"
                if search_query and search_query not in display_name.lower() and search_query not in (p.get('dvmf_email') or '').lower():
                    continue
                users.append({
                    'id': p['dvmf_id'],
                    'name': display_name,
                    'role': 'dvmf_user',
                    'avatar': '🧑‍💼',
                    'email': p.get('dvmf_email'),
                    'phone': p.get('dvmf_phonenum'),
                    'status': 'active'
                })

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
                conversations_dict[other_user_id] = {
                    'other_user_id': other_user_id,
                    'last_message': msg.get('mes_content'),
                    'last_message_time': msg.get('mes_date'),
                    'is_read': msg.get('is_read', False)
                }

        print(f"Grouped into {len(conversations_dict)} conversations")
        print(f"Other user IDs: {list(conversations_dict.keys())}")

        # Fetch partner information for each conversation
        conversations_list = []
        for other_user_id, conv_data in conversations_dict.items():
            print(f"\n{'='*60}")
            print(f"Looking up user: {other_user_id}")
            print(f"User ID type: {type(other_user_id)}")
            print(f"User ID length: {len(other_user_id)}")
            user_info = None
            
            # Check kutsero_profile table
            try:
                print(f"\nQuerying kutsero_profile WHERE kutsero_id = '{other_user_id}'")
                
                kutsero_response = service_client.table("kutsero_profile").select("*").eq("kutsero_id", other_user_id).execute()
                
                print(f"Response data: {kutsero_response.data}")
                print(f"Number of results: {len(kutsero_response.data) if kutsero_response.data else 0}")
                
                if kutsero_response.data and len(kutsero_response.data) > 0:
                    user = kutsero_response.data[0]
                    print(f"Found user data: {user}")
                    
                    fname = str(user.get('kutsero_fname', '')).strip()
                    lname = str(user.get('kutsero_lname', '')).strip()
                    username = str(user.get('kutsero_username', '')).strip()
                    
                    print(f"fname: '{fname}', lname: '{lname}', username: '{username}'")
                    
                    # Build name with fallbacks
                    if fname and lname:
                        name = f"{fname} {lname}"
                    elif fname:
                        name = fname
                    elif lname:
                        name = lname
                    elif username:
                        name = username
                    else:
                        name = 'Kutsero User'
                    
                    user_info = {
                        'name': name,
                        'email': user.get('kutsero_email', ''),
                        'role': 'kutsero',
                        'avatar': '🐴',
                        'status': user.get('kutsero_status', 'pending')
                    }
                    print(f"✓ SUCCESS - Found in kutsero_profile: {name}")
                else:
                    print(f"✗ No results from kutsero_profile")
            except Exception as e:
                print(f"✗ ERROR checking kutsero_profile: {e}")
                import traceback
                traceback.print_exc()
            
            # Check vet_profile table
            if not user_info:
                try:
                    print(f"\nQuerying vet_profile WHERE vet_id = '{other_user_id}'")
                    vet_response = service_client.table("vet_profile").select("*").eq("vet_id", other_user_id).execute()
                    print(f"Number of results: {len(vet_response.data) if vet_response.data else 0}")
                    
                    if vet_response.data and len(vet_response.data) > 0:
                        user = vet_response.data[0]
                        
                        fname = str(user.get('vet_fname', '')).strip()
                        lname = str(user.get('vet_lname', '')).strip()
                        username = str(user.get('vet_username', '')).strip()
                        
                        if fname and lname:
                            name = f"{fname} {lname}"
                        elif fname:
                            name = fname
                        elif lname:
                            name = lname
                        elif username:
                            name = username
                        else:
                            name = 'Vet User'
                        
                        user_info = {
                            'name': name,
                            'email': user.get('vet_email', ''),
                            'role': 'vet',
                            'avatar': '👩‍⚕️',
                            'status': user.get('vet_status', 'pending')
                        }
                        print(f"✓ SUCCESS - Found in vet_profile: {name}")
                except Exception as e:
                    print(f"✗ ERROR checking vet_profile: {e}")
                    import traceback
                    traceback.print_exc()
            
            # Check horse_op_profile table
            if not user_info:
                try:
                    print(f"\nQuerying horse_op_profile WHERE operator_id = '{other_user_id}'")
                    operator_response = service_client.table("horse_op_profile").select("*").eq("operator_id", other_user_id).execute()
                    print(f"Number of results: {len(operator_response.data) if operator_response.data else 0}")
                    
                    if operator_response.data and len(operator_response.data) > 0:
                        user = operator_response.data[0]
                        
                        fname = str(user.get('operator_fname', '')).strip()
                        lname = str(user.get('operator_lname', '')).strip()
                        username = str(user.get('operator_username', '')).strip()
                        
                        if fname and lname:
                            name = f"{fname} {lname}"
                        elif fname:
                            name = fname
                        elif lname:
                            name = lname
                        elif username:
                            name = username
                        else:
                            name = 'Operator User'
                        
                        user_info = {
                            'name': name,
                            'email': user.get('operator_email', ''),
                            'role': 'horse_operator',
                            'avatar': '👨‍💼',
                            'status': user.get('operator_status', 'pending')
                        }
                        print(f"✓ SUCCESS - Found in horse_op_profile: {name}")
                except Exception as e:
                    print(f"✗ ERROR checking horse_op_profile: {e}")
                    import traceback
                    traceback.print_exc()
            
            # If user not found in any table
            if not user_info:
                print(f"\n⚠ WARNING: User {other_user_id} NOT FOUND in any profile table!")
                user_info = {
                    'name': 'Unknown User',
                    'email': '',
                    'role': 'unknown',
                    'avatar': '👤',
                    'status': 'unknown'
                }
            
            # Combine conversation data with user info
            conversations_list.append({
                'id': f"{user_id}_{other_user_id}",
                'partner_id': other_user_id,
                'sender': user_info['name'],
                'partner_name': user_info['name'],
                'email': user_info['email'],
                'role': user_info['role'],
                'avatar': user_info['avatar'],
                'status': user_info['status'],
                'last_message': conv_data['last_message'],
                'preview': conv_data['last_message'],
                'last_message_time': conv_data['last_message_time'],
                'timestamp': conv_data['last_message_time'],
                'is_read': conv_data['is_read'],
                'unread': not conv_data['is_read'],
                'unread_count': 0 if conv_data['is_read'] else 1
            })

        # Sort by last message time
        conversations_list = sorted(
            conversations_list,
            key=lambda x: x['last_message_time'] if x['last_message_time'] else '',
            reverse=True
        )

        print(f"\n{'='*60}")
        print(f"Returning {len(conversations_list)} conversations")
        print(f"Conversations: {[c['sender'] for c in conversations_list]}")
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









# ------------------------------------------------ APPOINTMENT API ------------------------------------------------

@api_view(['POST'])
def book_appointment(request):
    """
    Book an appointment with a veterinarian - UPDATED WITH REQUIRED NOTES VALIDATION
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
        sched_id = request.data.get("sched_id")
        
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
        if not sched_id:
            missing_fields.append("sched_id")
            
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
            
            schedule_check = service_client.table("vet_schedule").select(
                "sched_id, vet_id, sched_date, start_time, end_time, is_available"
            ).eq("sched_id", sched_id).eq("vet_id", vet_id).execute()
            
            if not schedule_check.data or len(schedule_check.data) == 0:
                error_msg = f"Schedule slot not found: {sched_id}"
                logger.error(error_msg)
                return Response({"error": "Selected time slot is no longer available"}, status=status.HTTP_400_BAD_REQUEST)
            
            schedule_slot = schedule_check.data[0]
            
            # Check if the slot is still marked as available
            if not schedule_slot.get("is_available", False):
                logger.error(f"Schedule slot {sched_id} is no longer available")
                return Response({"error": "This time slot has been booked by another user. Please select a different time."}, status=status.HTTP_400_BAD_REQUEST)
            
            # NEW: Check if the schedule is in the past
            sched_date = schedule_slot.get("sched_date")
            start_time = schedule_slot.get("start_time")
            
            if is_schedule_in_past(sched_date, start_time):
                logger.error(f"Schedule slot {sched_id} is in the past: {sched_date} {start_time}")
                return Response({"error": "The selected time slot has already passed. Please select a current or future time slot."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate date matching
            if sched_date != appointment_date:
                logger.error(f"Schedule date mismatch - Expected: {appointment_date}, Got: {sched_date}")
                return Response({"error": "Schedule data mismatch. Please refresh and try again."}, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Valid schedule slot found: {schedule_slot}")
            
        except Exception as schedule_error:
            logger.error(f"Error validating schedule: {schedule_error}")
            return Response({"error": "Error validating schedule availability"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # VALIDATION: Check if vet_id exists in vet_profile table
        try:
            vet_check = supabase.table("vet_profile").select("vet_id, vet_fname, vet_lname").eq("vet_id", vet_id).execute()
            if not vet_check.data or len(vet_check.data) == 0:
                error_msg = f"Invalid vet_id: {vet_id}. Veterinarian not found in database."
                logger.error(error_msg)
                return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
            
            vet_info = vet_check.data[0]
            logger.info(f"Valid veterinarian found:  {vet_info['vet_fname']} {vet_info['vet_lname']} (ID: {vet_id})")
            
        except Exception as vet_check_error:
            logger.error(f"Error validating vet_id: {vet_check_error}")
            return Response({"error": "Error validating veterinarian"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # VALIDATION: Check if horse_id exists and belongs to the user
        try:
            horse_check = supabase.table("horse_profile").select("horse_id, horse_name, op_id").eq("horse_id", horse_id).eq("op_id", user_id).execute()
            if not horse_check.data or len(horse_check.data) == 0:
                error_msg = f"Invalid horse_id: {horse_id}. Horse not found or doesn't belong to user."
                logger.error(error_msg)
                return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
            
            horse_info = horse_check.data[0]
            logger.info(f"Valid horse found: {horse_info['horse_name']} (ID: {horse_id})")
            
        except Exception as horse_check_error:
            logger.error(f"Error validating horse_id: {horse_check_error}")
            return Response({"error": "Error validating horse"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Generate UUID for appointment
        app_id = str(uuid.uuid4())
        current_timestamp = datetime.now(pytz.UTC).isoformat()
        
        logger.info(f"Generated appointment ID: {app_id}")

        # ====================== ATOMIC TRANSACTION ======================
        try:
            service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            # Get the actual start and end times from schedule for storage
            schedule_check = service_client.table("vet_schedule").select("*").eq("sched_id", sched_id).execute()
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
                "app_complain": notes.strip(),  # Store the trimmed notes
                "user_id": user_id,
                "horse_id": horse_id,
                "vet_id": vet_id,
                "sched_id": sched_id,
                "app_status": "pending",
                "created_at": current_timestamp,
                "updated_at": current_timestamp
            }
            
            logger.info(f"Inserting appointment with payload (notes length: {len(notes.strip())}): {appointment_payload}")
            appointment_result = service_client.table("appointment").insert(appointment_payload).execute()
            
            if not appointment_result.data or len(appointment_result.data) == 0:
                raise Exception("Failed to create appointment record")
            
            logger.info(f"Appointment created successfully: {appointment_result.data[0]}")
            
            # 2. UPDATE SCHEDULE AVAILABILITY
            logger.info(f"Marking schedule {sched_id} as unavailable")
            schedule_update = service_client.table("vet_schedule").update({
                "is_available": False
            }).eq("sched_id", sched_id).eq("vet_id", vet_id).execute()
            
            if not schedule_update.data or len(schedule_update.data) == 0:
                # Rollback: Delete the appointment we just created
                service_client.table("appointment").delete().eq("app_id", app_id).execute()
                return Response({"error": "Failed to reserve time slot. Please try again."}, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Schedule {sched_id} marked as unavailable successfully")
            
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
    Cancel an appointment and release the schedule slot
    """
    try:
        logger.info(f"Attempting to cancel appointment: {app_id}")
        
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
            # 1. UPDATE APPOINTMENT STATUS
            update_result = service_client.table("appointment").update({
                "app_status": "cancelled"
            }).eq("app_id", app_id).execute()
            
            if not update_result.data or len(update_result.data) == 0:
                raise Exception("Failed to update appointment status")
            
            logger.info(f"Appointment status updated to cancelled: {app_id}")
            
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
                "message": "Appointment cancelled successfully",
                "app_id": app_id,
                "schedule_released": bool(sched_id)
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
def decline_appointment(request):
    """
    Decline an appointment (for veterinarians) and release the schedule slot
    """
    try:
        app_id = request.data.get("app_id")
        decline_reason = request.data.get("decline_reason", "")
        vet_id = request.data.get("vet_id")  # For verification
        
        if not app_id:
            return Response({"error": "app_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Attempting to decline appointment: {app_id}")
        
        # Check if appointment exists and verify vet_id if provided
        appointment_check = supabase.table("appointment").select("*").eq("app_id", app_id)
        if vet_id:
            appointment_check = appointment_check.eq("vet_id", vet_id)
        
        appointment_data = appointment_check.execute()
        
        if not appointment_data.data or len(appointment_data.data) == 0:
            return Response({"error": "Appointment not found or unauthorized"}, status=status.HTTP_404_NOT_FOUND)
        
        appointment = appointment_data.data[0]
        logger.info(f"Found appointment to decline: {appointment}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # ====================== ATOMIC TRANSACTION ======================
        try:
            # 1. UPDATE APPOINTMENT STATUS TO DECLINED
            update_result = service_client.table("appointment").update({
                "app_status": "declined",
                "decline_reason": decline_reason,
                "updated_at": datetime.now().isoformat()
            }).eq("app_id", app_id).execute()
            
            if not update_result.data or len(update_result.data) == 0:
                raise Exception("Failed to update appointment status")
            
            logger.info(f"Appointment status updated to declined: {app_id}")
            
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
                "message": "Appointment declined successfully",
                "app_id": app_id,
                "decline_reason": decline_reason,
                "schedule_released": bool(sched_id)
            }, status=status.HTTP_200_OK)
            
        except Exception as transaction_error:
            logger.error(f"Transaction error in appointment decline: {transaction_error}")
            return Response({"error": f"Decline failed: {str(transaction_error)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Error declining appointment {app_id}: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['POST'])
def approve_appointment(request):
    """
    Approve an appointment (for veterinarians) - keeps schedule slot reserved
    """
    try:
        app_id = request.data.get("app_id")
        vet_id = request.data.get("vet_id")  # For verification
        approval_notes = request.data.get("approval_notes", "")
        
        if not app_id:
            return Response({"error": "app_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Attempting to approve appointment: {app_id}")
        
        # Check if appointment exists and verify vet_id if provided
        appointment_check = supabase.table("appointment").select("*").eq("app_id", app_id)
        if vet_id:
            appointment_check = appointment_check.eq("vet_id", vet_id)
        
        appointment_data = appointment_check.execute()
        
        if not appointment_data.data or len(appointment_data.data) == 0:
            return Response({"error": "Appointment not found or unauthorized"}, status=status.HTTP_404_NOT_FOUND)
        
        appointment = appointment_data.data[0]
        logger.info(f"Found appointment to approve: {appointment}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Update appointment status to approved
        update_result = service_client.table("appointment").update({
            "app_status": "approved",
            "approval_notes": approval_notes,
            "updated_at": datetime.now().isoformat()
        }).eq("app_id", app_id).execute()
        
        if not update_result.data or len(update_result.data) == 0:
            return Response({"error": "Failed to approve appointment"}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Appointment approved successfully: {app_id}")
        
        return Response({
            "message": "Appointment approved successfully",
            "app_id": app_id,
            "approval_notes": approval_notes
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error approving appointment {app_id}: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def complete_appointment(request):
    """
    Mark an appointment as completed - keeps schedule slot reserved
    """
    try:
        app_id = request.data.get("app_id")
        vet_id = request.data.get("vet_id")  # For verification
        completion_notes = request.data.get("completion_notes", "")
        
        if not app_id:
            return Response({"error": "app_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Attempting to complete appointment: {app_id}")
        
        # Check if appointment exists and verify vet_id if provided
        appointment_check = supabase.table("appointment").select("*").eq("app_id", app_id)
        if vet_id:
            appointment_check = appointment_check.eq("vet_id", vet_id)
        
        appointment_data = appointment_check.execute()
        
        if not appointment_data.data or len(appointment_data.data) == 0:
            return Response({"error": "Appointment not found or unauthorized"}, status=status.HTTP_404_NOT_FOUND)
        
        appointment = appointment_data.data[0]
        logger.info(f"Found appointment to complete: {appointment}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Update appointment status to completed
        update_result = service_client.table("appointment").update({
            "app_status": "completed",
            "completion_notes": completion_notes,
            "completed_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }).eq("app_id", app_id).execute()
        
        if not update_result.data or len(update_result.data) == 0:
            return Response({"error": "Failed to complete appointment"}, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Appointment completed successfully: {app_id}")
        
        return Response({
            "message": "Appointment completed successfully",
            "app_id": app_id,
            "completion_notes": completion_notes
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error completing appointment {app_id}: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def bulk_release_schedules(request):
    """
    Utility endpoint to bulk release schedule slots from cancelled/declined appointments
    This can be run periodically to clean up any missed releases
    """
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Get all cancelled or declined appointments with schedule IDs
        cancelled_appointments = service_client.table("appointment").select(
            "app_id, sched_id, app_status, app_date"
        ).in_("app_status", ["cancelled", "declined"]).execute()
        
        if not cancelled_appointments.data:
            return Response({
                "message": "No cancelled/declined appointments found",
                "released_schedules": 0
            }, status=status.HTTP_200_OK)
        
        released_count = 0
        processed_schedules = set()  # Avoid duplicate processing
        
        for appointment in cancelled_appointments.data:
            sched_id = appointment.get("sched_id")
            if not sched_id or sched_id in processed_schedules:
                continue
            
            processed_schedules.add(sched_id)
            
            # Check if schedule exists and get its details
            schedule_check = service_client.table("vet_schedule").select(
                "sched_id, sched_date, start_time, is_available"
            ).eq("sched_id", sched_id).execute()
            
            if schedule_check.data and len(schedule_check.data) > 0:
                schedule_slot = schedule_check.data[0]
                
                # Only release if currently unavailable and not in the past
                if (not schedule_slot.get("is_available", True) and 
                    not is_schedule_in_past(schedule_slot.get("sched_date"), schedule_slot.get("start_time"))):
                    
                    release_result = service_client.table("vet_schedule").update({
                        "is_available": True
                    }).eq("sched_id", sched_id).execute()
                    
                    if release_result.data:
                        released_count += 1
                        logger.info(f"Released schedule slot {sched_id}")
        
        return Response({
            "message": f"Bulk release completed. Released {released_count} schedule slots.",
            "released_schedules": released_count,
            "processed_appointments": len(cancelled_appointments.data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in bulk schedule release: {e}")
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
    Each announcement includes the first and last name of the user who posted it.
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

            # 🔹 Get user info (fetch actual first and last name)
            user_info = None
            user_name = "Unknown User"

            user_id = (
                announcement.get("user_id")
                or announcement.get("created_by")
                or announcement.get("author_id")
                or announcement.get("ctu_id")
                or announcement.get("dvmf_id")
            )

            if user_id:
                try:
                    # Try CTU user first
                    user_response = service_client.table("ctu_vet_profile") \
                        .select("ctu_fname, ctu_lname") \
                        .eq("ctu_id", user_id) \
                        .execute()

                    if user_response.data and len(user_response.data) > 0:
                        user_info = user_response.data[0]
                        fname = user_info.get("ctu_fname", "").strip()
                        lname = user_info.get("ctu_lname", "").strip()
                        user_name = f"{fname} {lname}".strip() if (fname or lname) else "Unknown User"
                        logger.info(f"CTU user found: {user_name}")
                    else:
                        # Try DVMF user next
                        user_response = service_client.table("dvmf_user_profile") \
                            .select("dvmf_fname, dvmf_lname") \
                            .eq("dvmf_id", user_id) \
                            .execute()

                        if user_response.data and len(user_response.data) > 0:
                            user_info = user_response.data[0]
                            fname = user_info.get("dvmf_fname", "").strip()
                            lname = user_info.get("dvmf_lname", "").strip()
                            user_name = f"{fname} {lname}".strip() if (fname or lname) else "Unknown User"
                            logger.info(f"DVMF user found: {user_name}")
                        else:
                            logger.warning(f"User not found in either table for ID {user_id}")
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
            announcement_data = {
                "id": str(announce_id),
                "announce_id": announce_id,
                "announce_title": announcement.get("announce_title", "Untitled"),
                "announce_content": announcement.get("announce_content", ""),
                "announce_date": announcement.get("announce_date", ""),
                "announce_status": announcement.get("announce_status", "active"),
                "created_at": announcement.get("created_at", ""),
                "comment_count": comment_count,
                "user_name": user_name,  # ✅ First + Last name only
                "user_info": user_info,
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

@api_view(['GET'])
def get_horse_assignments(request):
    """
    Get horse assignments for horses owned by a specific operator
    Optional: Filter by specific horse_id if provided
    """
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")  # Optional parameter
    
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # First, get the horse IDs owned by this operator
        horses_query = supabase.table("horse_profile").select("horse_id").eq("op_id", user_id).execute()
        
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
        assignments_data = supabase.table("horse_assignment").select("*").in_("horse_id", horse_ids).order("date_start", desc=True).execute()
        
        assignments = []
        for assignment in assignments_data.data:
            # Get kutsero info using the correct field names from kutsero_profile table
            kutsero_data = supabase.table("kutsero_profile").select(
                "kutsero_fname, kutsero_mname, kutsero_lname"
            ).eq("kutsero_id", assignment["kutsero_id"]).execute()
            
            kutsero_name = ""
            if kutsero_data.data:
                kutsero = kutsero_data.data[0]
                fname = kutsero.get('kutsero_fname', '')
                mname = kutsero.get('kutsero_mname', '')
                lname = kutsero.get('kutsero_lname', '')
                
                # Build full name with middle name if available
                if mname and mname.strip():
                    kutsero_name = f"{fname} {mname} {lname}".strip()
                else:
                    kutsero_name = f"{fname} {lname}".strip()
            
            # Get horse info
            horse_data = supabase.table("horse_profile").select("horse_name").eq("horse_id", assignment["horse_id"]).execute()
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
                "kutsero_image": None  # No image field in kutsero_profile table
            })
        
        logger.info(f"Returning {len(assignments)} assignments for {'specific horse' if horse_id else 'all horses'}")
        return Response(assignments, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching horse assignments: {e}")
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
    Get details of a specific medical record by ID - FIXED VERSION WITH ROBUST IMAGE URL HANDLING
    Now includes ALL fields from horse_medical_record table
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
        
        # ✅ FIXED: Robust laboratory image URL handling with JSON array parsing
        lab_image_url = record.get("medrec_lab_img")
        formatted_lab_image = None
        
        if lab_image_url:
            try:
                # Log the raw value from database
                logger.info(f"Raw lab image value from DB: {lab_image_url}")
                
                # Clean the URL string - remove any whitespace or newlines
                lab_image_url = str(lab_image_url).strip()
                
                # ✅ NEW: Handle JSON array format first (e.g., '["url"]')
                if lab_image_url.startswith('[') and lab_image_url.endswith(']'):
                    try:
                        import json
                        url_array = json.loads(lab_image_url)
                        if url_array and len(url_array) > 0:
                            lab_image_url = str(url_array[0]).strip()
                            logger.info(f"✅ Extracted URL from JSON array: {lab_image_url}")
                    except json.JSONDecodeError as json_error:
                        logger.warning(f"Failed to parse JSON array: {json_error}")
                        # Try to extract manually if JSON parsing fails
                        if '["' in lab_image_url and '"]' in lab_image_url:
                            lab_image_url = lab_image_url.replace('["', '').replace('"]', '').strip()
                            logger.info(f"✅ Manually extracted URL: {lab_image_url}")
                
                # Case 1: Already a full URL with https:// or http://
                if lab_image_url.startswith('https://') or lab_image_url.startswith('http://'):
                    formatted_lab_image = lab_image_url
                    logger.info(f"✅ Using existing full URL: {formatted_lab_image}")
                
                # Case 2: Starts with /storage/ path
                elif lab_image_url.startswith('/storage/'):
                    formatted_lab_image = f"{SUPABASE_URL}{lab_image_url}"
                    logger.info(f"✅ Constructed URL from path: {formatted_lab_image}")
                
                # Case 3: Contains storage/v1/object in the middle
                elif '/storage/v1/object/' in lab_image_url:
                    if not lab_image_url.startswith('http'):
                        formatted_lab_image = f"{SUPABASE_URL}{lab_image_url}"
                    else:
                        formatted_lab_image = lab_image_url
                    logger.info(f"✅ Constructed URL from storage path: {formatted_lab_image}")
                
                # Case 4: Just a filename - construct full public URL
                else:
                    # Assume it's in a Lab_results bucket (based on your error message)
                    formatted_lab_image = f"{SUPABASE_URL}/storage/v1/object/public/Lab_results/{lab_image_url}"
                    logger.info(f"✅ Constructed URL from filename: {formatted_lab_image}")
                
                # ✅ CRITICAL: Final validation - ensure clean URL
                if formatted_lab_image:
                    # Basic validation: ensure URL starts with http:// or https://
                    if not (formatted_lab_image.startswith('https://') or formatted_lab_image.startswith('http://')):
                        logger.error(f"❌ Invalid URL scheme: {formatted_lab_image}")
                        formatted_lab_image = None
                    # Ensure no suspicious characters that could cause parsing errors
                    elif any(char in formatted_lab_image for char in ['[', ']', '"', ' ', '\n', '\r']):
                        logger.error(f"❌ URL contains invalid characters: {formatted_lab_image}")
                        formatted_lab_image = None
                    else:
                        logger.info(f"✅ Valid lab image URL: {formatted_lab_image}")
                
            except Exception as img_error:
                logger.error(f"❌ Error processing lab image URL: {img_error}", exc_info=True)
                formatted_lab_image = None
        else:
            logger.info("No lab image in this record")
        
        # Build detailed response with ALL fields from your schema
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
                "image_url": formatted_lab_image  # ✅ Now properly formatted and validated
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
        logger.info(f"Lab image URL in response: {formatted_lab_image}")
        
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
        
        # Verify user exists
        try:
            user_check = supabase.table("users").select("id").eq("id", user_id).execute()
            if not user_check.data:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as user_error:
            logger.error(f"Error checking user existence: {user_error}")
            return Response({"error": "Error validating user"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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
        
        # Get comprehensive user info for response
        user_info = get_comprehensive_user_info(user_id)
        
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


@api_view(['PUT'])
def update_comment(request, comment_id):
    """
    Update a comment (only by the original author)
    Updates the updated_at timestamp automatically via trigger
    """
    try:
        user_id = request.data.get("user_id")
        comment_text = request.data.get("comment_text")
        
        if not user_id or not comment_text:
            return Response({
                "error": "user_id and comment_text are required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate UUIDs
        try:
            uuid.UUID(user_id)
            uuid.UUID(comment_id)
        except ValueError as ve:
            return Response({
                "error": f"Invalid UUID format: {str(ve)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate comment text (per table constraint: 0 < length <= 500)
        comment_text = comment_text.strip()
        if len(comment_text) == 0:
            return Response({"error": "Comment text cannot be empty"}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(comment_text) > 500:
            return Response({"error": "Comment text cannot exceed 500 characters"}, status=status.HTTP_400_BAD_REQUEST)
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if comment exists and belongs to user
        comment_check = service_client.table("comment").select(
            "id, user_id, comment_text"
        ).eq("id", comment_id).eq("user_id", user_id).execute()
        
        if not comment_check.data:
            return Response({
                "error": "Comment not found or you don't have permission to edit it"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update the comment (trigger will update updated_at automatically)
        update_result = service_client.table("comment").update({
            "comment_text": comment_text
            # updated_at is handled by trigger: update_comment_updated_at
        }).eq("id", comment_id).eq("user_id", user_id).execute()
        
        if not update_result.data:
            return Response({"error": "Failed to update comment"}, status=status.HTTP_400_BAD_REQUEST)
        
        updated_comment = update_result.data[0]
        logger.info(f"✅ Comment {comment_id} updated successfully by user {user_id}")
        
        return Response({
            "message": "Comment updated successfully",
            "comment": {
                "id": str(updated_comment["id"]),
                "text": updated_comment["comment_text"],
                "updated_at": updated_comment["updated_at"]
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ Error updating comment {comment_id}: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_comment(request, comment_id):
    """
    Delete a comment (only by the original author)
    Also handles cascade deletion of replies and updates counts
    """
    try:
        user_id = request.data.get("user_id") or request.GET.get("user_id")
        
        if not user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if comment exists and belongs to user
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        comment_check = service_client.table("comment").select("*").eq("id", comment_id).eq("user_id", user_id).execute()
        
        if not comment_check.data:
            return Response({
                "error": "Comment not found or you don't have permission to delete it"
            }, status=status.HTTP_404_NOT_FOUND)
        
        comment = comment_check.data[0]
        parent_comment_id = comment.get("parent_comment_id")
        announcement_id = comment.get("announcement_id")
        
        # Count replies that will be deleted
        replies_count = 0
        if comment.get("reply_count", 0) > 0:
            replies_data = service_client.table("comment").select("id", count="exact").eq("parent_comment_id", comment_id).execute()
            replies_count = replies_data.count or 0
        
        # Delete all replies first (cascade)
        if replies_count > 0:
            service_client.table("comment").delete().eq("parent_comment_id", comment_id).execute()
            logger.info(f"Deleted {replies_count} replies for comment {comment_id}")
        
        # Delete the comment
        delete_result = service_client.table("comment").delete().eq("id", comment_id).eq("user_id", user_id).execute()
        
        if not delete_result.data:
            return Response({"error": "Failed to delete comment"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update parent comment's reply_count if this was a reply
        if parent_comment_id:
            try:
                parent_data = service_client.table("comment").select("reply_count").eq("id", parent_comment_id).execute()
                if parent_data.data:
                    current_count = parent_data.data[0].get("reply_count", 0)
                    new_count = max(0, current_count - 1)
                    service_client.table("comment").update({
                        "reply_count": new_count
                    }).eq("id", parent_comment_id).execute()
                    logger.info(f"Updated parent comment {parent_comment_id} reply_count to {new_count}")
            except Exception as parent_error:
                logger.warning(f"Could not update parent reply_count: {parent_error}")
        
        logger.info(f"Comment {comment_id} deleted successfully by user {user_id}")
        
        return Response({
            "message": "Comment deleted successfully",
            "deleted_comment_id": comment_id,
            "deleted_replies": replies_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error deleting comment {comment_id}: {e}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
    Enforces max reply depth of 3 levels and updates parent comment's reply_count atomically
    """
    try:
        user_id = request.data.get("user_id")
        comment_id = request.data.get("comment_id")  # Parent comment ID
        reply_text = request.data.get("reply_text")
        
        # Log incoming request
        logger.info(f"📥 Received reply request - User: {user_id}, Comment: {comment_id}")
        
        # Validate required fields
        if not all([user_id, comment_id, reply_text]):
            logger.error("Missing required fields")
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
        reply_id = str(uuid.uuid4())
        
        # Get user info for the response
        user_info = get_comprehensive_user_info(user_id)
        
        # Create reply payload
        reply_payload = {
            "id": reply_id,
            "comment_text": reply_text,
            "comment_date": current_timestamp,
            "user_id": user_id,
            "announcement_id": announcement_id,
            "parent_comment_id": comment_id,
            "reply_level": new_reply_level,
            "reply_count": 0,  # New replies start with 0
            "created_at": current_timestamp,
            "updated_at": current_timestamp
        }
        
        logger.info(f"Creating reply with level {new_reply_level}")
        
        # ✅ Atomic transaction: Insert reply and update parent's reply_count
        try:
            # Insert the reply
            insert_result = service_client.table("comment").insert(reply_payload).execute()
            
            if not insert_result.data or len(insert_result.data) == 0:
                logger.error(f"Failed to create reply - no data returned")
                return Response({"error": "Failed to create reply"}, status=status.HTTP_400_BAD_REQUEST)
            
            created_reply = insert_result.data[0]
            logger.info(f"✅ Reply created successfully: {created_reply['id']}")
            
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
        
        # Format reply for frontend
        formatted_reply = {
            "id": str(created_reply["id"]),
            "text": created_reply["comment_text"],
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
    Get all direct replies for a specific comment (one level deep)
    FIXED VERSION with better error handling
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
            user_info = get_comprehensive_user_info(reply["user_id"])
            
            # Format time
            comment_date = reply.get("comment_date") or reply.get("created_at")
            relative_time = format_relative_time(comment_date)
            
            formatted_replies.append({
                "id": reply["id"],
                "text": reply["comment_text"],
                "user": user_info["name"],
                "user_id": reply["user_id"],
                "user_role": user_info["role"],
                "user_profile": user_info["profile"],
                "time": relative_time,
                "formatted_date": comment_date,
                "comment_date": comment_date,
                "parent_comment_id": comment_id,
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
    Get comprehensive user information from all user tables - FIXED VERSION
    """
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    try:
        # 1. Try horse_op_profile (Horse Operators)
        try:
            op_data = supabase.table("horse_op_profile").select(
                "op_id, op_fname, op_mname, op_lname, op_email, op_image"
            ).eq("op_id", user_id).execute()
            
            if op_data.data and len(op_data.data) > 0:
                profile = op_data.data[0]
                fname = profile.get("op_fname", "")
                mname = profile.get("op_mname", "")
                lname = profile.get("op_lname", "")
                
                # Build name with proper formatting
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if mname:
                    name_parts.append(mname)
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
                        "middle_name": mname,
                        "last_name": lname,
                        "email": profile.get("op_email"),
                        "image": profile.get("op_image")
                    }
                }
        except Exception as e:
            logger.debug(f"Not in horse_op_profile: {e}")
        
        # 2. Try kutsero_profile (Kutseros)
        try:
            kutsero_data = supabase.table("kutsero_profile").select(
                "kutsero_id, kutsero_fname, kutsero_mname, kutsero_lname, kutsero_email, kutsero_image"
            ).eq("kutsero_id", user_id).execute()
            
            if kutsero_data.data and len(kutsero_data.data) > 0:
                profile = kutsero_data.data[0]
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
                
                user_name = " ".join(name_parts).strip()
                if not user_name:
                    user_name = "Kutsero"
                
                return {
                    "name": user_name,
                    "role": "kutsero",
                    "profile": {
                        "full_name": user_name,
                        "first_name": fname,
                        "middle_name": mname,
                        "last_name": lname,
                        "email": profile.get("kutsero_email"),
                        "image": profile.get("kutsero_image")
                    }
                }
        except Exception as e:
            logger.debug(f"Not in kutsero_profile: {e}")
        
        # 3. Try vet_profile (Veterinarians)
        try:
            vet_data = supabase.table("vet_profile").select(
                "vet_id, vet_fname, vet_mname, vet_lname, vet_email, vet_profile_photo"
            ).eq("vet_id", user_id).execute()
            
            if vet_data.data and len(vet_data.data) > 0:
                profile = vet_data.data[0]
                fname = profile.get("vet_fname", "")
                mname = profile.get("vet_mname", "")
                lname = profile.get("vet_lname", "")
                
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if mname:
                    name_parts.append(mname)
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
                        "middle_name": mname,
                        "last_name": lname,
                        "email": profile.get("vet_email"),
                        "image": profile.get("vet_profile_photo")
                    }
                }
        except Exception as e:
            logger.debug(f"Not in vet_profile: {e}")
        
        # 4. Try ctu_vet_profile (CTU Veterinarians)
        try:
            ctu_data = supabase.table("ctu_vet_profile").select(
                "ctu_id, ctu_fname, ctu_mname, ctu_lname, ctu_email"
            ).eq("ctu_id", user_id).execute()
            
            if ctu_data.data and len(ctu_data.data) > 0:
                profile = ctu_data.data[0]
                fname = profile.get("ctu_fname", "")
                mname = profile.get("ctu_mname", "")
                lname = profile.get("ctu_lname", "")
                
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if mname:
                    name_parts.append(mname)
                if lname:
                    name_parts.append(lname)
                
                user_name = " ".join(name_parts).strip()
                if not user_name:
                    user_name = "CTU Veterinarian"
                
                return {
                    "name": user_name,
                    "role": "ctu_veterinarian",
                    "profile": {
                        "full_name": user_name,
                        "first_name": fname,
                        "middle_name": mname,
                        "last_name": lname,
                        "email": profile.get("ctu_email"),
                        "image": None
                    }
                }
        except Exception as e:
            logger.debug(f"Not in ctu_vet_profile: {e}")
        
        # 5. Try dvmf_user_profile (DVMF Users)
        try:
            dvmf_data = supabase.table("dvmf_user_profile").select(
                "dvmf_id, dvmf_fname, dvmf_mname, dvmf_lname, dvmf_email"
            ).eq("dvmf_id", user_id).execute()
            
            if dvmf_data.data and len(dvmf_data.data) > 0:
                profile = dvmf_data.data[0]
                fname = profile.get("dvmf_fname", "")
                mname = profile.get("dvmf_mname", "")
                lname = profile.get("dvmf_lname", "")
                
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if mname:
                    name_parts.append(mname)
                if lname:
                    name_parts.append(lname)
                
                user_name = " ".join(name_parts).strip()
                if not user_name:
                    user_name = "DVMF User"
                
                return {
                    "name": user_name,
                    "role": "dvmf",
                    "profile": {
                        "full_name": user_name,
                        "first_name": fname,
                        "middle_name": mname,
                        "last_name": lname,
                        "email": profile.get("dvmf_email"),
                        "image": None
                    }
                }
        except Exception as e:
            logger.debug(f"Not in dvmf_user_profile: {e}")
        
        # 6. Try kutsero_pres_profile (Kutsero Presidents)
        try:
            kpres_data = supabase.table("kutsero_pres_profile").select(
                "user_id, kpres_fname, kpres_mname, kpres_lname, kpres_email"
            ).eq("user_id", user_id).execute()
            
            if kpres_data.data and len(kpres_data.data) > 0:
                profile = kpres_data.data[0]
                fname = profile.get("kpres_fname", "")
                mname = profile.get("kpres_mname", "")
                lname = profile.get("kpres_lname", "")
                
                name_parts = []
                if fname:
                    name_parts.append(fname)
                if mname:
                    name_parts.append(mname)
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
                        "middle_name": mname,
                        "last_name": lname,
                        "email": profile.get("kpres_email"),
                        "image": None
                    }
                }
        except Exception as e:
            logger.debug(f"Not in kutsero_pres_profile: {e}")
        
        # Final fallback
        logger.warning(f"Could not find user {user_id} in any profile table")
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
    user_id = request.GET.get("user_id")
    horse_id = request.GET.get("horse_id")
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        data = supabase.table("water_detail") \
            .select("*") \
            .eq("op_id", user_id) \
            .eq("horse_id", horse_id) \
            .order("water_time", desc=False) \
            .execute()
        return Response(data.data, status=status.HTTP_200_OK)
    except Exception as e:
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
    MODIFIED VERSION: Save watering schedule but don't create any database entries yet
    Only store the schedule structure for local app use
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    schedule = request.data.get("schedule")
    
    if not user_id or not horse_id or not schedule:
        return Response({"error": "user_id, horse_id, and schedule are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Note: This version doesn't save to water_detail table
        # It only validates the schedule format and returns success
        # The actual database entry happens only when water is marked as given
        
        logger.info(f"Validated watering schedule for user {user_id}, horse {horse_id}")
        logger.info(f"Schedule contains {len(schedule)} watering times")
        
        # Validate schedule format
        for water in schedule:
            if not all(k in water for k in ['time', 'amount']):
                return Response({"error": "Invalid schedule format"}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            "message": "Watering schedule validated successfully",
            "note": "No database entries created until water is actually given"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error validating watering schedule: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mark_water_given(request):
    """
    MODIFIED VERSION: Mark water as given AND create database entry for the first time
    This is when we actually save to water_detail and water_log
    """
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    water_time = request.data.get("water_time")
    water_period = request.data.get("water_period")
    water_amount = request.data.get("water_amount")
    completed_at = request.data.get("completed_at") or datetime.now().isoformat()

    if not all([user_id, horse_id, water_time, water_period, water_amount]):
        return Response({
            "error": "user_id, horse_id, water_time, water_period, and water_amount are required"
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Generate unique water_id for this specific water giving event
        water_id = str(uuid.uuid4())
        
        # 1. FIRST TIME: Create water_detail entry (only when water is actually given)
        water_detail_payload = {
            "water_id": water_id,
            "op_id": user_id,
            "horse_id": horse_id,
            "water_period": water_period,
            "water_amount": water_amount,
            "water_time": water_time,
            "completed": True,  # Always true since we're marking as given
            "completed_at": completed_at,
            "user_type": "op"
        }
        
        # Insert into water_detail
        detail_result = service_client.table("water_detail").insert(water_detail_payload).execute()
        
        if not detail_result.data:
            return Response({"error": "Failed to create water detail record"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 2. Get operator full name for logging
        user_data = supabase.table("horse_op_profile").select("op_fname, op_lname").eq("op_id", user_id).execute()
        user_full_name = "Unknown User"
        if user_data.data:
            fn = user_data.data[0].get("op_fname", "")
            ln = user_data.data[0].get("op_lname", "")
            user_full_name = f"{fn} {ln}".strip()

        # 3. Get horse name for logging
        horse_data = supabase.table("horse_profile").select("horse_name").eq("horse_id", horse_id).execute()
        horse_name = "Unknown Horse"
        if horse_data.data:
            horse_name = horse_data.data[0].get("horse_name", "Unknown Horse")

        # 4. Insert into water_log
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
            "created_at": completed_at
        }
        
        log_result = service_client.table("water_log").insert(log_payload).execute()
        
        if not log_result.data:
            logger.warning("Failed to create water log entry, but water detail was saved")

        logger.info(f"Water marked as given and logged: {horse_name} - {water_period} ({water_amount})")

        return Response({
            "message": f"Water marked as given for {horse_name}",
            "water_id": water_id,
            "water_detail_created": True,
            "water_log_created": bool(log_result.data),
            "horse_name": horse_name,
            "period": water_period,
            "amount": water_amount,
            "time": water_time
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error marking water as given: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_water_logs(request):
    user_id = request.GET.get("user_id")
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        data = supabase.table("water_log").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        
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
            
            transformed_data.append({
                "log_id": log["wlog_id"],  # Changed from log_id to wlog_id
                "date": log["wlog_date"],
                "horse": horse_name,
                "horse_id": log["horse_id"],
                "timestamp": log["created_at"],
                "user_full_name": log["wlog_user_full_name"],
                "period": log["wlog_period"],
                "time": log["wlog_time"],
                "amount": log["wlog_amount"],
                "status": log["wlog_status"],
                "action": log["wlog_action"].lower()
            })
        
        return Response(transformed_data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching water logs: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def clear_water_logs(request):
    user_id = request.data.get("user_id")
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        service_client.table("water_log").delete().eq("user_id", user_id).execute()
        return Response({"message": "All water logs cleared successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def reset_daily_watering(request):
    user_id = request.data.get("user_id")
    horse_id = request.data.get("horse_id")
    if not user_id or not horse_id:
        return Response({"error": "Both user_id and horse_id are required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        service_client.table("water_detail").update({
            "completed": False,
            "completed_at": None
        }).eq("op_id", user_id).eq("horse_id", horse_id).execute()
        return Response({"message": "Daily watering reset successfully"}, status=status.HTTP_200_OK)
    except Exception as e:
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


# ================================================ GET NOTIFICATIONS ================================================














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
                "user_id, kpres_fname, kpres_lname, kpres_email"
            ).or_(
                f"kpres_fname.ilike.%{name_query}%,kpres_lname.ilike.%{name_query}%"
            ).execute()
            
            for kpres in kutsero_pres_data.data if kutsero_pres_data.data else []:
                all_users.append({
                    "id": kpres["user_id"],
                    "user_id": kpres["user_id"],
                    "first_name": kpres.get("kpres_fname", ""),
                    "last_name": kpres.get("kpres_lname", ""),
                    "middle_name": "",
                    "full_name": f"{kpres.get('kpres_fname', '')} {kpres.get('kpres_lname', '')}".strip(),
                    "email": kpres.get("kpres_email", ""),
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
                    "user_role": "ctu_veterinarian",
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
                    all_users.append({
                        "id": ctu_vet["ctu_id"],
                        "user_id": ctu_vet["ctu_id"],
                        "first_name": ctu_vet.get("ctu_fname", ""),
                        "last_name": ctu_vet.get("ctu_lname", ""),
                        "full_name": f" {ctu_vet.get('ctu_fname', '')} {ctu_vet.get('ctu_lname', '')}".strip(),
                        "email": ctu_vet.get("ctu_email", ""),
                        "user_role": "ctu_veterinarian",
                        "image": None,
                    })
            
            elif db_role == "dvmf":
                dvmf_data = service_client.table("dvmf_user_profile").select("*").execute()
                
                for dvmf in dvmf_data.data if dvmf_data.data else []:
                    all_users.append({
                        "id": dvmf["dvmf_id"],
                        "user_id": dvmf["dvmf_id"],
                        "first_name": dvmf.get("dvmf_fname", ""),
                        "last_name": dvmf.get("dvmf_lname", ""),
                        "full_name": f"{dvmf.get('dvmf_fname', '')} {dvmf.get('dvmf_lname', '')}".strip(),
                        "email": dvmf.get("dvmf_email", ""),
                        "user_role": "dvmf",
                        "image": None,
                    })
            
            elif db_role == "kutsero_president":
                kpres_data = service_client.table("kutsero_pres_profile").select("*").execute()
                
                for kpres in kpres_data.data if kpres_data.data else []:
                    all_users.append({
                        "id": kpres["user_id"],
                        "user_id": kpres["user_id"],
                        "first_name": kpres.get("kpres_fname", ""),
                        "last_name": kpres.get("kpres_lname", ""),
                        "full_name": f"{kpres.get('kpres_fname', '')} {kpres.get('kpres_lname', '')}".strip(),
                        "email": kpres.get("kpres_email", ""),
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
    Get complete user profile by user_id
    Returns formatted profile data for any user type
    FIXED: Now ensures phone_num and address are always returned
    """
    user_id = request.GET.get("user_id")
    
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        logger.info(f"🔍 Fetching profile for user_id: {user_id}")
        
        # Try Horse Operator
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
                    "phone_num": profile.get("op_phone_num"),  # ✅ Mapped to phone_num
                    "address": full_address,  # ✅ Formatted address
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
                
                # ✅ CRITICAL FIX: Map kutsero_phone_num to phone_num
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
                    "phone_num": phone_number,  # ✅ Correctly mapped from kutsero_phone_num
                    "address": full_address,    # ✅ Formatted address
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
                    # If home address is clinic, use the home address as clinic address
                    clinic_address = full_address
                else:
                    # Build separate clinic address from clinic fields
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
                
                logger.info(f"✅ Found veterinarian profile - phone: {profile.get('vet_phone_num')}, address: {full_address}, clinic: {clinic_address}")
                
                return Response({
                    "id": profile["vet_id"],
                    "user_id": profile["vet_id"],
                    "first_name": profile.get("vet_fname", ""),
                    "last_name": profile.get("vet_lname", ""),
                    "middle_name": profile.get("vet_mname", ""),
                    "full_name": f" {profile.get('vet_fname', '')} {profile.get('vet_lname', '')}".strip(),
                    "email": profile.get("vet_email", ""),
                    "phone_num": profile.get("vet_phone_num"),  # ✅ Mapped to phone_num
                    "clinic_address": clinic_address,  # ✅ Properly built clinic address
                    "address": full_address,  # ✅ Home/personal address
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
                
                logger.info(f"✅ Found CTU veterinarian profile - phone: {profile.get('ctu_phonenum')}")
                
                return Response({
                    "id": profile["ctu_id"],
                    "user_id": profile["ctu_id"],
                    "first_name": profile.get("ctu_fname", ""),
                    "last_name": profile.get("ctu_lname", ""),
                    "middle_name": "",
                    "full_name": f" {profile.get('ctu_fname', '')} {profile.get('ctu_lname', '')}".strip(),
                    "email": profile.get("ctu_email", ""),
                    "phone_num": profile.get("ctu_phonenum"),  # ✅ Mapped to phone_num
                    "clinic_address": profile.get("ctu_clinic_address"),
                    "address": profile.get("ctu_address"),  # ✅ Direct address field
                    "user_role": "ctu_veterinarian",
                    "image": None,
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.debug(f"Not a CTU veterinarian: {e}")
        
        # Try DVMF
        try:
            dvmf_data = service_client.table("dvmf_user_profile").select("*").eq("dvmf_id", user_id).execute()
            
            if dvmf_data.data and len(dvmf_data.data) > 0:
                profile = dvmf_data.data[0]
                
                logger.info(f"✅ Found DVMF profile - phone: {profile.get('dvmf_phone_num')}")
                
                return Response({
                    "id": profile["dvmf_id"],
                    "user_id": profile["dvmf_id"],
                    "first_name": profile.get("dvmf_fname", ""),
                    "last_name": profile.get("dvmf_lname", ""),
                    "middle_name": "",
                    "full_name": f"{profile.get('dvmf_fname', '')} {profile.get('dvmf_lname', '')}".strip(),
                    "email": profile.get("dvmf_email", ""),
                    "phone_num": profile.get("dvmf_phone_num"),  # ✅ Mapped to phone_num
                    "address": profile.get("dvmf_address"),  # ✅ Direct address field
                    "user_role": "dvmf",
                    "image": None,
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.debug(f"Not DVMF: {e}")
        
        # Try Kutsero President
        try:
            kpres_data = service_client.table("kutsero_pres_profile").select("*").eq("user_id", user_id).execute()
            
            if kpres_data.data and len(kpres_data.data) > 0:
                profile = kpres_data.data[0]
                
                logger.info(f"✅ Found kutsero president profile - phone: {profile.get('kpres_phone_num')}")
                
                return Response({
                    "id": profile["user_id"],
                    "user_id": profile["user_id"],
                    "first_name": profile.get("kpres_fname", ""),
                    "last_name": profile.get("kpres_lname", ""),
                    "middle_name": "",
                    "full_name": f"{profile.get('kpres_fname', '')} {profile.get('kpres_lname', '')}".strip(),
                    "email": profile.get("kpres_email", ""),
                    "phone_num": profile.get("kpres_phone_num"),  # ✅ Mapped to phone_num
                    "address": profile.get("kpres_address"),  # ✅ Direct address field
                    "user_role": "kutsero_president",
                    "image": None,
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.debug(f"Not kutsero president: {e}")
        
        # User not found in any table
        logger.error(f"❌ User {user_id} not found in any profile table")
        return Response({
            "error": "User profile not found"
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
    - Horse Operators (kutsero_profile)
    - Veterinarians (vet_profile)
    - CTU Veterinarians (ctu_vet_profile)
    - DVMF Users (dvmf_user_profile)
    - Kutsero Presidents (kutsero_pres_profile)
    """
    try:
        logger.info(f"Fetching profile for user_id: {user_id}")
        
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Try to find user in different tables
        user_data = None
        user_type = None
        
        # Check kutsero_profile
        try:
            kutsero = service_client.table("kutsero_profile").select("*").eq("kutsero_id", user_id).execute()
            if kutsero.data and len(kutsero.data) > 0:
                profile = kutsero.data[0]
                logger.info(f"Found kutsero profile: {profile}")
                user_data = {
                    "id": profile.get("kutsero_id"),
                    "email": profile.get("kutsero_email"),
                    "role": "Kutsero",
                    "status": profile.get("status", "active"),
                    "profile": {
                        "fname": profile.get("kutsero_fname"),
                        "mname": profile.get("kutsero_mname"),
                        "lname": profile.get("kutsero_lname"),
                        "username": profile.get("kutsero_username"),
                        "email": profile.get("kutsero_email"),
                        "phone": profile.get("kutsero_phone_num"),
                        "city": profile.get("kutsero_city"),
                        "province": profile.get("kutsero_province"),
                        "profile_image": profile.get("kutsero_image")
                    }
                }
                user_type = "kutsero"
                logger.info(f"Kutsero profile - city: {profile.get('kutsero_city')}, province: {profile.get('kutsero_province')}, image: {profile.get('kutsero_image')}")
        except Exception as e:
            logger.error(f"Error checking kutsero: {e}")
        
        # Check vet_profile
        if not user_data:
            try:
                vet = service_client.table("vet_profile").select("*").eq("vet_id", user_id).execute()
                if vet.data and len(vet.data) > 0:
                    profile = vet.data[0]
                    logger.info(f"Found vet profile: {profile}")
                    user_data = {
                        "id": profile.get("vet_id"),
                        "email": profile.get("vet_email"),
                        "role": "Veterinarian",
                        "status": profile.get("status", "active"),
                        "profile": {
                            "fname": profile.get("vet_fname"),
                            "mname": profile.get("vet_mname"),
                            "lname": profile.get("vet_lname"),
                            "username": profile.get("vet_username"),
                            "email": profile.get("vet_email"),
                            "phone": profile.get("vet_phone_num"),
                            "city": profile.get("vet_city"),
                            "province": profile.get("vet_province"),
                            "profile_image": profile.get("vet_profile_photo")
                        }
                    }
                    user_type = "vet"
                    logger.info(f"Vet profile - city: {profile.get('vet_city')}, province: {profile.get('vet_province')}, image: {profile.get('vet_profile_photo')}")
            except Exception as e:
                logger.error(f"Error checking vet: {e}")
        
        # Check horse_op_profile
        if not user_data:
            try:
                op = service_client.table("horse_op_profile").select("*").eq("op_id", user_id).execute()
                if op.data and len(op.data) > 0:
                    profile = op.data[0]
                    logger.info(f"Found horse operator profile: {profile}")
                    user_data = {
                        "id": profile.get("op_id"),
                        "email": profile.get("op_email"),
                        "role": "Horse Operator",
                        "status": profile.get("status", "active"),
                        "profile": {
                            "fname": profile.get("op_fname"),
                            "mname": profile.get("op_mname"),
                            "lname": profile.get("op_lname"),
                            "username": profile.get("op_username"),
                            "email": profile.get("op_email"),
                            "phone": profile.get("op_phone_num"),
                            "city": profile.get("op_city"),
                            "province": profile.get("op_province"),
                            "profile_image": profile.get("op_image")
                        }
                    }
                    user_type = "operator"
                    logger.info(f"Horse operator profile - city: {profile.get('op_city')}, province: {profile.get('op_province')}, image: {profile.get('op_image')}")
            except Exception as e:
                logger.error(f"Error checking horse operator: {e}")
        
        # Check ctu_vet_profile
        if not user_data:
            try:
                ctu = service_client.table("ctu_vet_profile").select("*").eq("ctu_id", user_id).execute()
                if ctu.data and len(ctu.data) > 0:
                    profile = ctu.data[0]
                    logger.info(f"Found CTU vet profile: {profile}")
                    user_data = {
                        "id": profile.get("ctu_id"),
                        "email": profile.get("ctu_email"),
                        "role": "Ctu-Vetmed",
                        "status": profile.get("status", "active"),
                        "profile": {
                            "fname": profile.get("ctu_fname"),
                            "mname": profile.get("ctu_mname"),
                            "lname": profile.get("ctu_lname"),
                            "username": profile.get("ctu_username"),
                            "email": profile.get("ctu_email"),
                            "phone": profile.get("ctu_phonenum"),
                            "city": profile.get("ctu_city"),
                            "province": profile.get("ctu_province"),
                            "profile_image": profile.get("ctu_profile_photo")
                        }
                    }
                    user_type = "ctu_vet"
                    logger.info(f"CTU vet profile - city: {profile.get('ctu_city')}, province: {profile.get('ctu_province')}, image: {profile.get('ctu_profile_photo')}")
            except Exception as e:
                logger.error(f"Error checking CTU vet: {e}")
        
        # Check dvmf_user_profile
        if not user_data:
            try:
                dvmf = service_client.table("dvmf_user_profile").select("*").eq("dvmf_id", user_id).execute()
                if dvmf.data and len(dvmf.data) > 0:
                    profile = dvmf.data[0]
                    logger.info(f"Found DVMF user profile: {profile}")
                    user_data = {
                        "id": profile.get("dvmf_id"),
                        "email": profile.get("dvmf_email"),
                        "role": "Dvmf",
                        "status": profile.get("status", "active"),
                        "profile": {
                            "fname": profile.get("dvmf_fname"),
                            "mname": profile.get("dvmf_mname"),
                            "lname": profile.get("dvmf_lname"),
                            "username": profile.get("dvmf_username"),
                            "email": profile.get("dvmf_email"),
                            "phone": profile.get("dvmf_phonenum"),
                            "city": profile.get("dvmf_city"),
                            "province": profile.get("dvmf_province"),
                            "profile_image": profile.get("dvmf_profile_photo")
                        }
                    }
                    user_type = "dvmf_user"
                    logger.info(f"DVMF user profile - city: {profile.get('dvmf_city')}, province: {profile.get('dvmf_province')}, image: {profile.get('dvmf_profile_photo')}")
            except Exception as e:
                logger.error(f"Error checking DVMF user: {e}")
        
        # Check kutsero_pres_profile
        if not user_data:
            try:
                kpres = service_client.table("kutsero_pres_profile").select("*").eq("user_id", user_id).execute()
                if kpres.data and len(kpres.data) > 0:
                    profile = kpres.data[0]
                    logger.info(f"Found Kutsero President profile: {profile}")
                    user_data = {
                        "id": profile.get("user_id"),
                        "email": profile.get("kpres_email"),
                        "role": "Kutsero President",
                        "status": profile.get("status", "active"),
                        "profile": {
                            "fname": profile.get("kpres_fname"),
                            "mname": profile.get("kpres_mname"),
                            "lname": profile.get("kpres_lname"),
                            "username": profile.get("kpres_username"),
                            "email": profile.get("kpres_email"),
                            "phone": profile.get("kpres_phonenum"),
                            "city": profile.get("kpres_city"),
                            "province": profile.get("kpres_province"),
                            "profile_image": profile.get("kpres_profile_photo")
                        }
                    }
                    user_type = "kutsero_president"
                    logger.info(f"Kutsero President profile - city: {profile.get('kpres_city')}, province: {profile.get('kpres_province')}, image: {profile.get('kpres_profile_photo')}")
            except Exception as e:
                logger.error(f"Error checking Kutsero President: {e}")
        
        if user_data:
            logger.info(f"Successfully found user: {user_type}")
            logger.info(f"Profile image URL: {user_data['profile'].get('profile_image')}")
            return Response({
                'success': True,
                'user': user_data,
                'user_type': user_type
            }, status=status.HTTP_200_OK)
        else:
            logger.warning(f"User not found: {user_id}")
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}")
        logger.error(traceback.format_exc())
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)











# ================================================ NOTIFICATION SYSTEM - COMPLETE ================================================

@api_view(['GET'])
def get_operator_notifications(request):
    """
    Fetch all notifications for a horse operator
    Enhanced to show who posted each announcement
    """
    user_id = request.GET.get("user_id")
    
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        all_notifications = []
        
        # ========== 1. FETCH ANNOUNCEMENTS WITH USER INFO ==========
        try:
            announcements_response = service_client.table("announcement").select("*").order(
                "announce_date", desc=True
            ).limit(50).execute()
            
            if announcements_response.data:
                for announcement in announcements_response.data:
                    # Get the user who posted this announcement
                    posted_by_id = (
                        announcement.get("user_id") or 
                        announcement.get("created_by") or 
                        announcement.get("ctu_id") or 
                        announcement.get("dvmf_id")
                    )
                    
                    # Fetch user information
                    poster_name = "Unknown User"
                    poster_role = "User"
                    
                    if posted_by_id:
                        try:
                            # Try CTU user first
                            user_response = service_client.table("ctu_vet_profile").select(
                                "ctu_fname, ctu_lname, ctu_role"
                            ).eq("ctu_id", posted_by_id).execute()
                            
                            if user_response.data and len(user_response.data) > 0:
                                user_info = user_response.data[0]
                                fname = user_info.get("ctu_fname", "").strip()
                                lname = user_info.get("ctu_lname", "").strip()
                                poster_name = f"{fname} {lname}".strip() if (fname or lname) else "CTU User"
                                poster_role = user_info.get("ctu_role", "CTU Veterinarian")
                            else:
                                # Try DVMF user
                                user_response = service_client.table("dvmf_user_profile").select(
                                    "dvmf_fname, dvmf_lname"
                                ).eq("dvmf_id", posted_by_id).execute()
                                
                                if user_response.data and len(user_response.data) > 0:
                                    user_info = user_response.data[0]
                                    fname = user_info.get("dvmf_fname", "").strip()
                                    lname = user_info.get("dvmf_lname", "").strip()
                                    poster_name = f"{fname} {lname}".strip() if (fname or lname) else "DVMF User"
                                    poster_role = "DVMF"
                        except Exception as user_error:
                            logger.warning(f"Error fetching poster info: {user_error}")
                    
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
                                            image_urls.append(f"{settings.SUPABASE_URL}/storage/v1/object/public/announcement-img/{img.strip()}")
                            elif isinstance(announce_img, str) and announce_img.strip():
                                if announce_img.startswith('http'):
                                    image_urls.append(announce_img)
                                else:
                                    image_urls.append(f"{settings.SUPABASE_URL}/storage/v1/object/public/announcement-img/{announce_img.strip()}")
                        except Exception as img_error:
                            logger.warning(f"Error parsing images: {img_error}")
                    
                    # Format announcement date/time
                    announce_date = announcement.get("announce_date") or announcement.get("created_at")
                    formatted_time = format_relative_time(announce_date) if announce_date else "Unknown time"
                    
                    # Format the announcement date for display
                    formatted_date = "Unknown date"
                    if announce_date:
                        try:
                            date_obj = datetime.fromisoformat(str(announce_date).replace('Z', '+00:00'))
                            formatted_date = date_obj.strftime('%B %d, %Y at %I:%M %p')
                        except:
                            formatted_date = str(announce_date)
                    
                    # Determine notification type and priority
                    title = announcement.get("announce_title", "Announcement")
                    content = announcement.get("announce_content", "")
                    
                    notif_type = "system"
                    if any(word in title.lower() or word in content.lower() for word in ['health', 'medical', 'vet', 'disease']):
                        notif_type = "health"
                    elif any(word in title.lower() or word in content.lower() for word in ['reminder', 'schedule', 'appointment']):
                        notif_type = "reminder"
                    
                    priority = "medium"
                    if any(word in title.lower() or word in content.lower() for word in ['urgent', 'important', 'critical', 'emergency']):
                        priority = "high"
                    elif any(word in title.lower() or word in content.lower() for word in ['info', 'notice', 'update']):
                        priority = "low"
                    
                    # Create notification with "User has a new post" format
                    all_notifications.append({
                        "id": str(announcement.get("announce_id")),
                        "notification_id": str(announcement.get("announce_id")),
                        "title": f"{poster_name} has a new post",  # NEW FORMAT
                        "message": title,  # Show announcement title as message
                        "announcement_title": title,  # Keep original title
                        "announcement_content": content,  # Keep full content
                        "time": formatted_time,
                        "formatted_date": formatted_date,  # Full date with time
                        "posted_by": poster_name,  # Who posted it
                        "posted_by_role": poster_role,  # Their role
                        "type": notif_type,
                        "priority": priority,
                        "read": False,
                        "image_urls": image_urls if image_urls else None,
                        "created_at": announce_date,
                        "source": "announcement"
                    })
                
                logger.info(f"✅ Found {len(announcements_response.data)} announcements")
        except Exception as announce_error:
            logger.error(f"Error fetching announcements: {announce_error}", exc_info=True)
        
        # ========== 2. FETCH APPOINTMENT NOTIFICATIONS (Keep existing code) ==========
        try:
            appointments_response = service_client.table("appointment").select("*").eq(
                "user_id", user_id
            ).order("updated_at", desc=True).limit(20).execute()
            
            if appointments_response.data:
                for appointment in appointments_response.data:
                    app_status = appointment.get("app_status", "pending")
                    
                    if app_status in ["approved", "declined", "completed"]:
                        vet_name = "Veterinarian"
                        vet_id = appointment.get("vet_id")
                        if vet_id:
                            try:
                                vet_data = service_client.table("vet_profile").select(
                                    "vet_fname, vet_lname"
                                ).eq("vet_id", vet_id).execute()
                                if vet_data.data:
                                    vet_info = vet_data.data[0]
                                    vet_name = f"{vet_info['vet_fname']} {vet_info['vet_lname']}"
                            except:
                                pass
                        
                        horse_name = "your horse"
                        horse_id = appointment.get("horse_id")
                        if horse_id:
                            try:
                                horse_data = service_client.table("horse_profile").select(
                                    "horse_name"
                                ).eq("horse_id", horse_id).execute()
                                if horse_data.data:
                                    horse_name = horse_data.data[0].get("horse_name", "your horse")
                            except:
                                pass
                        
                        if app_status == "approved":
                            title = "✅ Appointment Approved"
                            message = f"Your appointment with {vet_name} for {horse_name} on {appointment.get('app_date', 'scheduled date')} has been approved!"
                            notif_type = "appointment"
                            priority = "high"
                        elif app_status == "declined":
                            title = "❌ Appointment Declined"
                            message = f"Your appointment with {vet_name} for {horse_name} has been declined."
                            if appointment.get("decline_reason"):
                                message += f"\n\nReason: {appointment['decline_reason']}"
                            notif_type = "appointment"
                            priority = "high"
                        elif app_status == "completed":
                            title = "✓ Appointment Completed"
                            message = f"Your appointment with {vet_name} for {horse_name} has been completed."
                            notif_type = "activity"
                            priority = "medium"
                        
                        updated_at = appointment.get("updated_at") or appointment.get("created_at")
                        formatted_time = format_relative_time(updated_at) if updated_at else "Unknown time"
                        
                        all_notifications.append({
                            "id": f"appointment_{appointment.get('app_id')}",
                            "notification_id": f"appointment_{appointment.get('app_id')}",
                            "title": title,
                            "message": message,
                            "time": formatted_time,
                            "type": notif_type,
                            "priority": priority,
                            "read": False,
                            "created_at": updated_at,
                            "source": "appointment",
                            "related_id": appointment.get("app_id"),
                            "screen_route": "Hcalendar",
                            "params": {"from_notification": "true"}
                        })
                
                logger.info(f"✅ Found {len(appointments_response.data)} appointment notifications")
        except Exception as appt_error:
            logger.error(f"Error fetching appointment notifications: {appt_error}", exc_info=True)
        
        # Sort by creation time (most recent first)
        all_notifications.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        logger.info(f"✅ Returning {len(all_notifications)} total notifications")
        
        return Response({
            "notifications": all_notifications,
            "total_count": len(all_notifications),
            "message": f"Found {len(all_notifications)} notification(s)"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"❌ Error fetching notifications: {e}", exc_info=True)
        return Response({
            "error": "Failed to fetch notifications",
            "detail": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mark_notification_as_read(request):
    """
    Mark a specific notification as read
    """
    notification_id = request.data.get("notification_id")
    user_id = request.data.get("user_id")
    
    if not notification_id or not user_id:
        return Response({
            "error": "notification_id and user_id are required"
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Update notification
        update_result = service_client.table("notifications").update({
            "is_read": True,
            "read_at": datetime.now(pytz.UTC).isoformat()
        }).eq("id", notification_id).eq("user_id", user_id).execute()
        
        if not update_result.data:
            return Response({
                "error": "Notification not found or already updated"
            }, status=status.HTTP_404_NOT_FOUND)
        
        logger.info(f"✅ Marked notification {notification_id} as read for user {user_id}")
        
        return Response({
            "message": "Notification marked as read",
            "notification_id": notification_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def mark_all_notifications_read(request):
    """
    Mark all notifications as read for a user
    """
    user_id = request.data.get("user_id")
    
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        current_timestamp = datetime.now(pytz.UTC).isoformat()
        
        # Update all unread notifications
        update_result = service_client.table("notifications").update({
            "is_read": True,
            "read_at": current_timestamp
        }).eq("user_id", user_id).eq("is_read", False).execute()
        
        updated_count = len(update_result.data) if update_result.data else 0
        
        logger.info(f"✅ Marked {updated_count} notifications as read for user {user_id}")
        
        return Response({
            "message": f"Marked {updated_count} notification(s) as read",
            "updated_count": updated_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_notification(request, notification_id):
    """
    Delete a specific notification
    """
    user_id = request.data.get("user_id") or request.GET.get("user_id")
    
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Delete notification
        delete_result = service_client.table("notifications").delete().eq(
            "id", notification_id
        ).eq("user_id", user_id).execute()
        
        if not delete_result.data:
            return Response({
                "error": "Notification not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        logger.info(f"✅ Deleted notification {notification_id} for user {user_id}")
        
        return Response({
            "message": "Notification deleted successfully",
            "notification_id": notification_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_unread_notification_count(request):
    """
    Get count of unread notifications for a user
    """
    user_id = request.GET.get("user_id")
    
    if not user_id:
        return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Count unread notifications
        count_result = service_client.table("notifications").select(
            "id", count="exact"
        ).eq("user_id", user_id).eq("is_read", False).execute()
        
        unread_count = count_result.count if count_result.count is not None else 0
        
        return Response({
            "user_id": user_id,
            "unread_count": unread_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        return Response({
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ================================================ NOTIFICATION  ================================================

