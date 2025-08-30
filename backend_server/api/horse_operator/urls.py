from django.urls import path
from . import views    # <- don’t forget this

urlpatterns = [
    path('get_horse_operator_data/', views.get_horse_operator_data, name='get_horse_operator_data'),
    path('add_horse/', views.add_horse, name='add_horse'),
    path('get_horses/', views.get_horses, name='get_horses'),
    path('delete_horse/<str:horse_id>/', views.delete_horse, name='delete_horse'),  
    path('get_feeding_schedule/', views.get_feeding_schedule, name='get_feeding_schedule'),
    path('save_feeding_schedule/', views.save_feeding_schedule, name='save_feeding_schedule'),
    path('mark_meal_fed/', views.mark_meal_fed, name='mark_meal_fed'),
    path('add_feed_log_entry/', views.add_feed_log_entry, name='add_feed_log_entry'),
    path('get_feed_logs/', views.get_feed_logs, name='get_feed_logs'),
    path('reset_daily_feeds/', views.reset_daily_feeds, name='reset_daily_feeds'),
]