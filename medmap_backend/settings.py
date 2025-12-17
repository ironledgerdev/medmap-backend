# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = False 
CORS_ALLOWED_ORIGINS = [
    "https://medmap.co.za",
    "https://www.medmap.co.za",
    "http://localhost:3000",
    "http://localhost:5173",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CSRF_TRUSTED_ORIGINS = [
    "https://medmap.co.za",
    "https://www.medmap.co.za",
]
