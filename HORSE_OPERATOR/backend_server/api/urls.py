
from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('login/', views.login, name='login'), 
    path('operator_profile/', views.insert_operator_profile, name='insert_operator_profile'),
    path('get_data/', views.get_data, name='get_data'),
]
