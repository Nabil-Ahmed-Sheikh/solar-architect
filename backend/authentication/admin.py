from django.contrib import admin
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'organization', 'total_mw_designed']
    search_fields = ['user__username', 'user__email']
