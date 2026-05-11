from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    title = models.CharField(max_length=200, blank=True, default='Solar Engineer')
    organization = models.CharField(max_length=255, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    total_mw_designed = models.FloatField(default=0.0)
    avatar_initials = models.CharField(max_length=3, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile({self.user.username})"

    def get_initials(self):
        fn = self.user.first_name
        ln = self.user.last_name
        if fn and ln:
            return f"{fn[0]}{ln[0]}".upper()
        return self.user.username[:2].upper()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
