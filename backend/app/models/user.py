"""Auth & RBAC models: User, Role, Permission, and the JWT blocklist.

RBAC: a User has many Roles; a Role has many Permissions (identified by a
stable ``code`` such as ``pages.create``). ``is_superadmin`` bypasses every
check. Permission checks go through :meth:`User.has_permission`.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models.base import BaseModel, utcnow

# ── Association tables ──────────────────────────────────────────────
role_permissions = Table(
    "role_permissions", db.metadata,
    Column("role_id", ForeignKey("role.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", ForeignKey("permission.id", ondelete="CASCADE"), primary_key=True),
)
user_roles = Table(
    "user_roles", db.metadata,
    Column("user_id", ForeignKey("user.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("role.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(BaseModel):
    """A single capability, grouped by module (e.g. code=`media.delete`)."""
    __tablename__ = "permission"

    code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(160), nullable=True)
    module: Mapped[str] = mapped_column(String(60), nullable=True, index=True)

    def to_dict(self, **kw) -> dict:
        data = super().to_dict(**kw)
        data.update(code=self.code, label=self.label, module=self.module)
        return data


class Role(BaseModel):
    """A named set of permissions (e.g. administrateur, éditeur, employé)."""
    __tablename__ = "role"

    name: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(120), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)  # non supprimable

    permissions = relationship("Permission", secondary=role_permissions,
                               backref="roles", lazy="selectin")

    def permission_codes(self) -> set[str]:
        return {p.code for p in self.permissions}

    def to_dict(self, *, with_permissions: bool = False, **kw) -> dict:
        data = super().to_dict(**kw)
        data.update(name=self.name, label=self.label, is_system=self.is_system)
        if with_permissions:
            data["permissions"] = [p.code for p in self.permissions]
        return data


class User(BaseModel):
    """An account. Authorization derives from its roles (or is_superadmin)."""
    __tablename__ = "user"

    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(80), nullable=True)
    last_name: Mapped[str] = mapped_column(String(80), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    roles = relationship("Role", secondary=user_roles, backref="users", lazy="selectin")

    # ── Password ────────────────────────────────────────────────────
    def set_password(self, raw: str) -> None:
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw: str) -> bool:
        return check_password_hash(self.password_hash, raw)

    # ── Authorization ───────────────────────────────────────────────
    def permission_codes(self) -> set[str]:
        codes: set[str] = set()
        for role in self.roles:
            codes |= role.permission_codes()
        return codes

    def has_permission(self, code: str) -> bool:
        return self.is_superadmin or code in self.permission_codes()

    def has_role(self, name: str) -> bool:
        return any(r.name == name for r in self.roles)

    def touch_login(self) -> None:
        self.last_login_at = utcnow()

    def to_dict(self, *, with_permissions: bool = False, **kw) -> dict:
        data = super().to_dict(**kw)
        data.update(
            email=self.email, first_name=self.first_name, last_name=self.last_name,
            is_active=self.is_active, is_superadmin=self.is_superadmin,
            roles=[r.name for r in self.roles],
            last_login_at=self.last_login_at.isoformat() if self.last_login_at else None,
        )
        if with_permissions:
            data["permissions"] = sorted(self.permission_codes())
        return data


class TokenBlocklist(db.Model):
    """Revoked JWT ids (logout / refresh rotation), checked on every request."""
    __tablename__ = "token_blocklist"

    id: Mapped[int] = mapped_column(primary_key=True)
    jti: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    token_type: Mapped[str] = mapped_column(String(16), nullable=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
