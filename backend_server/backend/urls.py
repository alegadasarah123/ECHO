from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/kutsero/', include('api.kutsero.urls')),  
    path('api/ctu_vetmed/', include('api.ctu_vetmed.urls')),
    path('api/dvmf/', include('api.dvmf.urls')),
    path('', include('api.urls')),
    path("api/kutsero_president/", include("api.kutsero_president.urls")),
    path('api/horse_operator/', include('api.horse_operator.urls')), 
    path("api/veterinarian/", include("api.veterinarian.urls"))

]