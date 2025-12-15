from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.conf import settings
from twilio.twiml.voice_response import VoiceResponse, Dial
from twilio.rest import Client
import logging

logger = logging.getLogger(__name__)

class MakeCallView(APIView):
    """
    Initiates a call from the system to a user or doctor.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        to_number = request.data.get('to_number')
        
        if not to_number:
            return Response({"error": "Phone number is required"}, status=400)

        try:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

            # This initiates a call from Twilio to the 'to_number'
            # When they answer, it hits the 'url' provided (our TwiML webhook)
            call = client.calls.create(
                to=to_number,
                from_=settings.TWILIO_PHONE_NUMBER,
                url=f"{settings.BACKEND_URL}/api/telecommunications/voice/connect/"
            )

            return Response({
                "success": True,
                "call_sid": call.sid,
                "status": call.status
            })
        except Exception as e:
            logger.error(f"Error making call: {e}")
            return Response({"error": str(e)}, status=500)

class IncomingCallView(APIView):
    """
    Webhook that Twilio hits when someone calls our number.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        response = VoiceResponse()
        
        # Greet the caller
        response.say("Welcome to MedMap. Please wait while we connect you.", voice='alice')
        
        # Logic to route the call
        # For now, we can forward to a support line or play a message
        # If you want to dial a specific person (e.g., a doctor), you'd need logic here
        
        # Example: Forward to a support agent (placeholder number)
        # dial = Dial()
        # dial.number('+27123456789')
        # response.append(dial)
        
        # Fallback if no logic matches
        response.say("Thank you for calling MedMap. Goodbye.", voice='alice')
        
        return Response(str(response), content_type='application/xml')

class ConnectCallView(APIView):
    """
    TwiML instructions for what to do when an outbound call answers.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        response = VoiceResponse()
        response.say("Hello, this is a call from MedMap. Connecting you now.", voice='alice')
        # Add logic here if this was meant to connect two parties
        return Response(str(response), content_type='application/xml')
