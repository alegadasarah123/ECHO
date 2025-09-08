from django.urls import path
from . import views    # <- don't forget this

urlpatterns = [
    path('get_horse_operator_data/', views.get_horse_operator_data, name='get_horse_operator_data'),
    path('add_horse/', views.add_horse, name='add_horse'),
    path('get_horses/', views.get_horses, name='get_horses'), 
    path('save_feeding_schedule/', views.save_feeding_schedule, name='save_feeding_schedule'),
    path('mark_meal_fed/', views.mark_meal_fed, name='mark_meal_fed'),
    path('get_feed_logs/', views.get_feed_logs, name='get_feed_logs'),
    path('get_veterinarians/', views.get_veterinarians, name='get_veterinarians'),
    path('get_chat_messages/', views.get_chat_messages, name='get_chat_messages'),
    path('send_chat_message/', views.send_chat_message, name='send_chat_message'),
    path('get_conversations/', views.get_conversations, name='get_conversations'),
    path('book_appointment/', views.book_appointment, name='book_appointment'),
    path('get_appointments/', views.get_appointments, name='get_appointments'),
    path('update_appointment/<uuid:app_id>/', views.update_appointment, name='update_appointment'),
    path('cancel_appointment/<uuid:app_id>/', views.cancel_appointment, name='cancel_appointment'),
]