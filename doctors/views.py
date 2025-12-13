from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Doctor, DoctorSchedule
from .serializers import DoctorSerializer, DoctorScheduleSerializer

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['speciality', 'city', 'province', 'user__first_name', 'user__last_name', 'practice_name']
    filterset_fields = ['user', 'city', 'province', 'speciality', 'is_available']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class DoctorScheduleViewSet(viewsets.ModelViewSet):
    queryset = DoctorSchedule.objects.all()
    serializer_class = DoctorScheduleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['doctor']

    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        doctor_id = request.query_params.get('doctor')
        if not doctor_id:
            return Response({'error': 'Doctor ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Security check: ensure the request user is the doctor or admin
        if not request.user.is_staff:
             try:
                 doctor = Doctor.objects.get(id=doctor_id)
                 if doctor.user != request.user:
                     return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
             except Doctor.DoesNotExist:
                 return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)

        count, _ = DoctorSchedule.objects.filter(doctor_id=doctor_id).delete()
        return Response({'status': 'deleted', 'count': count}, status=status.HTTP_200_OK)
