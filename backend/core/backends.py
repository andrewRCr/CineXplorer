"""
Custom core backends.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import AbstractBaseUser
from django.db.models import Q

# TODO: add check on registration to ensure new user can't register with an existing and verified
# email address. django constraints, perhaps?


class CustomUserModelBackend(ModelBackend):
    """ Custom authentication backend. Will allow auth using email OR username. """

    def authenticate(self,
                     request,
                     username=None,
                     password=None,
                     **kwargs) -> None | AbstractBaseUser:
        """ Authentication override, substituting email for username if needed. """

        UserModel: type[AbstractBaseUser] = get_user_model()

        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD,
                                  kwargs.get(UserModel.EMAIL_FIELD))
        if username is None or password is None:
            return
        try:
            # TODO: re-enable email_verified requirement once verification in place!
            # user: AbstractBaseUser = UserModel._default_manager.get(
            #     Q(username__exact=username) | (
            #         Q(email__iexact=username) & Q(email_verified=True))
            user: AbstractBaseUser = UserModel._default_manager.get(
                Q(username__exact=username) | (
                    Q(email__iexact=username))
            )
        except UserModel.DoesNotExist:
            # prevent security vulnerability: run the default password hasher once to reduce the
            # timing difference between an existing and a nonexistent user
            # (see: Django Project ticket #20760).
            UserModel().set_password(password)
        else:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
