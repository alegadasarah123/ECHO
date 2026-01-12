# urls.py - Kutsero app URLs
from django.urls import path
from . import views

urlpatterns = [
    # Test connection
    path('test/', views.test_connection, name='test_connection'),
    
    # Horse assignment endpoints
    path('available_horses/', views.available_horses, name='available_horses'),
    path('assign_horse/', views.assign_horse, name='assign_horse'),
    path('current_assignment/', views.current_assignment, name='current_assignment'),
    path('checkout/', views.checkout, name='checkout'),
    path('unassign_horse/', views.unassign_horse, name='unassign_horse'),  # Backward compatibility
    path('assignment_history/', views.get_assignment_history, name='get_assignment_history'),
    
     # Feeding and Watering Schedule Endpoints
    path('feed_schedule/', views.get_feed_schedule, name='feed_schedule'),
    path('water_schedule/', views.get_water_schedule, name='water_schedule'),
    path('today_schedule/', views.get_today_schedule, name='today_schedule'),
    path('complete_feed/', views.mark_feed_completed, name='complete_feed'),
    path('complete_water/', views.mark_water_completed, name='complete_water'),

     # Get single kutsero profile by kutsero_id (string identifier) 

    path('profile/<str:kutsero_id>/', views.kutsero_profile, name='kutsero_profile'),
    
    # Create new kutsero profile
    path('profile/create/', views.create_kutsero_profile, name='create_kutsero_profile'),
    
    
    # Get all kutsero profiles
    path('profiles/', views.get_all_kutsero_profiles, name='get_all_kutsero_profiles'),
    
    # Search kutsero profiles
    path('profiles/search/', views.search_kutsero_profiles, name='search_kutsero_profiles'),

    # Announcements
    # Announcements
    path('announcements/', views.get_announcements, name='get_announcements'),
    path('announcements/<str:announcement_id>/comments/', views.announcement_comments_handler, name='announcement_comments'),
    path('comments/<str:comment_id>/replies/', views.get_comment_replies, name='get_comment_replies'),

    # Calendar endpoints
    path('get-calendar-events/', views.get_calendar_events, name='get_calendar_events'),
    path('create-calendar-event/', views.create_calendar_event, name='create_calendar_event'),
    path('delete-calendar-event/<int:event_id>/', views.delete_calendar_event, name='delete_calendar_event'),

    # SOS endpoints
    path('sos/create/', views.create_sos_request, name='create_sos_request'),
    path('sos/list/', views.list_sos_requests, name='list_sos_requests'),
    path('sos/<str:sos_id>/', views.get_sos_request_detail, name='get_sos_request_detail'),
    

    path('debug/urls/', views.debug_urls, name='debug_urls'),

    path('ai_assistant/', views.ai_assistant, name='ai_assistant'),
    path('get_chat_history/', views.get_chat_history, name='get_chat_history'),

    # Messaging endpoints
    path('conversations/', views.conversations, name='conversations'),
    path('available_users/', views.available_users, name='available_users'),
    path('get_messages/', views.get_messages, name='get_messages'),
    path('send_message/', views.send_message, name='send_message'),
    
    path('debug_user_lookup/', views.debug_user_lookup, name='debug_user_lookup'),

    # Profile endpoints
    path('get_user_profile/<str:user_id>/', views.get_user_profile, name='get_user_profile'),

    # Search endpoint
    path('search_all_users/', views.search_all_users, name='search_all_users'),
    path('get_all_users/', views.get_all_users, name='get_all_users'),
    path('get_user_announcements/<str:user_id>/', views.get_user_announcements, name='get_user_announcements'),

    # Forgot Password endpoints
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/', views.reset_password, name='reset_password'),

    #Reminders and Notifications
    path('feed-water-notifications/', views.feed_water_notifications, name='feed_water_notifications'),
    path('check-current-schedules/', views.check_current_schedules, name='check_current_schedules'),

    #Horse Application Endpoints
    path('horse_owners/', views.get_horse_owners, name='get_horse_owners'),
    path('apply_to_owner/', views.apply_to_owner, name='apply_to_owner'),
    path('my_applications/', views.get_my_applications, name='get_my_applications'),
    path('get_approved_owners_horses/', views.get_approved_owners_horses, name='get_approved_owners_horses'),
    path('assign_horse_to_kutsero/', views.assign_horse_to_kutsero, name='assign_horse_to_kutsero'),
    path('check_in_horse/', views.check_in_horse, name='check_in_horse'),
    path('check_out_horse/', views.check_out_horse, name='check_out_horse'),
    path('current_assignment/', views.current_assignment, name='current_assignment'),
    path('test/', views.test_horse_owners_endpoint, name='test_endpoint'),


]




