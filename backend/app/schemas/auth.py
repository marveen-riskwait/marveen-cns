"""Marshmallow schemas validating auth request bodies."""
from __future__ import annotations

from marshmallow import Schema, fields, validate


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=1))


class RegisterSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    first_name = fields.String(load_default=None, allow_none=True)
    last_name = fields.String(load_default=None, allow_none=True)


login_schema = LoginSchema()
register_schema = RegisterSchema()
