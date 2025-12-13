import hashlib
import urllib.parse
from django.conf import settings

import os

class PayFastService:
    def __init__(self):
        self.merchant_id = settings.MERCHANT_ID
        self.merchant_key = settings.MERCHANT_KEY
        self.passphrase = settings.PASSPHRASE
        # Use sandbox for debug, live for prod
        self.base_url = 'https://sandbox.payfast.co.za' if settings.PAYFAST_SANDBOX else 'https://www.payfast.co.za'

    def _generate_signature(self, data):
        """
        Generates a signature for the PayFast request.
        """
        # Sort keys to ensure consistent order for signature and URL
        sorted_keys = sorted(data.keys())
        payload = ""
        for key in sorted_keys:
            if data[key] is not None and data[key] != "":
                value = urllib.parse.quote_plus(str(data[key]))
                payload += f"{key}={value}&"
        
        # Remove trailing &
        if payload.endswith('&'):
            payload = payload[:-1]
        
        if self.passphrase:
            payload += f"&passphrase={urllib.parse.quote_plus(self.passphrase)}"
            
        return hashlib.md5(payload.encode()).hexdigest()

    def create_payment_form_data(self, amount, item_name, return_url, cancel_url, email=None, first_name=None, last_name=None, custom_str1=None, notify_url=None):
        """
        Prepare data for the payment form redirect.
        """
        # Determine notify_url priority:
        # 1. Explicit argument
        # 2. Environment variable PAYFAST_NOTIFY_URL
        # 3. Settings PAYFAST_NOTIFY_URL
        # 4. Constructed from CORS_ALLOWED_ORIGINS (fallback)
        
        if not notify_url:
            notify_url = os.environ.get('PAYFAST_NOTIFY_URL')
            
        if not notify_url and hasattr(settings, 'PAYFAST_NOTIFY_URL'):
            notify_url = settings.PAYFAST_NOTIFY_URL
            
        if not notify_url:
             # Fallback logic
             base_domain = settings.CORS_ALLOWED_ORIGINS[0] if settings.CORS_ALLOWED_ORIGINS else 'http://localhost:8000'
             # Ensure we don't use Supabase URL by accident if it was in CORS origins
             if 'supabase.co' in base_domain:
                 # Default to localhost for safety if Supabase detected
                 base_domain = 'http://localhost:8000'
             
             notify_url = f"{base_domain}/api/payments/notify/"

        data = {
            'merchant_id': self.merchant_id,
            'merchant_key': self.merchant_key,
            'return_url': return_url,
            'cancel_url': cancel_url,
            'notify_url': notify_url,
            'amount': f"{amount:.2f}",
            'item_name': item_name,
        }
        
        if email:
            data['email_address'] = email
        if first_name:
            data['name_first'] = first_name
        if last_name:
            data['name_last'] = last_name
        if custom_str1:
            data['custom_str1'] = custom_str1

        data['signature'] = self._generate_signature(data)
        
        return data

    def generate_payment_url(self, data):
        """
        Generate the full redirect URL for PayFast.
        """
        # Ensure signature is present
        if 'signature' not in data:
            data['signature'] = self._generate_signature(data)
            
        # Build query string with sorted keys (matching signature order)
        sorted_keys = sorted(data.keys())
        query_parts = []
        for key in sorted_keys:
            if data[key] is not None and data[key] != "":
                value = urllib.parse.quote_plus(str(data[key]))
                query_parts.append(f"{key}={value}")
                
        query_string = "&".join(query_parts)
        return f"{self.base_url}/eng/process?{query_string}"
