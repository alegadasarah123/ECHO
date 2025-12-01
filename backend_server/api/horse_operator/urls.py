from django.urls import path
from . import views

urlpatterns = [ 
    # ============== HORSE OPERATOR PROFILE ==============
    path('get_horse_operator_profile/', views.get_horse_operator_profile, name='get_horse_operator_profile'),
    path('update_horse_operator_profile/', views.update_horse_operator_profile, name='update_horse_operator_profile'),


    # ============== HORSE PROFILE MANAGEMENT ==============
    path('get_horse_operator_data/', views.get_horse_operator_data, name='get_horse_operator_data'),
    path('add_horse/', views.add_horse, name='add_horse'),
    path('get_horses/', views.get_horses, name='get_horses'),
    path('mark_horse_deceased/<str:horse_id>/', views.mark_horse_deceased, name='mark_horse_deceased'),
    path('update_horse/<str:horse_id>/', views.update_horse, name='update_horse'),
    path('delete_horse_image/<str:horse_id>/', views.delete_horse_image, name='delete_horse_image'),
    

    # ============== FEEDING SCHEDULE ==============
    path('get_feeding_schedule/', views.get_feeding_schedule, name='get_feeding_schedule'),
    path('save_feeding_schedule/', views.save_feeding_schedule, name='save_feeding_schedule'),
    path('mark_meal_fed/', views.mark_meal_fed, name='mark_meal_fed'),
    path('get_feed_logs/', views.get_feed_logs, name='get_feed_logs'),
    path('clear_feed_logs/', views.clear_feed_logs, name='clear_feed_logs'),
    path('reset_daily_feeds/', views.reset_daily_feeds, name='reset_daily_feeds'),
    path('delete_feed_schedule/', views.delete_feed_schedule, name='delete_feed_schedule'),
    

    # ============== WATERING SCHEDULE ==============
    path('get_watering_schedule/', views.get_watering_schedule, name='get_watering_schedule'),
    path('save_watering_schedule/', views.save_watering_schedule, name='save_watering_schedule'),
    path('mark_water_given/', views.mark_water_given, name='mark_water_given'),
    path('reset_daily_watering/', views.reset_daily_watering, name='reset_daily_watering'),
    path('get_water_logs/', views.get_water_logs, name='get_water_logs'),
    path('clear_water_logs/', views.clear_water_logs, name='clear_water_logs'),
    path('delete_water_schedule/', views.delete_water_schedule, name='delete_water_schedule'),
    

    # ============== VETERINARIAN ==============
    path('get_veterinarians/', views.get_veterinarians, name='get_veterinarians'),
    path('get_vet_profile/', views.get_vet_profile, name='get_vet_profile'),
    path('get_vet_schedule/', views.get_vet_schedule, name='get_vet_schedule'),
    path('get_vet_base_schedule/', views.get_vet_base_schedule, name='get_vet_base_schedule'),
    path('get_vet_appointment_slots/', views.get_vet_appointment_slots, name='get_vet_appointment_slots'),
    path('check_schedule_availability/', views.check_schedule_availability, name='check_schedule_availability'),
    path('cleanup_past_schedules/', views.cleanup_past_schedules, name='cleanup_past_schedules'),


    # ============== MESSAGING API ==============
    path('conversations/', views.conversations, name='conversations'),  # ✅ FIXED: matches frontend call
    path('get_messages/', views.get_messages, name='get_messages'),
    path('send_message/', views.send_message, name='send_message'),
    path('available_users/', views.available_users, name='available_users'),
    path('delete_conversation/', views.delete_conversation, name='delete_conversation'),  # ✅ ADD THIS

    # Debugging / Admin helper
    path('debug_user_lookup/', views.debug_user_lookup, name='debug_user_lookup'),


    # ============== APPOINTMENTS ==============
    path('book_appointment/', views.book_appointment, name='book_appointment'),
    path('get_appointments/', views.get_appointments, name='get_appointments'),
    path('cancel_appointment/<str:app_id>/', views.cancel_appointment, name='cancel_appointment'),
    path('delete_appointment/<str:app_id>/', views.delete_appointment, name='delete_appointment'),
    path('delete_appointment_permanently/<str:app_id>/', views.delete_appointment_permanently, name='delete_appointment_permanently'),
    path('check_reschedule_eligibility/', views.check_reschedule_eligibility, name='check_reschedule_eligibility'),
    path('reschedule_appointment/', views.reschedule_appointment, name='reschedule_appointment'),
    path('bulk_release_schedules/', views.bulk_release_schedules, name='bulk_release_schedules'),
    path('bulk_delete_old_cancelled_appointments/', views.bulk_delete_old_cancelled_appointments, name='bulk_delete_old_cancelled_appointments'),
    path('update_appointment_status/<str:app_id>/', views.update_appointment_status, name='update_appointment_status'),
    

    # ============== ANNOUNCEMENTS ==============
    path('get_announcements/', views.get_announcements, name='get_announcements'),

    # User Posts/Announcements
    path('get_user_posts/<str:user_id>/', views.get_user_posts, name='get_user_posts'),

    # ============== COMMENTS & REPLIES ==============
    path('get_announcement_comments/', views.get_announcement_comments, name='get_announcement_comments'),
    path('add_comment/', views.add_comment, name='add_comment'),
    path('get_comment_count/', views.get_comment_count, name='get_comment_count'),
    
    # ✅ NEW: Reply endpoints
    path('add_comment_reply/', views.add_comment_reply, name='add_comment_reply'),
    path('get_comment_replies/', views.get_comment_replies, name='get_comment_replies'),


    # ============== HORSE ASSIGNMENTS ==============
    path('get_horse_assignments/', views.get_horse_assignments, name='get_horse_assignments'),


    # ============== MEDICAL RECORDS ==============
    path('get_horse_medical_records/', views.get_horse_medical_records, name='get_horse_medical_records'),
    path('get_medical_record_details/', views.get_medical_record_details, name='get_medical_record_details'),
    path('get_medical_records_summary/', views.get_medical_records_summary, name='get_medical_records_summary'),
    path('get_medical_record_treatments/', views.get_medical_record_treatments, name='get_medical_record_treatments'),


    # ============== SOS EMERGENCY ==============
    path('sos/create/', views.create_sos_request, name='create_sos_request'),
    path('sos/requests/', views.get_sos_requests, name='get_sos_requests'),
    path('sos/details/<str:sos_id>/', views.get_sos_details, name='get_sos_details'),
    path('sos/update-status/<str:sos_id>/', views.update_sos_status, name='update_sos_status'),
        

    # ============== AI ASSISTANT ENDPOINTS ==============
    path('ai_assistant/', views.ai_assistant, name='ai_assistant'),
    path('get_chat_history/', views.get_chat_history, name='get_chat_history'),


    # ============== CONTACT API ==============
    path('get_all_kutseros/', views.get_all_kutseros, name='get_all_kutseros'),
    path('get_all_operators/', views.get_all_operators, name='get_all_operators'),
    path('get_all_dvmf/', views.get_all_dvmf, name='get_all_dvmf'),
    path('get_all_ctu_vet/', views.get_all_ctu_vet, name='get_all_ctu_vet'),
    path('get_all_kut_pres/', views.get_all_kut_pres, name='get_all_kut_pres'),


    # ========== ENHANCED SEARCH ENDPOINTS ==========
    path('search_users_by_name/', views.search_users_by_name, name='search_users_by_name'),
    path('get_users_by_role/', views.get_users_by_role, name='get_users_by_role'),
    path('get_user_profile_by_id/', views.get_user_profile_by_id, name='get_user_profile_by_id'),
    path('get_vet_schedule_for_profile/', views.get_vet_schedule_for_profile, name='get_vet_schedule_for_profile'),
    path('get_user_profile/<str:user_id>', views.get_user_profile, name='get_user_profile'),
    path('get_user_profile/<str:user_id>/', views.get_user_profile, name='get_user_profile_with_slash'),


    # Forgot Password endpoints
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/', views.reset_password, name='reset_password'),
    path('change_password/', views.change_password, name='change_password'),


    # VET SERVICES
    path('get_vet_services/', views.get_vet_services, name='get_vet_services'),


    #Reminders and Notifications
    path('feed-water-notifications/', views.feed_water_notifications, name='feed_water_notifications'),
    path('check-current-schedules/', views.check_current_schedules, name='check_current_schedules'),

]