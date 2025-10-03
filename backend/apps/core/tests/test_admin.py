"""
Tests for custom Django admin interface.
"""

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse


class AdminInterfaceTests(TestCase):
    """ Tests for custom Django admin interface. """

    def setUp(self):
        """ Creates client, creates + logs in as test admin user, + creates test regular user. """

        self.client = Client()
        self.admin_user = get_user_model().objects.create_superuser(
            username='testAdminUser',
            email='testAdminUser@example.com',
            password='testpass123',
        )
        self.client.force_login(self.admin_user)

        self.user = get_user_model().objects.create_user(
            username='testUser@example.com',
            email='testUser@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
        )

    def test_users_list(self):
        """ Tests that created test users are listed on the page. """

        # Using Django's default User model (auth.User)
        url = reverse('admin:auth_user_changelist')
        res = self.client.get(url)

        self.assertContains(res, self.user.first_name)
        self.assertContains(res, self.user.last_name)
        self.assertContains(res, self.user.email)

    def test_edit_user_page(self):
        """ Tests that the user edit page works as expected. """

        # Using Django's default User model (auth.User)
        url = reverse('admin:auth_user_change',
                      args=[self.user.id])  # type: ignore[attr-defined]
        res = self.client.get(url)

        self.assertEqual(res.status_code, 200)

    def test_create_user_page(self):
        """ Tests that the create user page works as expected. """

        # Using Django's default User model (auth.User)
        url = reverse('admin:auth_user_add')
        res = self.client.get(url)

        self.assertEqual(res.status_code, 200)
