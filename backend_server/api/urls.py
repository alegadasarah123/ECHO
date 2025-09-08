
from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('kutsero_president/', include('api.kutsero_president.urls')),
    path('veterinarian/', include('api.veterinarian.urls')),
    path('api/kutsero/', include('api.kutsero.urls')),
    path('api/horse_operator/', include('api.horse_operator.urls')), 
    path('api/login/', views.login, name='login'),
    path('api/signup_vet/', views.signup_vet, name='signup_vet'),
    path('api/signup_mobile/', views.signup_mobile, name='signup_mobile'),
    path('api/login_mobile/', views.login_mobile, name='login_mobile'),
    path('api/update_user_status/', views.update_user_status, name='update_user_status'),
]
   



