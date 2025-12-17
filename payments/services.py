import hashlib
import urllib.parse
from django.conf import settings
import os

class PayFastService:
    def __init__(self):
        self.merchant_id = settings.MERCHANT_ID
        self.merchant_key = settings.MERCHANT_KEY
        self.passphrase = settings.PASSPHRASE
        self.base_url = 'https://sandbox.payfast.co.za' if settings.PAYFAST_SANDBOX else 'https://www.payfast.co.za'
        if settings.PAYFAST_SANDBOX:
            # Always use test credentials in sandbox mode
            self.merchant_id = '10000100'
            self.merchant_key = '46f0cd694581a'

    def _generate_signature(self, data):
        payload = ""
        for key in sorted(data.keys()):
            if data[key] is not None and data[key] != "":
                value = urllib.parse.quote_plus(str(data[key]))
                payload += f"{key}={value}&"
        if self.passphrase:
            payload += f"passphrase={urllib.parse.quote_plus(self.passphrase)}"
        elif payload.endswith('&'):
            payload = payload[:-1]
        return hashlib.md5(payload.encode()).hexdigest()

    def create_payment_form_data(self, amount, item_name, return_url, cancel_url, email=None, first_name=None, last_name=None, custom_str1=None, notify_url=None):
        if not notify_url:
            notify_url = os.environ.get('PAYFAST_NOTIFY_URL')
        if not notify_url and hasattr(settings, 'PAYFAST_NOTIFY_URL'):
            notify_url = settings.PAYFAST_NOTIFY_URL
        if not notify_url:
            base_domain = settings.CORS_ALLOWED_ORIGINS[0] if settings.CORS_ALLOWED_ORIGINS else 'http://localhost:8000'
            if 'supabase.co' in base_domain:
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
        if 'signature' not in data:
            data['signature'] = self._generate_signature(data)
        sorted_keys = sorted(data.keys())
        query_parts = []
        for key in sorted_keys:
            if data[key] is not None and data[key] != "":
                value = urllib.parse.quote_plus(str(data[key]))
                query_parts.append(f"{key}={value}")
        query_string = "&".join(query_parts)
        return f"{self.base_url}/eng/process?{query_string}"

def generate_payfast_signature(data: dict) -> str:
    payload = ""
    for key in sorted(data.keys()):
        value = str(data[key]).strip()
        if value != "":
            payload += f"{key}={urllib.parse.quote_plus(value)}&"
    payload = payload.rstrip("&")
    if settings.PASSPHRASE:
        payload += f"&passphrase={urllib.parse.quote_plus(settings.PASSPHRASE)}"
    return hashlib.md5(payload.encode("utf-8")).hexdigest()
