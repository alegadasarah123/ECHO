from django.contrib import admin
from django.urls import path, include
from . import views


urlpatterns = [
    path('api/kutsero/', include('api.kutsero.urls')), 
    path('api/ctu_vetmed/', include('api.ctu_vetmed.urls')), 
    path('api/login/', views.login, name='login'),  # Add api/ here
    path('api/signup/', views.signup, name='signup'),
    path('api/get_data/', views.get_data, name='get_data'),
    path('api/insert_vet_profile/', views.insert_vet_profile, name='insert_vet_profile'),
    
    
]


