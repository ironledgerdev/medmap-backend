from django.db import models
from django.conf import settings

class Doctor(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doctor_profile')
    practice_name = models.CharField(max_length=255, blank=True, null=True)
    speciality = models.CharField(max_length=100)
    qualification = models.CharField(max_length=255, blank=True, null=True)
    license_number = models.CharField(max_length=100, blank=True, null=True)
    license_document = models.FileField(upload_to='licenses/', null=True, blank=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    years_experience = models.IntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    review_count = models.IntegerField(default=0)
    image = models.ImageField(upload_to='doctors/', null=True, blank=True)
    # image_url kept for compatibility or computed property
    
    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return None

    bio = models.TextField(blank=True)
    languages = models.JSONField(default=list)
    accepted_insurances = models.JSONField(default=list) 
    is_available = models.BooleanField(default=True)
    verified = models.BooleanField(default=False)
    # is_verified alias for frontend compatibility if needed, but 'verified' is used in model
    
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Dr. {self.user.first_name} {self.user.last_name}"

class DoctorSchedule(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='schedules')
    day_of_week = models.IntegerField() # 0=Sunday, 1=Monday, ...
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ['day_of_week', 'start_time']
        unique_together = ['doctor', 'day_of_week', 'start_time']
