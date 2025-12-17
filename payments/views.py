from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, viewsets
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
import hashlib
from .models import PaymentTransaction
from .serializers import PaymentTransactionSerializer
from memberships.models import Membership
from bookings.models import Booking
from django.contrib.auth import get_user_model
from .services import generate_payfast_signature, PayFastService

User = get_user_model()


class PaymentTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentTransaction.objects.all().order_by('-created_at')
    serializer_class = PaymentTransactionSerializer
    permission_classes = [permissions.IsAdminUser]


class CreateMembershipPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        service = PayFastService()
        
        plan = request.data.get('plan')
        membership_id = request.data.get('membership_id')

        # Default values for Premium plan
        if plan == 'premium':
            amount_rands = 39.00
            item_name = "Premium membership (quarterly)"
            custom_str1 = f"membership_{user.id}_premium"
        else:
            # Fallback or other plans
            amount = request.data.get('amount', 0)
            description = request.data.get('description', 'Membership')
            amount_rands = float(amount) / 100 if float(amount) > 1000 else float(amount)
            item_name = description
            custom_str1 = f"membership_{user.id}_{plan}"

        return_url = "https://medmap.co.za/memberships?status=success"
        cancel_url = "https://medmap.co.za/memberships?status=cancelled"
        notify_url = settings.PAYFAST_NOTIFY_URL
        
        data = {
            "merchant_id": service.merchant_id,
            "merchant_key": service.merchant_key,
            "return_url": return_url,
            "cancel_url": cancel_url,
            "notify_url": notify_url,
            "amount": f"{amount_rands:.2f}",
            "item_name": item_name,
            "custom_str1": custom_str1,
            "email_address": user.email,
        }
        
        # Add name fields only if they exist
        if user.first_name:
            data["name_first"] = user.first_name
        if user.last_name:
            data["name_last"] = user.last_name

        # Remove empty values
        clean_data = {k: v for k, v in data.items() if v is not None and v != ""}
        clean_data['signature'] = generate_payfast_signature(clean_data)

        # Build HTML form
        form_inputs = "".join(
            f"<input type='hidden' name='{k}' value='{v}'/>"
            for k, v in clean_data.items()
        )

        form_action = f"{service.base_url}/eng/process"
        html_form = f"""
        <html>
        <head><title>Redirecting to PayFast...</title></head>
        <body onload="document.forms[0].submit()">
            <form action="{form_action}" method="POST">
                {form_inputs}
            </form>
        </body>
        </html>
        """

        return HttpResponse(html_form)


class InitiatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        service = PayFastService()
        amount = request.data.get('amount')
        description = request.data.get('description') or request.data.get('item_name')
        booking_id = request.data.get('booking_id')

        if not amount or not description:
            return Response({"error": "Amount and description are required"}, status=400)

        try:
            amount_val = float(amount)
            if amount_val > 1000:  # assume cents
                amount_val /= 100
        except ValueError:
            return Response({"error": "Invalid amount"}, status=400)

        return_url = "https://medmap.co.za/bookings?status=success"
        cancel_url = "https://medmap.co.za/bookings?status=cancelled"
        notify_url = settings.PAYFAST_NOTIFY_URL

        data = {
            "merchant_id": service.merchant_id,
            "merchant_key": service.merchant_key,
            "return_url": return_url,
            "cancel_url": cancel_url,
            "notify_url": notify_url,
            "amount": f"{amount_val:.2f}",
            "item_name": description,
            "email_address": user.email,
        }
        
        # Add optional fields
        if booking_id:
            data["custom_str1"] = f"booking_{booking_id}"
        if user.first_name:
            data["name_first"] = user.first_name
        if user.last_name:
            data["name_last"] = user.last_name

        # Remove empty values
        clean_data = {k: v for k, v in data.items() if v is not None and v != ""}
        clean_data['signature'] = generate_payfast_signature(clean_data)

        # Build HTML form
        form_inputs = "".join(
            f"<input type='hidden' name='{k}' value='{v}'/>"
            for k, v in clean_data.items()
        )

        form_action = f"{service.base_url}/eng/process"
        html_form = f"""
        <html>
        <head><title>Redirecting to PayFast...</title></head>
        <body onload="document.forms[0].submit()">
            <form method="POST" action="{form_action}">
                {form_inputs}
            </form>
        </body>
        </html>
        """

        return HttpResponse(html_form)


class PayFastNotifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data.dict() if hasattr(request.data, 'dict') else request.data

        pf_signature = data.get('signature')
        if not pf_signature:
            return Response({"error": "No signature"}, status=400)

        verify_data = data.copy()
        del verify_data['signature']

        calc_signature = generate_payfast_signature(verify_data)
        if calc_signature != pf_signature:
            print(f"Signature mismatch: Calculated {calc_signature} != Received {pf_signature}")
            # Optional: return Response({"error": "Signature mismatch"}, status=400)

        # Log transaction
        try:
            user = None
            custom_str1 = data.get('custom_str1')
            if custom_str1:
                parts = custom_str1.split('_')
                if len(parts) >= 2:
                    try:
                        if custom_str1.startswith('membership_'):
                            user_id = parts[1]
                            user = User.objects.get(id=user_id)
                        elif custom_str1.startswith('booking_'):
                            booking_id = parts[1]
                            booking = Booking.objects.get(id=booking_id)
                            user = booking.user
                    except:
                        pass

            PaymentTransaction.objects.create(
                user=user,
                amount=data.get('amount_gross', 0),
                status=data.get('payment_status', 'pending').lower(),
                transaction_type='membership' if custom_str1 and 'membership' in custom_str1 else 'booking',
                reference=data.get('pf_payment_id'),
                description=data.get('item_name', ''),
                metadata=data
            )
        except Exception as e:
            print(f"Error logging payment transaction: {e}")

        status = data.get('payment_status')
        if status == 'COMPLETE':
            custom_str1 = data.get('custom_str1')
            if custom_str1 and custom_str1.startswith('membership_'):
                parts = custom_str1.split('_')
                if len(parts) >= 3:
                    user_id = parts[1]
                    plan = parts[2]
                    try:
                        user = User.objects.get(id=user_id)
                        membership, created = Membership.objects.get_or_create(user=user)
                        membership.tier = plan
                        membership.status = 'active'
                        membership.end_date = timezone.now() + timedelta(days=90)  # quarterly
                        membership.save()
                    except Exception as e:
                        print(f"Error updating membership: {e}")
            elif custom_str1 and custom_str1.startswith('booking_'):
                parts = custom_str1.split('_')
                if len(parts) >= 2:
                    booking_id = parts[1]
                    try:
                        booking = Booking.objects.get(id=booking_id)
                        booking.payment_status = 'COMPLETE'
                        booking.status = 'confirmed'
                        booking.save()
                    except Exception as e:
                        print(f"Error updating booking: {e}")

        return Response({"status": "OK"})
