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
    
    # Feed management endpoints
    path('get_feeding_schedule/', views.get_feeding_schedule, name='get_feeding_schedule'),
    path('save_feeding_schedule/', views.save_feeding_schedule, name='save_feeding_schedule'),
    path('mark_meal_fed/', views.mark_meal_fed, name='mark_meal_fed'),
    path('get_feeding_log/', views.get_feeding_log, name='get_feeding_log'),


     # Get single kutsero profile by kutsero_id (string identifier)
    path('profile/<str:kutsero_id>/', views.get_kutsero_profile, name='get_kutsero_profile'),
    
    # Create new kutsero profile
    path('profile/create/', views.create_kutsero_profile, name='create_kutsero_profile'),
    
    # Update kutsero profile by kutsero_id 
    path('profile/<str:kutsero_id>/update/', views.update_kutsero_profile, name='update_kutsero_profile'),
    
    # Get all kutsero profiles
    path('profiles/', views.get_all_kutsero_profiles, name='get_all_kutsero_profiles'),
    
    # Search kutsero profiles
    path('profiles/search/', views.search_kutsero_profiles, name='search_kutsero_profiles'),

    # Horse Assignment URLs
    path('assignments/assign/', views.assign_horse, name='assign_horse'),
    path('assignments/kutsero/<str:kutsero_id>/', views.get_user_assignments, name='get_user_assignments'),
    path('assignments/kutsero/<str:kutsero_id>/current/', views.get_current_assignment, name='get_current_assignment'),
    path('assignments/kutsero/<str:kutsero_id>/history/', views.get_horse_assignment_history, name='get_assignment_history'),
    path('assignments/kutsero/<str:kutsero_id>/statistics/', views.get_assignment_statistics, name='get_assignment_statistics'),
    path('assignments/<int:assign_id>/status/', views.update_assignment_status, name='update_assignment_status'),
    path('assignments/<int:assign_id>/cancel/', views.cancel_assignment, name='cancel_assignment'),
    
    # Check-in/Check-out URLs
    path('assignments/checkin/', views.check_in_horse, name='check_in_horse'),
    path('assignments/checkout/', views.check_out_horse, name='check_out_horse'),

    # Announcements
    # Announcements
    path('announcements/', views.get_announcements, name='get_announcements'),
    path('announcements/<str:announcement_id>/comments/', views.announcement_comments_handler, name='announcement_comments'),

    # Calendar endpoints
    path('get-calendar-events/', views.get_calendar_events, name='get_calendar_events'),
    path('create-calendar-event/', views.create_calendar_event, name='create_calendar_event'),
    path('delete-calendar-event/<int:pk>/', views.delete_calendar_event, name='delete_calendar_event'),


     path("sos/create/", views.create_sos_request, name="create_sos_request"),

     path('debug/urls/', views.debug_urls, name='debug_urls'),
]



