from django.urls import path
from .views import MakeCallView, IncomingCallView, ConnectCallView

urlpatterns = [
    path('call/', MakeCallView.as_view(), name='make-call'),
    path('voice/incoming/', IncomingCallView.as_view(), name='incoming-call'),
    path('voice/connect/', ConnectCallView.as_view(), name='connect-call'),
]
