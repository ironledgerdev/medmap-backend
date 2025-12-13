from rest_framework import viewsets, permissions
from .models import Membership
from .serializers import MembershipSerializer

class MembershipViewSet(viewsets.ModelViewSet):
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return Membership.objects.all()
        return Membership.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
