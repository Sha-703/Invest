from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # serve a simple favicon during development
    path('favicon.ico', RedirectView.as_view(url='/static/favicon.svg')),
    path('api/', include('api.urls')),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Custom error handlers
# Use the standard 404 page (status=404) to render a structured page for missing routes.
handler404 = 'invest_backend.views.custom_404_standard'
