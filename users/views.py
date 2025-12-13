from rest_framework import viewsets, status, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.tokens import RefreshToken
from django.core import signing
from .serializers import UserSerializer, PasswordChangeSerializer

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['email', 'username', 'first_name', 'last_name']

    def get_permissions(self):
        if self.action in ['create', 'verify_email', 'resend_verification']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=user.id)

    @action(detail=False, methods=['post'])
    def verify_email(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user_id = signing.loads(token, salt='email-verify', max_age=86400) # 24h
            user = User.objects.get(id=user_id)
            if not user.email_verified:
                user.email_verified = True
                user.save()
            
            role = 'patient'
            if user.is_staff or user.is_superuser:
                role = 'admin'
            elif user.is_doctor:
                role = 'doctor'
                
            return Response({'status': 'verified', 'role': role})
        except signing.SignatureExpired:
             return Response({'error': 'Token expired'}, status=status.HTTP_400_BAD_REQUEST)
        except signing.BadSignature:
             return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
             return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def resend_verification(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            token = signing.dumps(user.id, salt='email-verify')
            link = f"http://localhost:3000/email-verification?type=email_confirmation&token={token}"
            print(f"VERIFICATION LINK for {email}: {link}")
            # TODO: Integrate real email sending here (e.g. SendGrid, AWS SES, or Django SMTP)
            return Response({'status': 'sent'})
        except User.DoesNotExist:
             # Don't reveal if user exists
             return Response({'status': 'sent'})

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        user = request.user
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            if not user.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.data.get("new_password"))
            user.save()
            return Response({"status": "password set"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def impersonate(self, request, pk=None):
        """
        Allows an admin to get an auth token for a specific user to impersonate them.
        """
        user_to_impersonate = self.get_object()
        
        # Ensure we don't impersonate another superuser/admin for security if needed
        # if user_to_impersonate.is_superuser:
        #     return Response({"error": "Cannot impersonate a superuser"}, status=403)
            
        refresh = RefreshToken.for_user(user_to_impersonate)
        
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user_id": user_to_impersonate.id,
            "email": user_to_impersonate.email,
            "is_impersonating": True
        })
