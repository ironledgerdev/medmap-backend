from rest_framework import serializers
from .models import PaymentTransaction
from django.contrib.auth import get_user_model

User = get_user_model()

class PaymentTransactionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = PaymentTransaction
        fields = ['id', 'user', 'user_email', 'user_name', 'amount', 'status', 'transaction_type', 'reference', 'description', 'created_at', 'updated_at']
        read_only_fields = fields

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}"
        return "Unknown"
