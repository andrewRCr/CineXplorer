"""
Tests for custom Django admin interface.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.test import Client


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

        # determine which url to use
        url = reverse('admin:core_user_changelist')
        res = self.client.get(url)

        self.assertContains(res, self.user.first_name)
        self.assertContains(res, self.user.last_name)
        self.assertContains(res, self.user.email)

    def test_edit_user_page(self):
        """ Tests that the user edit page works as expected. """

        url = reverse('admin:core_user_change', args=[self.user.id])  # type: ignore
        res = self.client.get(url)

        self.assertEqual(res.status_code, 200)

    def test_create_user_page(self):
        """ Tests that the create user page works as expected. """

        url = reverse('admin:core_user_add')
        res = self.client.get(url)

        self.assertEqual(res.status_code, 200)
