from django.contrib import admin
from .models import MarketOffer, Wallet, Transaction, Deposit, Investor
from .models import ReferralCode, Referral


@admin.register(MarketOffer)
class MarketOfferAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'amount_requested', 'price_offered', 'surplus', 'status', 'created_at')


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'currency', 'available', 'pending', 'gains')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'wallet', 'amount', 'type', 'created_at')


@admin.register(Deposit)
class DepositAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'amount', 'currency', 'status', 'created_at')


@admin.register(Investor)
class InvestorAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'phone', 'total_invested', 'portfolio_value', 'created_at')


@admin.register(ReferralCode)
class ReferralCodeAdmin(admin.ModelAdmin):
    list_display = ('id', 'code', 'referrer', 'created_at')


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ('id', 'code', 'referred_user', 'status', 'created_at', 'used_at')
