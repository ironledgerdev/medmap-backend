from rest_framework import serializers
from .models import Booking
from doctors.serializers import DoctorSerializer
from users.serializers import UserSerializer

class BookingSerializer(serializers.ModelSerializer):
    doctor_details = DoctorSerializer(source='doctor', read_only=True)
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'user', 'user_details', 'doctor', 'doctor_details',
            'appointment_date', 'appointment_time', 'status', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']
