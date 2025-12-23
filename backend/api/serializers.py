from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from .models import MarketOffer, Wallet, Transaction, Deposit, Profile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'email', 'phone')

    def get_phone(self, obj):
        try:
            return obj.profile.phone
        except Exception:
            return None


class MarketOfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketOffer
        fields = ('id', 'title', 'description', 'price', 'created_at')


class WalletSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Wallet
        fields = ('id', 'user', 'currency', 'available', 'pending', 'gains')


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ('phone',)


class DepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deposit
        fields = ('id', 'user', 'amount', 'currency', 'status', 'external_id', 'created_at')



class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ('id', 'wallet', 'amount', 'type', 'created_at')


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
        # create profile placeholder
        try:
            Profile.objects.create(user=user)
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
