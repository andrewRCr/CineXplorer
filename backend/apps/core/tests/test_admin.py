"""
Tests for custom Django admin interface.
"""

from typing import TYPE_CHECKING, cast

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractBaseUser
from django.test import Client, TestCase
from django.urls import reverse

if TYPE_CHECKING:
    from django.contrib.auth.models import User as UserType

User = get_user_model()


class AdminInterfaceTests(TestCase):
    """ Tests for custom Django admin interface. """

    def setUp(self) -> None:
        """ Creates client, creates + logs in as test admin user, + creates test regular user. """

        self.client = Client()
        # django-types limitation - UserManager.create_superuser type not inferred
        self.admin_user = cast(
            "UserType",
            User.objects.create_superuser(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
                username='testAdminUser',
                email='testAdminUser@example.com',
                password='testpass123',
            )
        )
        # django-types limitation - force_login typing issue with User vs AbstractBaseUser
        self.client.force_login(cast(AbstractBaseUser, self.admin_user))  # pyright: ignore[reportArgumentType]

        # django-types limitation - UserManager.create_user type not inferred
        self.user = cast(
            "UserType",
            User.objects.create_user(  # pyright: ignore[reportUnknownMemberType, reportAttributeAccessIssue]
                username='testUser@example.com',
                email='testUser@example.com',
                password='testpass123',
                first_name='Test',
                last_name='User',
            )
        )

    def test_users_list(self) -> None:
        """ Tests that created test users are listed on the page. """

        # Using Django's default User model (auth.User)
        url = reverse('admin:auth_user_changelist')
        res = self.client.get(url)

        self.assertContains(res, self.user.first_name)
        self.assertContains(res, self.user.last_name)
        self.assertContains(res, self.user.email)

    def test_edit_user_page(self) -> None:
        """ Tests that the user edit page works as expected. """

        # Using Django's default User model (auth.User)
        url = reverse('admin:auth_user_change', args=[self.user.id])
        res = self.client.get(url)

        self.assertEqual(res.status_code, 200)

    def test_create_user_page(self) -> None:
        """ Tests that the create user page works as expected. """

        # Using Django's default User model (auth.User)
        url = reverse('admin:auth_user_add')
        res = self.client.get(url)

        self.assertEqual(res.status_code, 200)
