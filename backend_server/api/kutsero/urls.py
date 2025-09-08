# urls.py - Kutsero app URLs
from django.urls import path
from . import views

urlpatterns = [
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
    path('feeds/<str:user_id>/<str:horse_id>/', views.get_feeds, name='get_feeds'),
    path('feeds/create-multiple/', views.create_multiple_feeds, name='create_multiple_feeds'),
    path('feeds/complete/<str:feed_id>/', views.mark_feed_completed, name='mark_feed_completed'),
    path('feeds/clear/<str:user_id>/<str:horse_id>/<str:meal_type>/', views.clear_meal_feeds, name='clear_meal_feeds'),
    path('feeds/delete/<str:feed_id>/', views.delete_feed, name='delete_feed'),
    path('feeds/log/<str:user_id>/<str:horse_id>/', views.get_feed_log, name='get_feed_log'),
    path('feeds/statistics/<str:user_id>/<str:horse_id>/', views.get_feed_statistics, name='get_feed_statistics'),
    path('feeds/bulk-update/', views.bulk_update_feeds, name='bulk_update_feeds'),

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
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
]