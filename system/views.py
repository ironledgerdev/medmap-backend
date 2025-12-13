from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from doctors.models import Doctor
from bookings.models import Booking
from memberships.models import Membership
from .models import SystemSetting
from .serializers import SystemSettingSerializer

User = get_user_model()

class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    # Allow read for authenticated, write for admin
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'admin_stats', 'analytics_dashboard']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=False, methods=['get'])
    def admin_stats(self, request):
        total_doctors = Doctor.objects.count()
        
        # Pending doctors are those not verified
        # Model uses 'verified' field, not 'is_verified'
        pending_doctors_qs = Doctor.objects.filter(verified=False).select_related('user')
        pending_data = []
        for d in pending_doctors_qs:
            # Try to get profile info from user or related profile if it existed (User model has fields)
            pending_data.append({
                'id': str(d.id),
                'user_id': str(d.user.id),
                'speciality': d.speciality,
                'practice_name': d.practice_name or d.city, # Use practice_name if available
                'years_experience': d.years_experience,
                'consultation_fee': d.price,
                'created_at': d.created_at,
                'profiles': {
                    'first_name': d.user.first_name, 
                    'last_name': d.user.last_name,
                    'email': d.user.email
                }
            })

        total_bookings = Booking.objects.count()
        # Revenue calc: Sum of doctor price for completed bookings (approx)
        # In a real app, Booking should store the price at time of booking.
        # For now, we'll iterate completed bookings and get doctor price.
        completed_bookings = Booking.objects.filter(status='completed').select_related('doctor')
        total_revenue = sum([b.doctor.price for b in completed_bookings if b.doctor.price])

        total_users = User.objects.count()
        premium_members = Membership.objects.filter(tier='premium', status='active').count()
        
        return Response({
            'total_doctors': total_doctors,
            'pending_doctors': pending_data,
            'total_bookings': total_bookings,
            'total_revenue': total_revenue,
            'total_users': total_users,
            'premium_members': premium_members
        })

    @action(detail=False, methods=['get'])
    def analytics_dashboard(self, request):
        six_months_ago = timezone.now() - timedelta(days=180)
        
        # User Growth
        user_growth = User.objects.filter(date_joined__gte=six_months_ago)\
            .annotate(month=TruncMonth('date_joined'))\
            .values('month')\
            .annotate(count=Count('id'))\
            .order_by('month')
            
        # Revenue Trend
        revenue_trend = Booking.objects.filter(
            created_at__gte=six_months_ago, 
            status='completed'
        ).annotate(month=TruncMonth('created_at'))\
         .values('month')\
         .annotate(revenue=Sum('total_amount'))\
         .order_by('month')

        # Booking Status
        booking_status = Booking.objects.values('status').annotate(count=Count('id'))
        
        # Inactive Users (No login in last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        inactive_users_count = User.objects.filter(
            Q(last_login__lt=thirty_days_ago) | Q(last_login__isnull=True)
        ).count()

        return Response({
            'user_growth': [
                {'month': item['month'].strftime('%Y-%m'), 'users': item['count']} 
                for item in user_growth
            ],
            'revenue_trend': [
                {'month': item['month'].strftime('%Y-%m'), 'revenue': item['revenue'] or 0} 
                for item in revenue_trend
            ],
            'booking_status': booking_status,
            'inactive_users': inactive_users_count,
            'total_doctors': User.objects.filter(is_doctor=True).count(),
            'total_patients': User.objects.filter(is_patient=True).count(),
            'total_signups': User.objects.count()
        })
