from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Custom error handlers
# Note: Django only recognizes handler400/403/404/500 names. We point handler404
# to our custom view which (per user request) returns HTTP 402 and renders a page.
handler404 = 'invest_backend.views.custom_404'
