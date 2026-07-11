"""Schemas package (marshmallow) — request validation & serialization."""
from app.schemas.auth import LoginSchema, RegisterSchema, login_schema, register_schema

__all__ = ["LoginSchema", "RegisterSchema", "login_schema", "register_schema"]
