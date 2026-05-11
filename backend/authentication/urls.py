from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    RegisterView,
    MeView,
    ChangePasswordView,
    PasswordResetView,
    LogoutView,
    user_list,
)

urlpatterns = [
    # Token endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Auth actions
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('password-reset/', PasswordResetView.as_view(), name='auth_password_reset'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),

    # Admin
    path('users/', user_list, name='auth_user_list'),
]
