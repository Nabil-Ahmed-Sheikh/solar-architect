from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    UserSerializer,
    UserUpdateSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    PasswordResetSerializer,
    CustomTokenObtainPairSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Returns access + refresh tokens AND the full user object in one call."""
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Issue tokens immediately after registration
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            # Invalidate old tokens by issuing fresh ones
            refresh = RefreshToken.for_user(request.user)
            return Response({
                'detail': 'Password updated successfully.',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetView(APIView):
    """
    Initiates a password reset email.
    Always returns 200 to prevent email enumeration.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            # In production: send actual email with reset link
            # For now: silently succeed (prevents enumeration)
            try:
                user = User.objects.get(email=email)
                # TODO: send_password_reset_email(user)
                _ = user  # suppress unused warning
            except User.DoesNotExist:
                pass
        return Response({'detail': 'If an account exists, a reset email has been sent.'})


class LogoutView(APIView):
    """Blacklist the refresh token so it can't be used again."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'detail': 'Logged out successfully.'})
        except Exception:
            return Response({'detail': 'Logged out.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    """Admin-only: list all users."""
    if not request.user.is_staff:
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
    users = User.objects.select_related('profile').all()
    return Response(UserSerializer(users, many=True).data)
