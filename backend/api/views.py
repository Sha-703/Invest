from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from rest_framework import viewsets, permissions, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Count, Avg, Max, Sum, Q
import logging

logger = logging.getLogger(__name__)


def compute_vip_level(total_invested):
    """Compute VIP level using doubling thresholds starting at a base value.

    By default: VIP1 = 25_000, VIP2 = 50_000, VIP3 = 100_000, etc.
    Returns integer level (0 for none).
    """
    from decimal import Decimal
    base = Decimal(getattr(settings, 'VIP_FIRST_THRESHOLD', 25000))
    if total_invested is None:
        return 0
    try:
        t = Decimal(str(total_invested))
    except Exception:
        return 0

    level = 0
    threshold = base
    while t >= threshold:
        level += 1
        threshold = threshold * Decimal(2)
    return level

from .models import MarketOffer, Wallet, Transaction, Deposit, Investor, Trade, HiddenOffer
from .utils import recompute_vip_for_user
from .models import ReferralCode, Referral
from .serializers import (
    MarketOfferSerializer,
    TradeSerializer,
    ReferralCodeSerializer,
    ReferralSerializer,
    WalletSerializer,
    TransactionSerializer,
    DepositSerializer,
    UserSerializer,
    InvestmentSerializer,
)

User = get_user_model()


class MarketOfferViewSet(viewsets.ModelViewSet):
    serializer_class = MarketOfferSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = MarketOffer.objects.all().order_by('-created_at')
        # optional filters via query params
        status = self.request.query_params.get('status')
        source = self.request.query_params.get('source')
        seller = self.request.query_params.get('seller')
        if status:
            qs = qs.filter(status=status)
        if source:
            qs = qs.filter(source=source)
        if seller:
            # allow numeric user id or username
            if seller.isdigit():
                qs = qs.filter(seller__id=int(seller))
            else:
                qs = qs.filter(seller__username__iexact=seller)
        # If the request is authenticated, restrict visible offers by user's VIP level.
        # Users can only see offers whose `amount_requested` is less than or equal
        # to their VIP allowance. The allowance is computed from the base threshold
        # (VIP_FIRST_THRESHOLD) doubled per level: allowance = base * (2 ** vip_level)
        try:
            user = getattr(self.request, 'user', None)
            if user and user.is_authenticated:
                vip_level = 0
                try:
                    vip_level = int(getattr(user.investor, 'vip_level', 0) or 0)
                except Exception:
                    vip_level = 0
                from decimal import Decimal
                base = Decimal(getattr(settings, 'VIP_FIRST_THRESHOLD', 25000))
                # compute allowance; for vip_level 0 allow up to base
                allowance = base * (Decimal(2) ** Decimal(vip_level))
                qs = qs.filter(amount_requested__lte=allowance)
                # exclude offers hidden for this user or globally until a future time
                try:
                    now = timezone.now()
                    hidden_qs = HiddenOffer.objects.filter(hidden_until__gt=now).filter(Q(user__isnull=True) | Q(user=user))
                    hidden_ids = list(hidden_qs.values_list('offer_id', flat=True))
                    if hidden_ids:
                        qs = qs.exclude(id__in=hidden_ids)
                except Exception:
                    pass
        except Exception:
            # best-effort: if anything goes wrong, don't restrict results
            pass
        return qs


class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def transfer_gains(self, request, pk=None):
        """Transfer amount from wallet.gains to wallet.available for the owner."""
        from decimal import Decimal, ROUND_DOWN
        from django.db import transaction

        amount = request.data.get('amount')
        source = request.data.get('source', 'gains')
        if amount is None:
            return Response({'message': "Le montant est requis"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amt = Decimal(str(amount))
        except Exception:
            return Response({'message': 'Montant invalide'}, status=status.HTTP_400_BAD_REQUEST)

        if amt <= Decimal('0'):
            return Response({'message': 'Le montant doit être positif'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            logger.debug('transfer_gains request: wallet=%s user=%s raw_amount=%s source=%s', pk, getattr(request.user, 'id', None), amount, source)
            with transaction.atomic():
                w = Wallet.objects.select_for_update().get(pk=pk, user=request.user)
                logger.debug('wallet before transfer: id=%s available=%s gains=%s sale_balance=%s', w.pk, w.available, w.gains, getattr(w, 'sale_balance', None))

                if source == 'gains':
                    if w.gains < amt:
                        return Response({'message': 'Gains insuffisants'}, status=status.HTTP_400_BAD_REQUEST)
                    w.gains = (w.gains - amt).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                    w.available = (w.available + amt).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                elif source == 'sale':
                    # transfer from sale_balance (mapped to invested). Only allow transferring
                    # amounts that are withdrawable (investments older than 30 days).
                    try:
                        sb = w.sale_balance
                    except Exception:
                        sb = None
                    if sb is None or sb <= Decimal('0'):
                        return Response({'message': "Solde investi insuffisant"}, status=status.HTTP_400_BAD_REQUEST)

                    # compute withdrawable amount from investments tied to this wallet
                    from django.utils import timezone as _tz
                    from datetime import timedelta
                    cutoff = _tz.now() - timedelta(days=30)
                    Investment = __import__('api.models', fromlist=['Investment']).Investment
                    withdrawable_agg = Investment.objects.filter(wallet=w, active=True, created_at__lte=cutoff).aggregate(total=Sum('amount'))
                    withdrawable = withdrawable_agg.get('total') or Decimal('0')

                    if withdrawable < amt:
                        return Response({'message': 'Fonds investis verrouillés : seuls les investissements âgés de 30 jours peuvent être retirés'}, status=status.HTTP_400_BAD_REQUEST)

                    w.sale_balance = (w.sale_balance - amt).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                    w.available = (w.available + amt).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                else:
                    return Response({'message': 'source invalide'}, status=status.HTTP_400_BAD_REQUEST)

                w.save()

                Transaction.objects.create(wallet=w, amount=amt, type='transfer')

                return Response(WalletSerializer(w).data)
        except Wallet.DoesNotExist:
            return Response({'message': 'Portefeuille non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            # Log unexpected server error and return a safe message
            logger.exception('transfer_gains failed for wallet %s user %s', pk, request.user)
            return Response({'message': "Erreur serveur interne"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
                    # try phone number via Investor
                    try:
                        inv = Investor.objects.get(phone=identifier)
                        user = inv.user
                    except Investor.DoesNotExist:
                        user = None

        if user is None or not user.check_password(password):
            return Response({'message': 'invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        user_data = UserSerializer(user).data
        # include refresh token in response body for development convenience
        resp = Response({'user': user_data, 'access_token': access_token, 'refresh_token': refresh_token})
        set_refresh_cookie(resp, refresh_token)
        return resp


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get('name')
        email = request.data.get('email')
        phone = request.data.get('phone')
        password = request.data.get('password')
        country_code = request.data.get('countryCode')
        ref_code = request.data.get('ref')

        if not name or not password:
            return Response({'message': 'name and password required'}, status=status.HTTP_400_BAD_REQUEST)

        username = email or name
        if User.objects.filter(username=username).exists():
            return Response({'message': 'user exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, first_name=name, email=email)
        user.set_password(password)
        user.save()

        # ensure an Investor record exists for this new user
        try:
            # store phone including country code when available
            full_phone = phone
            if country_code:
                try:
                    # include + if not present
                    cp = str(country_code)
                    if not cp.startswith('+'):
                        cp = f"+{cp}"
                    full_phone = f"{cp}{phone if phone else ''}"
                except Exception:
                    full_phone = phone

            Investor.objects.create(user=user, phone=full_phone)
            investor_created = True
        except Exception:
            investor_created = False

        # create default wallets for the new investor if none exist
        wallets_created = []
        try:
            # create default wallets for the new investor if none exist
            wallets_created = []
            try:
                # determine currency from provided country code (frontend sends 'countryCode')
                desired_currency = country_code_to_currency(country_code)
                if not Wallet.objects.filter(user=user, currency=desired_currency).exists():
                    w = Wallet.objects.create(user=user, currency=desired_currency)
                    wallets_created.append(w.currency)
            except Exception:
                # swallow wallet creation errors but continue
                wallets_created = []
        except Exception:
            # swallow wallet creation errors but continue
            wallets_created = []

        # create a referral code for this new user if not exists
        try:
            # generate a short unique code
            import secrets

            code = secrets.token_urlsafe(6)
            # ensure uniqueness
            while ReferralCode.objects.filter(code=code).exists():
                code = secrets.token_urlsafe(6)
            ReferralCode.objects.create(code=code, referrer=user)
        except Exception:
            pass

        # if a referral code was provided, link the referral.
        # We mark it as 'used' immediately and record the timestamp so the referrer sees the new referred user.
        if ref_code:
            try:
                rc = ReferralCode.objects.filter(code__iexact=ref_code).first()
                if rc:
                    from django.utils import timezone as _tz
                    Referral.objects.create(code=rc, referred_user=user, status='used', used_at=_tz.now())
            except Exception:
                pass

        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        user_data = UserSerializer(user).data
        resp = Response({'user': user_data, 'access_token': access_token, 'refresh_token': refresh_token, 'investor_created': investor_created})
        set_refresh_cookie(resp, refresh_token)
        return resp


class RefreshTokenFromCookieView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Accept refresh token from cookie (httpOnly) or from JSON body (dev convenience)
        refresh_token = request.COOKIES.get('refresh') or request.data.get('refresh') or request.data.get('token')
        if not refresh_token:
            return Response({'message': 'no refresh token'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            token = RefreshToken(refresh_token)
            access = str(token.access_token)
            return Response({'access_token': access})
        except Exception:
            return Response({'message': 'invalid token'}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        resp = Response({'message': 'logged out'})
        # delete cookie
        resp.delete_cookie('refresh')
        return resp


class RegisterEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from .serializers import RegisterEmailSerializer
        serializer = RegisterEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend = getattr(settings, 'SITE_URL', 'http://localhost:5173')
        verify_link = f"{frontend}/auth/verify/{uid}/{token}"

        subject = "Vérifiez votre adresse e‑mail"
        message = (
            f"Bonjour,\n\nCliquez sur le lien suivant pour vérifier votre adresse e‑mail et activer votre compte:\n\n{verify_link}\n\n"
            "Si vous n'avez pas demandé ceci, ignorez cet e‑mail."
        )
        send_mail(subject, message, getattr(settings, 'DEFAULT_FROM_EMAIL', None), [user.email], fail_silently=False)

        return Response({'detail': 'E‑mail de vérification envoyé.'}, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except Exception:
            return Response({'detail': 'Lien invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        if default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            # auto-login: create tokens and set refresh cookie
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            user_data = UserSerializer(user).data
            resp = Response({'user': user_data, 'access_token': access_token, 'refresh_token': refresh_token}, status=status.HTTP_200_OK)
            set_refresh_cookie(resp, refresh_token)
            return resp
        return Response({'detail': 'Lien expiré ou invalide.'}, status=status.HTTP_400_BAD_REQUEST)


class SetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from .serializers import SetPasswordSerializer
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # after password set, optional auto-login
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        user_data = UserSerializer(user).data
        resp = Response({'user': user_data, 'access_token': access_token, 'refresh_token': refresh_token}, status=status.HTTP_200_OK)
        set_refresh_cookie(resp, refresh_token)
        return resp


class MeView(APIView):
    """Return the current authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # ensure VIP level reflects current invested balances
        try:
            recompute_vip_for_user(request.user)
        except Exception:
            # best-effort, do not fail the request
            pass
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)







class InvestmentViewSet(viewsets.ViewSet):
    """Simple ViewSet to create/list investments and trigger accrual for a single investment."""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        invs = __import__('api.models', fromlist=['Investment']).Investment.objects.filter(user=request.user).order_by('-created_at')
        serializer = InvestmentSerializer(invs, many=True)
        return Response(serializer.data)

    def create(self, request):
        from decimal import Decimal, ROUND_DOWN
        from django.db import transaction
        data = request.data
        amount = data.get('amount')
        if amount is None:
            return Response({'message': 'amount required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amt = Decimal(str(amount))
        except Exception:
            return Response({'message': 'invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        if amt <= Decimal('0'):
            return Response({'message': 'amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)

        # use the user's first wallet (frontend uses single wallet concept)
        w = Wallet.objects.filter(user=request.user).first()
        if not w:
            return Response({'message': 'wallet not found'}, status=status.HTTP_404_NOT_FOUND)

        offer_id = data.get('offer_id') or data.get('offer')

        try:
            with transaction.atomic():
                w = Wallet.objects.select_for_update().get(pk=w.pk)
                if w.available < amt:
                    return Response({'message': 'insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
                w.available = (w.available - amt).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                # increment invested balance
                try:
                    w.invested = (w.invested + amt).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                except Exception:
                    w.invested = amt.quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                # also keep sale_balance in sync for frontend that shows sale balance
                try:
                    w.sale_balance = (w.sale_balance + amt).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                except Exception:
                    w.sale_balance = amt.quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                w.save()

                Investment = __import__('api.models', fromlist=['Investment']).Investment
                # determine daily rate based on user's VIP level
                try:
                    vip_level = int(getattr(request.user.investor, 'vip_level', 0) or 0)
                except Exception:
                    vip_level = 0

                if vip_level <= 0:
                    daily = Decimal('0')
                else:
                    # 2.5% per VIP level (0.025 * vip_level)
                    daily = (Decimal('0.025') * Decimal(vip_level)).quantize(Decimal('0.000001'))

                inv = Investment.objects.create(user=request.user, wallet=w, amount=amt, last_accrual=None, daily_rate=daily)

                # If this investment is tied to a MarketOffer, mark the offer accepted
                if offer_id:
                    try:
                        mo = MarketOffer.objects.select_for_update().get(pk=int(offer_id))
                        if mo.status != 'open':
                            return Response({'message': 'offer not available'}, status=status.HTTP_400_BAD_REQUEST)
                        mo.status = 'accepted'
                        mo.expires_at = timezone.now()
                        mo.save()

                        # create a Trade record to record the acceptance
                        buyer_info = {'id': request.user.id, 'username': getattr(request.user, 'username', None)}
                        seller = mo.seller if mo.seller is not None else request.user
                        Trade.objects.create(
                            offer_id=str(mo.pk),
                            seller=seller,
                            amount=amt,
                            price=getattr(mo, 'price_offered', 0) or 0,
                            surplus=getattr(mo, 'surplus', 0) or 0,
                            buyer_info=buyer_info,
                        )
                    except MarketOffer.DoesNotExist:
                        return Response({'message': 'offer not found'}, status=status.HTTP_404_NOT_FOUND)

                # record transaction for the investment
                Transaction.objects.create(wallet=w, amount=amt, type='trade')
                # recompute VIP from current wallet invested sums (preferred behavior)
                try:
                    recompute_vip_for_user(request.user)
                except Exception:
                    # best-effort: do not break the investment flow on VIP recompute errors
                    pass

        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = InvestmentSerializer(inv)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def accrue(self, request, pk=None):
        """Accrue interest for a single investment (useful for testing/manual run)."""
        from decimal import Decimal, ROUND_DOWN
        from django.db import transaction
        from django.utils import timezone

        try:
            Investment = __import__('api.models', fromlist=['Investment']).Investment
            inv = Investment.objects.select_for_update().get(pk=pk, user=request.user)
        except Investment.DoesNotExist:
            return Response({'message': 'investment not found'}, status=status.HTTP_404_NOT_FOUND)

        if not inv.active:
            return Response({'message': 'investment not active'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        last = inv.last_accrual or inv.created_at
        # compute full days elapsed
        delta = now - last
        days = delta.days
        if days < 1:
            return Response({'message': 'no days elapsed since last accrual'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                w = Wallet.objects.select_for_update().get(pk=inv.wallet.pk)
                daily = Decimal(str(inv.daily_rate))
                principal = Decimal(str(inv.amount))
                # simple interest for elapsed days
                interest = (principal * daily * Decimal(days)).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                if interest > 0:
                    try:
                        w.gains = (w.gains + interest).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                    except Exception:
                        w.gains = interest
                    w.save()
                    # record as a deposit-like transaction
                    Transaction.objects.create(wallet=w, amount=interest, type='deposit')

                inv.last_accrual = now
                inv.save()
        except Exception as e:
            logger.exception('accrue failed for inv %s user %s', pk, request.user)
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'interest': str(interest), 'new_gains': str(w.gains)})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def withdraw(self, request, pk=None):
        """Withdraw invested principal back to available after 30 days from creation."""
        from decimal import Decimal, ROUND_DOWN
        from django.db import transaction
        from django.utils import timezone

        try:
            Investment = __import__('api.models', fromlist=['Investment']).Investment
            inv = Investment.objects.select_for_update().get(pk=pk, user=request.user)
        except Investment.DoesNotExist:
            return Response({'message': 'investment not found'}, status=status.HTTP_404_NOT_FOUND)

        if not inv.active:
            return Response({'message': 'investment not active or already withdrawn'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        age = now - inv.created_at
        if age.days < 30:
            return Response({'message': 'funds locked for 30 days'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                w = Wallet.objects.select_for_update().get(pk=inv.wallet.pk)
                principal = Decimal(str(inv.amount))
                if w.invested < principal:
                    return Response({'message': 'invested balance inconsistent'}, status=status.HTTP_400_BAD_REQUEST)

                w.invested = (w.invested - principal).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                w.available = (w.available + principal).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                w.save()

                # mark investment inactive
                inv.active = False
                inv.save()

                Transaction.objects.create(wallet=w, amount=principal, type='withdraw')
        except Exception as e:
            logger.exception('withdraw failed for inv %s user %s', pk, request.user)
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'withdrawn', 'amount': str(principal), 'wallet': WalletSerializer(w).data})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def encash(self, request, pk=None):
        """Encash accrued interest for a single investment and move it to available."""
        from decimal import Decimal, ROUND_DOWN
        from django.db import transaction
        from django.utils import timezone

        try:
            Investment = __import__('api.models', fromlist=['Investment']).Investment
            inv = Investment.objects.select_for_update().get(pk=pk, user=request.user)
        except Investment.DoesNotExist:
            return Response({'message': 'investment not found'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        last = inv.last_accrual or inv.created_at
        delta = now - last
        days = delta.days
        if days < 1:
            return Response({'message': 'no accrued days to encash'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                w = Wallet.objects.select_for_update().get(pk=inv.wallet.pk)
                daily = Decimal(str(inv.daily_rate))
                principal = Decimal(str(inv.amount))
                interest = (principal * daily * Decimal(days)).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                if interest <= Decimal('0'):
                    return Response({'message': 'no interest to encash'}, status=status.HTTP_400_BAD_REQUEST)

                # credit available directly (encash to available balance)
                try:
                    w.available = (w.available + interest).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                except Exception:
                    w.available = interest
                w.save()

                # record transaction
                Transaction.objects.create(wallet=w, amount=interest, type='deposit')

                # update investment last_accrual
                inv.last_accrual = now
                inv.save()

        except Exception as e:
            logger.exception('encash failed for inv %s user %s', pk, request.user)
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'encashed', 'amount': str(interest), 'wallet': WalletSerializer(w).data})


class ReferralsMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # ensure the user has a referral code (may have been created at registration)
        rc = ReferralCode.objects.filter(referrer=request.user).first()
        code_data = None
        if not rc:
            # create a referral code on-demand for existing users who registered before
            import secrets
            base = None
            # attempt to create a unique code a few times
            for _ in range(5):
                candidate = secrets.token_urlsafe(6)
                if not ReferralCode.objects.filter(code=candidate).exists():
                    base = candidate
                    break
            if base is None:
                # fallback to timestamp-based code
                from django.utils import timezone
                base = f"ref{int(timezone.now().timestamp())}"
            rc = ReferralCode.objects.create(code=base, referrer=request.user)

        if rc:
            code_data = ReferralCodeSerializer(rc).data

        # list referrals where this user's code was used
        referrals = Referral.objects.filter(code__referrer=request.user).order_by('-created_at')
        referrals_data = ReferralSerializer(referrals, many=True).data

        stats = {
            'total_referred': referrals.count(),
            'used': referrals.filter(status='used').count(),
            'pending': referrals.filter(status='pending').count(),
        }

        return Response({'code': code_data, 'referrals': referrals_data, 'stats': stats})
