from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status


def make_user(username="testuser", password="TestPass123!", email="test@example.com", **kwargs):
    return User.objects.create_user(username=username, password=password, email=email, **kwargs)


class RegisterViewTests(APITestCase):
    url = "/api/auth/register/"

    def test_register_success(self):
        data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "StrongPass456!",
            "password2": "StrongPass456!",
        }
        res = self.client.post(self.url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["username"], "newuser")

    def test_register_password_mismatch(self):
        data = {
            "username": "mismatch",
            "email": "mm@example.com",
            "password": "StrongPass456!",
            "password2": "DifferentPass789!",
        }
        res = self.client.post(self.url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        make_user(email="dup@example.com")
        data = {
            "username": "dup2",
            "email": "dup@example.com",
            "password": "StrongPass456!",
            "password2": "StrongPass456!",
        }
        res = self.client.post(self.url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_fields(self):
        res = self.client.post(self.url, {"username": "onlyname"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class TokenObtainTests(APITestCase):
    url = "/api/auth/token/"

    def setUp(self):
        self.user = make_user()

    def test_login_success(self):
        res = self.client.post(self.url, {"username": "testuser", "password": "TestPass123!"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertIn("user", res.data)
        self.assertEqual(res.data["user"]["username"], "testuser")

    def test_login_wrong_password(self):
        res = self.client.post(self.url, {"username": "testuser", "password": "wrongpass"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        res = self.client.post(self.url, {"username": "nobody", "password": "TestPass123!"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class TokenRefreshTests(APITestCase):
    def setUp(self):
        self.user = make_user()
        res = self.client.post("/api/auth/token/", {"username": "testuser", "password": "TestPass123!"})
        self.refresh = res.data["refresh"]

    def test_refresh_success(self):
        res = self.client.post("/api/auth/token/refresh/", {"refresh": self.refresh})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)

    def test_refresh_invalid_token(self):
        res = self.client.post("/api/auth/token/refresh/", {"refresh": "notavalidtoken"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class MeViewTests(APITestCase):
    url = "/api/auth/me/"

    def setUp(self):
        self.user = make_user(first_name="John", last_name="Doe")
        self.client.force_authenticate(user=self.user)

    def test_get_me(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["username"], "testuser")
        self.assertEqual(res.data["email"], "test@example.com")

    def test_patch_me(self):
        res = self.client.patch(self.url, {"first_name": "Jane"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["first_name"], "Jane")

    def test_me_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordTests(APITestCase):
    url = "/api/auth/change-password/"

    def setUp(self):
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_change_password_success(self):
        res = self.client.post(self.url, {
            "current_password": "TestPass123!",
            "new_password": "NewStrongPass789!",
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("access", res.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPass789!"))

    def test_change_password_wrong_current(self):
        res = self.client.post(self.url, {
            "current_password": "wrongpass",
            "new_password": "NewStrongPass789!",
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetTests(APITestCase):
    url = "/api/auth/password-reset/"

    def test_password_reset_existing_email(self):
        make_user(email="existing@example.com")
        res = self.client.post(self.url, {"email": "existing@example.com"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("detail", res.data)

    def test_password_reset_nonexistent_email(self):
        # Should still return 200 to prevent enumeration
        res = self.client.post(self.url, {"email": "ghost@example.com"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_password_reset_missing_email(self):
        # View always returns 200 regardless of validation to prevent enumeration
        res = self.client.post(self.url, {})
        self.assertEqual(res.status_code, status.HTTP_200_OK)


class LogoutTests(APITestCase):
    url = "/api/auth/logout/"

    def setUp(self):
        self.user = make_user()
        login_res = self.client.post("/api/auth/token/", {"username": "testuser", "password": "TestPass123!"})
        self.refresh = login_res.data["refresh"]
        self.client.force_authenticate(user=self.user)

    def test_logout_success(self):
        res = self.client.post(self.url, {"refresh": self.refresh})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("detail", res.data)

    def test_logout_no_token(self):
        res = self.client.post(self.url, {})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_logout_unauthenticated(self):
        self.client.force_authenticate(user=None)
        res = self.client.post(self.url, {"refresh": self.refresh})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class UserListTests(APITestCase):
    url = "/api/auth/users/"

    def setUp(self):
        self.staff = make_user(username="admin", password="Admin123!", is_staff=True)
        self.regular = make_user(username="regular", password="Regular123!", email="reg@example.com")

    def test_staff_can_list_users(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)

    def test_regular_user_forbidden(self):
        self.client.force_authenticate(user=self.regular)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_forbidden(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
