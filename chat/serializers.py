from rest_framework import serializers
from .models import ChatSession, ChatMessage
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'role']

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_profile = UserSimpleSerializer(source='sender', read_only=True)
    recipient_id = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'session', 'sender', 'recipient_id', 'message', 'message_type', 'is_read', 'created_at', 'sender_profile']
        read_only_fields = ['created_at', 'is_read', 'sender', 'session']

    def get_recipient_id(self, obj):
        # Determine recipient based on session and sender
        if obj.sender == obj.session.patient:
            return obj.session.doctor.id
        return obj.session.patient.id

class ChatSessionSerializer(serializers.ModelSerializer):
    doctor_profile = UserSimpleSerializer(source='doctor', read_only=True)
    patient_profile = UserSimpleSerializer(source='patient', read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ['id', 'patient', 'doctor', 'status', 'created_at', 'doctor_profile', 'patient_profile', 'last_message']
        read_only_fields = ['patient', 'created_at']

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if msg:
            return ChatMessageSerializer(msg).data
        return None
