from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from .models import MarketOffer, Wallet, Transaction, Deposit, Investor

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'email', 'phone')

    def get_phone(self, obj):
        try:
            return obj.investor.phone
        except Exception:
            return None


class MarketOfferSerializer(serializers.ModelSerializer):
    seller = UserSerializer(read_only=True)

    class Meta:
        model = MarketOffer
        fields = (
            'id', 'seller', 'title', 'description', 'amount_requested', 'price_offered', 'surplus', 'source', 'status', 'expires_at', 'created_at'
        )


class VirtualOfferSerializer(serializers.Serializer):
    id = serializers.CharField()
    amount_requested = serializers.DecimalField(max_digits=20, decimal_places=2)
    price_offered = serializers.DecimalField(max_digits=20, decimal_places=2)
    surplus = serializers.DecimalField(max_digits=20, decimal_places=2)
    expires_at = serializers.DateTimeField()
    buyer_label = serializers.CharField()
    source = serializers.CharField(default='virtual')


class WalletSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Wallet
        fields = ('id', 'user', 'currency', 'available', 'pending', 'gains', 'sale_balance')


class InvestorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Investor
        fields = ('phone', 'total_invested', 'portfolio_value')


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deposit
        fields = ('id', 'user', 'amount', 'currency', 'status', 'external_id', 'created_at')



class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ('id', 'wallet', 'amount', 'type', 'created_at')


class TradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = __import__('api.models', fromlist=['Trade']).Trade
        fields = ('id', 'offer_id', 'seller', 'amount', 'price', 'surplus', 'buyer_info', 'created_at')


class ReferralCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = __import__('api.models', fromlist=['ReferralCode']).ReferralCode
        fields = ('id', 'code', 'referrer', 'created_at')


class BuyerSerializer(serializers.Serializer):
    """Representation for an aggregated buyer entry (virtual or real)."""
    label = serializers.CharField()
    source = serializers.CharField()
    total_offers = serializers.IntegerField(required=False)
    total_trades = serializers.IntegerField(required=False)
    avg_price = serializers.DecimalField(max_digits=20, decimal_places=2, required=False, allow_null=True)
    last_offer = MarketOfferSerializer(required=False, allow_null=True)
    last_trade = TradeSerializer(required=False, allow_null=True)


class ReferralSerializer(serializers.ModelSerializer):
    referred_user = UserSerializer(read_only=True)
    code = ReferralCodeSerializer(read_only=True)

    class Meta:
        model = __import__('api.models', fromlist=['Referral']).Referral
        fields = ('id', 'code', 'referred_user', 'status', 'created_at', 'used_at', 'meta')


class RegisterEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Un compte existe déjà pour cet e‑mail.')
        return value

    def create(self, validated_data):
        email = validated_data['email']
        username = email
        # random password for initial creation; user will set password after verification
        from django.contrib.auth.models import User as DjangoUser
        password = DjangoUser.objects.make_random_password()
        user = DjangoUser.objects.create_user(username=username, email=email, password=password)
        user.is_active = False
        user.save()
        # create investor placeholder
        try:
            Investor.objects.create(user=user)
        except Exception:
            pass
        return user


class SetPasswordSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(min_length=8)

    def validate(self, data):
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        try:
            uid = force_str(urlsafe_base64_decode(data.get('uidb64')))
            user = User.objects.get(pk=uid)
        except Exception:
            raise serializers.ValidationError('Lien invalide.')
        from django.contrib.auth.tokens import default_token_generator
        if not default_token_generator.check_token(user, data.get('token')):
            raise serializers.ValidationError('Token invalide ou expiré.')
        data['user'] = user
        return data

    def save(self):
        user = self.validated_data['user']
        password = self.validated_data['password']
        user.set_password(password)
        user.is_active = True
        user.save()
        return user
