from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.conf import settings
from twilio.twiml.voice_response import VoiceResponse, Dial
from twilio.rest import Client
import logging
import urllib.parse

logger = logging.getLogger(__name__)

class MakeCallView(APIView):
    """
    Initiates a "Click-to-Call" bridge.
    1. System calls the 'agent_number' (e.g., Doctor or Admin).
    2. When Agent answers, system dials 'customer_number' (e.g., Patient).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # The person initiating the call (e.g., Doctor)
        agent_number = request.data.get('agent_number')
        # The person receiving the call (e.g., Patient)
        customer_number = request.data.get('customer_number')
        
        if not agent_number or not customer_number:
            return Response({"error": "Both 'agent_number' and 'customer_number' are required"}, status=400)

        try:
            if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_PHONE_NUMBER:
                raise ValueError("Twilio credentials are not configured")

            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

            # URL encoded customer number to pass as a query param
            encoded_customer_number = urllib.parse.quote_plus(customer_number)
            
            # Initiate call to the Agent first
            call = client.calls.create(
                to=agent_number,
                from_=settings.TWILIO_PHONE_NUMBER,
                # When Agent answers, fetch TwiML from this URL to dial the Customer
                url=f"{settings.BACKEND_URL}/api/telecommunications/voice/connect/?customer_number={encoded_customer_number}"
            )

            return Response({
                "success": True,
                "message": "Calling agent... Connection to customer will follow.",
                "call_sid": call.sid
            })
        except Exception as e:
            logger.error(f"Error initiating call: {e}")
            error_message = str(e)
            # Add hint for common trial account error
            if "verify" in error_message.lower() or "unverified" in error_message.lower():
                error_message += " (Hint: On a Twilio Trial account, you can only call verified numbers. Check your Twilio Console 'Verified Caller IDs'.)"
            return Response({"error": error_message}, status=500)

class IncomingCallView(APIView):
    """
    Webhook for inbound calls to the MedMap number.
    Forwards the call to the SUPPORT_PHONE_NUMBER (e.g., Reception/Admin).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        response = VoiceResponse()
        
        support_number = getattr(settings, 'SUPPORT_PHONE_NUMBER', None)
        
        if support_number:
            response.say("Welcome to MedMap. Connecting you to support.", voice='alice')
            dial = Dial()
            dial.number(support_number)
            response.append(dial)
        else:
            # Fallback if no support number is configured
            response.say("Welcome to MedMap. Our support line is currently unavailable. Please try again later.", voice='alice')
        
        return Response(str(response), content_type='application/xml')

class ConnectCallView(APIView):
    """
    TwiML instructions to bridge the call to the Customer.
    This is hit after the Agent answers.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        customer_number = request.query_params.get('customer_number')
        
        response = VoiceResponse()
        
        if customer_number:
            response.say("Connecting you to the patient now.", voice='alice')
            dial = Dial()
            dial.number(customer_number)
            response.append(dial)
        else:
            response.say("Error. No customer number provided.", voice='alice')
            
        return Response(str(response), content_type='application/xml')
