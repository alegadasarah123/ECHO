from django.contrib import admin
from django.urls import path, include

urlpatterns = [
   
    path('ctu_vetmed/', include('api.ctu_vetmed.urls')),  # 👈 include your app’s urls here
    path('admin/', admin.site.urls),
    path('api/kutsero/', include('api.kutsero.urls')),  # include kutsero app URLs here
    path('admin/', admin.site.urls),
    path('api/kutsero/', include('api.kutsero.urls')),  # include kutsero app URLs here
]

