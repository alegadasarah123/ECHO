from django.contrib import admin
from django.urls import path
from api import views

urlpatterns = [
   path("signup/", views.signup, name="signup"),
    path('login/', views.login, name='login'),
    path('get-data/', views.get_data, name='get_data'),
    path('insert-ctu-vet-profile/', views.insert_ctu_vet_profile, name='insert_vet_profile'),
    path('get-users/', views.get_users, name='get_users'),
]
