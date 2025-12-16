from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Booking
from .serializers import BookingSerializer
from decimal import Decimal

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['user', 'doctor', 'status', 'appointment_date']
    ordering_fields = ['created_at', 'appointment_date']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.is_staff:
            return Booking.objects.all()
        
        from django.db.models import Q
        return Booking.objects.filter(
            Q(user=user) | Q(doctor__user=user)
        )

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def taken_slots(self, request):
        """
        Publicly accessible endpoint to check availability.
        Does not reveal user details, only taken times.
        """
        doctor_id = request.query_params.get('doctor')
        date = request.query_params.get('date')
        if not doctor_id or not date:
            return Response({'error': 'Doctor ID and date are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        bookings = Booking.objects.filter(
            doctor_id=doctor_id,
            appointment_date=date
        ).exclude(status='cancelled')
        
        times = bookings.values_list('appointment_time', flat=True)
        return Response({'taken_slots': times}, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        doctor = serializer.validated_data.get('doctor')
        booking_fee = Decimal('10.00')
        # Use doctor.price as the consultation fee source
        consultation_fee = doctor.price if doctor else Decimal('0.00')
        
        serializer.save(
            user=self.request.user,
            booking_fee=booking_fee,
            consultation_fee=consultation_fee,
            total_amount=booking_fee + consultation_fee,
            status='pending',
            payment_status='unpaid'
        )
