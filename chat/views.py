from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from django.db.models import Q

class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ChatSession.objects.filter(Q(patient=user) | Q(doctor=user)).order_by('-updated_at')

    def perform_create(self, serializer):
        # Handle session creation logic
        # Typically patient initiates chat with doctor
        doctor_id = self.request.data.get('doctor')
        
        # Check if session already exists
        if doctor_id:
            existing = ChatSession.objects.filter(patient=self.request.user, doctor_id=doctor_id).first()
            if existing:
                # If exists, we should return it, but perform_create doesn't return response.
                # So we just don't save a new one, but serializer.save() expects to save.
                # In a real app we might handle this in create() method instead.
                pass 
        
        # Assuming patient initiates for now
        serializer.save(patient=self.request.user)

    def create(self, request, *args, **kwargs):
        # Override create to handle existing sessions
        doctor_id = request.data.get('doctor')
        if not doctor_id:
            return Response({"error": "Doctor ID required"}, status=status.HTTP_400_BAD_REQUEST)
        
        existing = ChatSession.objects.filter(patient=request.user, doctor_id=doctor_id).first()
        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data)
            
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        session = self.get_object()
        messages = session.messages.order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        session = self.get_object()
        serializer = ChatMessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(session=session, sender=request.user)
            session.save() # Update updated_at
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
