from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('api/kutsero/', include('api.kutsero.urls')),  # Important
]
