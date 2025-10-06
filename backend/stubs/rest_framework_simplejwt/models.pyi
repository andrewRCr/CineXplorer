"""
Type stub file for djangorestframework-simplejwt models.

Provides explicit type annotations for SimpleJWT's TokenUser class,
enabling type-safe stateless user operations.

⚠️ MAINTENANCE CONTRACT
========================
Synchronized with: djangorestframework-simplejwt 5.3.x (as of 2025-01-27)
Last verified: 2025-01-27

When upgrading djangorestframework-simplejwt:
1. Check release notes for TokenUser API changes
2. Run tests - if runtime errors occur, check this stub file first
3. Verify property signatures match runtime behavior
4. Update "Last verified" date above

Trade-off: This stub eliminates type: ignore comments and provides proper type
inference for TokenUser properties, but requires manual verification on simplejwt upgrades.

Purpose: Eliminates type: ignore on TokenUser usage in authentication code
Pattern: Custom stubs for third-party libraries without complete type information
Compliance: Zero typing.Any usage per DEVELOPMENT-RULES.md
"""
from __future__ import annotations

from .tokens import Token

class TokenUser:
    """
    A stateless user class backed by validated JWT tokens.

    Used with JWTStatelessUserAuthentication for SSO functionality.
    Does not have a database representation.
    """

    is_active: bool
    token: Token

    def __init__(self, token: Token) -> None:
        """
        Initialize a token user from a validated JWT token.

        Args:
            token: Validated JWT token containing user claims
        """
        ...

    def __str__(self) -> str:
        """Return string representation."""
        ...

    @property
    def id(self) -> str:
        """Get user ID from token claims."""
        ...

    @property
    def pk(self) -> str:
        """Get primary key (same as id) from token claims."""
        ...

    @property
    def username(self) -> str:
        """Get username from token claims."""
        ...

    @property
    def is_staff(self) -> bool:
        """Get staff status from token claims."""
        ...

    @property
    def is_superuser(self) -> bool:
        """Get superuser status from token claims."""
        ...

    @property
    def is_anonymous(self) -> bool:
        """Always returns False - token users are authenticated."""
        ...

    @property
    def is_authenticated(self) -> bool:
        """Always returns True - token users are authenticated."""
        ...

    def get_username(self) -> str:
        """Get username from token claims."""
        ...

    def has_perm(self, perm: str, obj: object | None = None) -> bool:
        """Always returns False - token users have no permissions."""
        ...

    def has_perms(self, perm_list: list[str], obj: object | None = None) -> bool:
        """Always returns False - token users have no permissions."""
        ...

    def has_module_perms(self, module: str) -> bool:
        """Always returns False - token users have no permissions."""
        ...
