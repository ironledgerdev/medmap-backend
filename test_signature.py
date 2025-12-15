import hashlib
import urllib.parse

def generate_signature(data, passphrase=None):
    sorted_keys = sorted(data.keys())
    payload = ""
    for key in sorted_keys:
        if data[key] is not None and data[key] != "":
            value = urllib.parse.quote_plus(str(data[key]))
            payload += f"{key}={value}&"
    
    if payload.endswith('&'):
        payload = payload[:-1]
    
    if passphrase:
        payload += f"&passphrase={urllib.parse.quote_plus(passphrase)}"
        
    print(f"Payload: {payload}")
    return hashlib.md5(payload.encode()).hexdigest()

data = {
    'amount': '39.00',
    'cancel_url': 'https://medmap.co.za/memberships?status=cancelled',
    'custom_str1': 'membership_47_premium',
    'email_address': 'kuhlulamadumo@gmail.com',
    'item_name': 'Premium membership (quarterly)',
    'merchant_id': '32963323',
    'merchant_key': '16d8hpaaicfyc',
    'name_first': 'Kuhlula',
    'name_last': 'Madumo',
    'notify_url': 'https://medmap-backend-6t7y.onrender.com/api/payments/notify/',
    'return_url': 'https://medmap.co.za/memberships?status=success'
}

print(f"Signature (No Passphrase): {generate_signature(data)}")
print(f"Signature (Test Passphrase 'test'): {generate_signature(data, 'test')}")
