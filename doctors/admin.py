from django.contrib import admin
from .models import Doctor, DoctorSchedule

class DoctorScheduleInline(admin.TabularInline):
    model = DoctorSchedule
    extra = 1

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('user', 'speciality', 'city', 'verified')
    list_filter = ('speciality', 'city', 'verified', 'province')
    search_fields = ('user__username', 'user__email', 'speciality')
    inlines = [DoctorScheduleInline]
