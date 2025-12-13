from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'is_patient', 'is_doctor', 'phone_number', 'role', 'first_name', 'last_name')
        read_only_fields = ('is_staff', 'is_superuser')

    def get_role(self, obj):
        if obj.is_superuser or obj.is_staff:
            return 'admin'
        if obj.is_doctor:
            return 'doctor'
        return 'patient'

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Ensure username is set to email if not provided
        if 'username' not in validated_data and 'email' in validated_data:
            validated_data['username'] = validated_data['email']
            
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
