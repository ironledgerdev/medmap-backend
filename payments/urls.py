from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InitiatePaymentView, CreateMembershipPaymentView, PayFastNotifyView, PaymentTransactionViewSet

router = DefaultRouter()
router.register(r'transactions', PaymentTransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('initiate/', InitiatePaymentView.as_view(), name='initiate-payment'),
    path('create-membership/', CreateMembershipPaymentView.as_view(), name='create-membership-payment'),
    path('membership/', CreateMembershipPaymentView.as_view(), name='create-membership-alias-legacy'), # Added for legacy support
    path('create/', CreateMembershipPaymentView.as_view(), name='create-payment-alias'), # Alias to match user request
    path('payfast/', CreateMembershipPaymentView.as_view(), name='payfast-redirect-alias'), # New alias for user request
    path('notify/', PayFastNotifyView.as_view(), name='payfast-notify'),
]
