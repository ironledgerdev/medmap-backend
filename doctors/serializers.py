from rest_framework import serializers
from .models import Doctor, DoctorSchedule
from users.serializers import UserSerializer

class DoctorScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorSchedule
        fields = '__all__'

class DoctorSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    schedules = DoctorScheduleSerializer(many=True, read_only=True)
    image_url = serializers.ReadOnlyField()

    class Meta:
        model = Doctor
        fields = [
            'id', 'user', 'user_details', 'first_name', 'last_name', 'email',
            'practice_name', 'speciality', 'qualification', 'license_number', 'license_document', 'address',
            'city', 'province', 'postal_code', 
            'price', 'years_experience', 'rating', 'review_count', 'image', 
            'image_url', 'bio', 'languages', 'accepted_insurances',
            'is_available', 'verified', 'latitude', 'longitude', 'schedules'
        ]
