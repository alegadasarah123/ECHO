
from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [

    path('api/kutsero/', include('api.kutsero.urls')),
    path('api/horse_operator/', include('api.horse_operator.urls')), 
    path('api/login/', views.login, name='login'),
    path('api/signup/', views.signup, name='signup'),
    path('api/get_data/', views.get_data, name='get_data'),
    path('api/insert_vet_profile/', views.insert_vet_profile, name='insert_vet_profile'),
    path('kutsero_president/', include('api.kutsero_president.urls')),
    path('api/signup_mobile/', views.signup_mobile, name='signup_mobile'),
    path('api/login_mobile/', views.login_mobile, name='login_mobile'),
    path('api/update_user_status/', views.update_user_status, name='update_user_status'),
  
    

]
   



