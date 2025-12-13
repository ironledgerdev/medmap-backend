import json
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from doctors.models import Doctor

User = get_user_model()

class DoctorEnrollmentTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testdoc@example.com',
            email='testdoc@example.com',
            password='password123',
            is_doctor=True
        )
        self.client.force_authenticate(user=self.user)

    def test_create_doctor_profile_with_file_and_json(self):
        # Simulate FormData
        # JSON fields in FormData are sent as strings
        accepted_insurances = ["Discovery", "Gems"]
        
        # Create a dummy file
        license_file = SimpleUploadedFile(
            "license.pdf",
            b"file_content",
            content_type="application/pdf"
        )

        data = {
            'speciality': 'General Practitioner',
            'city': 'Cape Town',
            'province': 'Western Cape',
            'price': '500.00',
            'years_experience': '5',
            'rating': '0.00',
            'review_count': '0',
            'bio': 'Test Bio',
            'is_available': 'false', # FormData sends boolean as string
            'verified': 'false',
            'accepted_insurances': json.dumps(accepted_insurances), # Sent as JSON string
            'license_document': license_file,
            'user': self.user.id
        }

        # Use format='multipart' to simulate FormData
        response = self.client.post('/api/doctors/doctors/', data, format='multipart')

        if response.status_code != 201:
            print(f"Error: {response.data}")

        self.assertEqual(response.status_code, 201)
        
        doctor = Doctor.objects.get(user=self.user)
        self.assertEqual(doctor.speciality, 'General Practitioner')
        self.assertEqual(doctor.accepted_insurances, accepted_insurances)
        self.assertTrue(bool(doctor.license_document))
        self.assertEqual(doctor.is_available, False) # Should be parsed correctly
