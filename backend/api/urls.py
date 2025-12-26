from django.urls import path, include
from rest_framework import routers

from . import views

router = routers.DefaultRouter()
router.register(r'wallets', views.WalletViewSet, basename='wallet')
router.register(r'transactions', views.TransactionViewSet, basename='transaction')

urlpatterns = [
    path('', include(router.urls)),

    # market endpoints matching frontend expectations
    path('market/offers', views.MarketOfferViewSet.as_view({'get': 'list'}), name='market-offers-list'),
    path('market/offers/<int:pk>', views.MarketOfferViewSet.as_view({'get': 'retrieve'}), name='market-offers-detail'),
    path('market/virtual-offers', views.VirtualOffersView.as_view(), name='market-virtual-offers'),
    path('market/buyers', views.BuyersListView.as_view(), name='market-buyers'),
    path('market/virtual-offers/<int:pk>/accept', views.AcceptVirtualOfferView.as_view(), name='market-virtual-accept'),
    path('referrals/me', views.ReferralsMeView.as_view(), name='referrals-me'),

    # deposits
    path('deposits/initiate', views.DepositViewSet.as_view({'post': 'initiate'}), name='deposits-initiate'),
    path('deposits/<int:pk>/status', views.DepositViewSet.as_view({'get': 'status'}), name='deposits-status'),

    # auth endpoints expected by frontend (they are under /api/auth/... because api base is /api)
    path('auth/login', views.LoginView.as_view(), name='auth-login'),
    path('auth/register', views.RegisterView.as_view(), name='auth-register'),
    path('auth/refresh', views.RefreshTokenFromCookieView.as_view(), name='auth-refresh'),
    path('auth/logout', views.LogoutView.as_view(), name='auth-logout'),
    path('me', views.MeView.as_view(), name='me'),
    path('auth/register-email/', views.RegisterEmailView.as_view(), name='auth-register-email'),
    path('auth/verify-email/<uidb64>/<token>/', views.VerifyEmailView.as_view(), name='auth-verify-email'),
    path('auth/set-password/', views.SetPasswordView.as_view(), name='auth-set-password'),
]
