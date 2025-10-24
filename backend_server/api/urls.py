
from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('kutsero_president/', include('api.kutsero_president.urls')),
    path('veterinarian/', include('api.veterinarian.urls')),
    path('api/kutsero/', include('api.kutsero.urls')),
    path('api/horse_operator/', include('api.horse_operator.urls')), 
    path('psgc/', views.psgc_proxy, name='psgc-proxy'),
    path('psgc-fallback/', views.psgc_fallback, name='psgc-fallback'),
    path('api/login/', views.login, name='login'),
    path('api/check-email/', views.check_email, name='check_email'),
    path('api/signup_vet/', views.signup_vet, name='signup_vet'),
    path('api/signup_mobile/', views.signup_mobile, name='signup_mobile'),
    path('api/login_mobile/', views.login_mobile, name='login_mobile'),
    path('api/update_user_status/', views.update_user_status, name='update_user_status'),
    path("api/forgot-password/", views.forgot_password, name="forgot-password"),
    path("api/reset-password/", views.reset_password, name="reset-password"),

]
   



