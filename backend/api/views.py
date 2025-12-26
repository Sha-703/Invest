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
from django.db.models import Count, Avg, Max
import logging

logger = logging.getLogger(__name__)

from .models import MarketOffer, Wallet, Transaction, Deposit, Investor
from .models import ReferralCode, Referral
from .serializers import (
    MarketOfferSerializer,
    VirtualOfferSerializer,
    TradeSerializer,
    ReferralCodeSerializer,
    ReferralSerializer,
    WalletSerializer,
    TransactionSerializer,
    DepositSerializer,
    UserSerializer,
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
                    # transfer from sale_balance
                    try:
                        sb = w.sale_balance
                    except Exception:
                        sb = None
                    if sb is None or sb < amt:
                        return Response({'message': "Solde de vente insuffisant"}, status=status.HTTP_400_BAD_REQUEST)
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
            Investor.objects.create(user=user, phone=phone)
            investor_created = True
        except Exception:
            investor_created = False

        # create default wallets for the new investor if none exist
        wallets_created = []
        try:
            default_currencies = getattr(settings, 'DEFAULT_WALLETS', ['XAF'])
            for cur in default_currencies:
                if not Wallet.objects.filter(user=user, currency=cur).exists():
                    w = Wallet.objects.create(user=user, currency=cur)
                    wallets_created.append(w.currency)
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
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)


class VirtualOffersView(APIView):
    """Return up to 3 virtual buyer offers for the authenticated user's wallet.

    Offers are generated on the fly (not persisted) and return amount requested,
    price offered and surplus. This keeps the initial implementation simple.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from decimal import Decimal, ROUND_DOWN
        from django.utils import timezone
        import random
        from .models import Trade

        wallet = Wallet.objects.filter(user=request.user).first()
        if not wallet:
            return Response([], status=status.HTTP_200_OK)

        balance = wallet.available or Decimal('0')
        if balance <= Decimal('0'):
            return Response([], status=status.HTTP_200_OK)
        # Enforce daily limit: max 3 trades per seller per day
        now = timezone.now()
        trades_today = Trade.objects.filter(seller=request.user, created_at__date=now.date()).count()
        if trades_today >= 3:
            return Response([], status=status.HTTP_200_OK)

        # Check for existing open virtual offers for this seller created today
        existing = MarketOffer.objects.filter(
            seller=request.user,
            source='virtual',
            status='open',
            expires_at__gt=now,
            created_at__date=now.date(),
        ).order_by('created_at')
        if existing.exists():
            serializer = MarketOfferSerializer(existing, many=True)
            return Response(serializer.data)

        # determine up to remaining offers based on balance (max 3 per day)
        remaining = 3 - trades_today
        percents = [Decimal('0.2'), Decimal('0.4'), Decimal('0.6')]
        offers = []
        for i, pct in enumerate(percents):
            if len(offers) >= remaining:
                break
            amount = (balance * pct).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
            # skip negligible amounts
            if amount < Decimal('100'):
                continue
            # random margin between 5% and 30%
            margin_pct = Decimal(random.uniform(0.05, 0.30)).quantize(Decimal('0.0001'))
            price = (amount * (Decimal('1') + margin_pct)).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
            surplus = (price - amount).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
            expires = now + timezone.timedelta(minutes=30)

            mo = MarketOffer.objects.create(
                seller=request.user,
                title=f'Acheteur virtuel {chr(65 + i)}',
                description='Offre virtuelle générée automatiquement',
                amount_requested=amount,
                price_offered=price,
                surplus=surplus,
                source='virtual',
                status='open',
                expires_at=expires,
            )
            offers.append(mo)

        serializer = MarketOfferSerializer(offers, many=True)
        return Response(serializer.data)


class AcceptVirtualOfferView(APIView):
    """Accept a persisted virtual offer by pk: perform balance checks and execute the trade atomically."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        from decimal import Decimal, ROUND_DOWN
        from django.db import transaction

        # find the offer
        try:
            offer = MarketOffer.objects.select_for_update().get(pk=pk, source='virtual')
        except MarketOffer.DoesNotExist:
            return Response({'message': 'offer not found'}, status=status.HTTP_404_NOT_FOUND)

        if offer.status != 'open':
            return Response({'message': 'offer not open'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if offer.expires_at and offer.expires_at <= now:
            offer.status = 'expired'
            offer.save()
            return Response({'message': 'offer expired'}, status=status.HTTP_400_BAD_REQUEST)

        wallet = Wallet.objects.filter(user=request.user).first()
        if not wallet:
            return Response({'message': 'wallet not found'}, status=status.HTTP_404_NOT_FOUND)

        amount = offer.amount_requested
        price = offer.price_offered

        if price <= amount or amount <= Decimal('0'):
            return Response({'message': 'invalid offer values'}, status=status.HTTP_400_BAD_REQUEST)

        # Execute atomically with row lock
        try:
            with transaction.atomic():
                w = Wallet.objects.select_for_update().get(pk=wallet.pk)
                if w.available < amount:
                    return Response({'message': 'insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
                surplus = (price - amount).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                # deduct the sold amount from available, credit surplus to gains
                w.available = (w.available - amount).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                w.gains = (w.gains + surplus).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                # credit the sale proceeds to sale_balance (we store sold AMOUNT as sale balance)
                try:
                    w.sale_balance = (w.sale_balance + amount).quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                except Exception:
                    # if sale_balance doesn't exist (migration not applied), initialize it
                    w.sale_balance = amount.quantize(Decimal('0.01'), rounding=ROUND_DOWN)
                w.save()

                # mark offer accepted
                offer.status = 'accepted'
                offer.save()

                # record trade
                from .models import Trade
                trade = Trade.objects.create(
                    offer_id=str(offer.pk),
                    seller=request.user,
                    amount=amount,
                    price=price,
                    surplus=surplus,
                    buyer_info={'label': offer.title or 'Acheteur virtuel'},
                )

                Transaction.objects.create(wallet=w, amount=amount, type='trade')

        except Exception as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = TradeSerializer(trade)
        return Response({'trade': serializer.data, 'new_balance': str(w.available)})


class BuyersListView(APIView):
    """Aggregate buyers from virtual MarketOffers and recorded Trades.

    Returns a list of buyer entries with sample last offer/trade and basic stats.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import Trade

        buyers = []

        # virtual buyers aggregated by title
        virtual_groups = (
            MarketOffer.objects.filter(source='virtual')
            .values('title')
            .annotate(total_offers=Count('id'), avg_price=Avg('price_offered'), last_created=Max('created_at'))
            .order_by('-last_created')
        )

        for g in virtual_groups:
            title = g.get('title')
            latest = MarketOffer.objects.filter(source='virtual', title=title).order_by('-created_at').first()
            buyers.append({
                'label': title or 'Acheteur virtuel',
                'source': 'virtual',
                'total_offers': g.get('total_offers') or 0,
                'avg_price': str(g.get('avg_price')) if g.get('avg_price') is not None else None,
                'last_offer': MarketOfferSerializer(latest).data if latest else None,
            })

        # real buyers aggregated from trades' buyer_info.label when available
        trade_qs = Trade.objects.exclude(buyer_info__isnull=True).order_by('-created_at')
        trade_map = {}
        for t in trade_qs:
            info = t.buyer_info or {}
            label = info.get('label') or info.get('name') or 'Acheteur'
            entry = trade_map.get(label)
            if not entry:
                trade_map[label] = {
                    'label': label,
                    'source': 'trade',
                    'total_trades': 1,
                    'avg_price': t.price,
                    'last_trade': TradeSerializer(t).data,
                }
            else:
                entry['total_trades'] += 1
                # update avg_price incrementally
                try:
                    entry['avg_price'] = (entry['avg_price'] * (entry['total_trades'] - 1) + t.price) / entry['total_trades']
                except Exception:
                    entry['avg_price'] = t.price
                # keep last_trade as the most recent (we iterate in desc order)

        # convert avg_price to string for JSON serialization
        for v in trade_map.values():
            v['avg_price'] = str(v['avg_price']) if v.get('avg_price') is not None else None
            buyers.append(v)

        return Response(buyers)


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
