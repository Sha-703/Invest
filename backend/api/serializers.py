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
