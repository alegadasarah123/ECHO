from django.contrib import admin
from django.urls import path, include

urlpatterns = [
   
    path('ctu_vetmed/', include('api.ctu_vetmed.urls')),  # 👈 include your app’s urls here
]
