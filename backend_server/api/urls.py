from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('api/kutsero/', include('api.kutsero.urls')),
    path('api/horse_operator/', include('api.horse_operator.urls')), 
    path('api/login/', views.login, name='login'),  # Add api/ here
    path('api/signup/', views.signup, name='signup'),
    path('api/get_data/', views.get_data, name='get_data'),
    path('api/insert_vet_profile/', views.insert_vet_profile, name='insert_vet_profile'),
    path('api/get_kutsero_data', views.get_kutsero_data, name='get_kutsero_data'),
    path('api/insert_kutsero_profile', views.insert_kutsero_profile, name='insert_kutsero_profile'),
    path('api/signup_mobile', views.signup_kutsero, name='signup_kutsero'),
    path('api/login_mobile', views.login_mobile, name='login_mobile')
    path('api/update_user_status', views.update_user_status, name='update_user_status')
]


