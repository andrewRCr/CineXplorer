"""
Tests for core models.
"""

from django.contrib.auth.models import AbstractUser
from django.test import TestCase
from django.contrib.auth import get_user_model
from collections import defaultdict


class ModelTests(TestCase):
    """ Test core models. """

    def test_create_user_with_username_and_email_successful(self):
        """ Tests creating a user with both a username and email; case: success. """

        username: str = 'testUser'
        email: str = 'test@example.com'
        password: str = 'testpass123'

        user: AbstractUser = get_user_model().objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        self.assertEqual(user.username, username)
        self.assertEqual(user.email, email)
        self.assertTrue(user.check_password(password))

    def test_new_user_email_normalized(self):
        """ Tests newly created user's email is normalized. """

        sample_emails = [
            ['test1@EXAMPLE.com', 'test1@example.com'],
            ['Test2@Example.com', 'Test2@example.com'],
            ['TEST3@EXAMPLE.com', 'TEST3@example.com'],
            ['test4@example.COM', 'test4@example.com']
        ]

        i = 0
        for email, expected in sample_emails:
            user = get_user_model().objects.create_user(f'testUser{i}', email)
            self.assertEqual(user.email, expected)
            i += 1

    def test_new_user_without_username_raises_error(self):
        """ Tests that creating a user without a username raises a ValueError. """

        with self.assertRaises(ValueError):
            get_user_model().objects.create_user('', 'testUser@example.com')

    def test_new_user_without_email_raises_error(self):
        """ Tests that creating a user without an email raises a ValueError. """

        with self.assertRaises(ValueError):
            get_user_model().objects.create_user('testUser', '')

    def test_create_superuser(self):
        """ Tests creating a new superuser. """

        user = get_user_model().objects.create_superuser(
            'testUser',
            'testUser@example.com',
            'testPass123'
        )

        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
