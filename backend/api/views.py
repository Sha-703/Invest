from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from rest_framework import viewsets, permissions, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import MarketOffer, Wallet, Transaction, Deposit, Profile
from .serializers import (
    MarketOfferSerializer,
    WalletSerializer,
    TransactionSerializer,
    DepositSerializer,
    UserSerializer,
)

User = get_user_model()


class MarketOfferViewSet(viewsets.ModelViewSet):
    queryset = MarketOffer.objects.all().order_by('-created_at')
    serializer_class = MarketOfferSerializer
    permission_classes = [AllowAny]


class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # limit transactions to wallets owned by the user
        return Transaction.objects.filter(wallet__user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        wallet = serializer.validated_data.get('wallet')
        # basic ownership check
        if wallet.user != self.request.user:
            raise PermissionError('Cannot create transactions for another user')
        serializer.save()

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def sell(self, request):
        # expected payload: { offer_id, amount, currency, otp? }
        data = request.data
        offer_id = data.get('offer_id')
        amount = data.get('amount')
        currency = data.get('currency')

        if not offer_id or not amount or not currency:
            return Response({'message': 'offer_id, amount and currency are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Very simple flow: create a Transaction with type 'trade' and return it.
        # In real app, we'd validate offer, balances, OTP, provider logic, etc.
        try:
            wallet = Wallet.objects.filter(user=request.user, currency=currency).first()
            if not wallet:
                return Response({'message': 'Wallet not found for currency'}, status=status.HTTP_404_NOT_FOUND)

            tx = Transaction.objects.create(wallet=wallet, amount=amount, type='trade')
            return Response(TransactionSerializer(tx).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DepositViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DepositSerializer

    @action(detail=False, methods=['post'], url_path='initiate')
    def initiate(self, request):
        # expected payload: { method, amount, currency }
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'XAF')
        if not amount:
            return Response({'message': 'amount is required'}, status=status.HTTP_400_BAD_REQUEST)

        deposit = Deposit.objects.create(user=request.user, amount=amount, currency=currency, status='pending')
        # Simulate external provider instructions
        instructions = {'provider': 'mock', 'payment_address': 'mock_address', 'deposit_id': str(deposit.id)}
        return Response({'deposit_id': deposit.id, 'instructions': instructions, 'status': deposit.status})

    @action(detail=True, methods=['get'], url_path='status')
    def status(self, request, pk=None):
        try:
            deposit = Deposit.objects.get(pk=pk, user=request.user)
            return Response({'deposit_id': deposit.id, 'status': deposit.status})
        except Deposit.DoesNotExist:
            return Response({'message': 'not found'}, status=status.HTTP_404_NOT_FOUND)


def set_refresh_cookie(response, refresh_token):
    # set refresh token as httpOnly secure cookie (secure=False for dev)
    response.set_cookie('refresh', refresh_token, httponly=True, secure=False, samesite='Lax')
    return response


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get('identifier')
        password = request.data.get('password')
        if not identifier or not password:
            return Response({'message': 'identifier and password required'}, status=status.HTTP_400_BAD_REQUEST)

        # try username then email
        user = None
        try:
            user = User.objects.get(username=identifier)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email=identifier)
            except User.DoesNotExist:
                user = None

        if user is None or not user.check_password(password):
            return Response({'message': 'invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        user_data = UserSerializer(user).data
        resp = Response({'user': user_data, 'access_token': access_token})
        set_refresh_cookie(resp, refresh_token)
        return resp


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get('name')
        email = request.data.get('email')
        phone = request.data.get('phone')
        password = request.data.get('password')

        if not name or not password:
            return Response({'message': 'name and password required'}, status=status.HTTP_400_BAD_REQUEST)

        username = email or name
        if User.objects.filter(username=username).exists():
            return Response({'message': 'user exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, first_name=name, email=email)
        user.set_password(password)
        user.save()

        # create profile
        Profile.objects.create(user=user, phone=phone)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        user_data = UserSerializer(user).data
        resp = Response({'user': user_data, 'access_token': access_token})
        set_refresh_cookie(resp, refresh_token)
        return resp


class RefreshTokenFromCookieView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get('refresh')
        if not refresh_token:
            return Response({'message': 'no refresh token'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            token = RefreshToken(refresh_token)
            access = str(token.access_token)
            return Response({'access_token': access})
        except Exception as e:
            return Response({'message': 'invalid token'}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        resp = Response({'message': 'logged out'})
        # delete cookie
        resp.delete_cookie('refresh')
        return resp
