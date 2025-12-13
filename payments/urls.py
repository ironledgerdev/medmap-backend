from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InitiatePaymentView, CreateMembershipPaymentView, PayFastNotifyView, PaymentTransactionViewSet

router = DefaultRouter()
router.register(r'transactions', PaymentTransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('initiate/', InitiatePaymentView.as_view(), name='initiate-payment'),
    path('create-membership/', CreateMembershipPaymentView.as_view(), name='create-membership-payment'),
    path('notify/', PayFastNotifyView.as_view(), name='payfast-notify'),
]
