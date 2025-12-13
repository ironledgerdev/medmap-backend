from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorViewSet, DoctorScheduleViewSet

router = DefaultRouter()
router.register(r'doctors', DoctorViewSet)
router.register(r'schedules', DoctorScheduleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
