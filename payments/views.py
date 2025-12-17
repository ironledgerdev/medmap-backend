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
