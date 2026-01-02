from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import AuthenticationFailed


class OptionalJWTAuthentication(JWTAuthentication):
    """JWT authentication that treats invalid tokens as absent.

    If the request includes an invalid/expired token, this class returns
    ``None`` instead of raising an authentication error. This allows
    public endpoints (permission_classes = [AllowAny]) to work even when
    a stale/invalid token is sent by the client.
    """

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (AuthenticationFailed, InvalidToken, TokenError):
            return None
