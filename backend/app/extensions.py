"""Shared Flask extension singletons for Marveen CMS.

Each extension is instantiated here *without* an application and bound later
in the app factory through ``init_app()``. Every module imports these same
singletons, which keeps wiring in one place and avoids circular imports.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_marshmallow import Marshmallow
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# ORM + migrations
db = SQLAlchemy()
migrate = Migrate()

# Auth (JWT in httpOnly cookies)
jwt = JWTManager()

# Cross-origin (configured with an explicit origin list in the factory)
cors = CORS()

# (De)serialization / validation
ma = Marshmallow()

# Rate limiting — no global default; limits are declared per route
# (e.g. on auth endpoints). Storage backend is set in the factory.
limiter = Limiter(key_func=get_remote_address, default_limits=[])
