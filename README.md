# Marveen CMS

CMS moderne et générique (Flask + React) pour créer n'importe quel site
vitrine en quelques minutes. RDV Cycles n'est qu'un **thème + des données**,
pas le produit.

## Stack

- **Backend** : Python 3.13 · Flask (app factory) · SQLAlchemy · Alembic
  (Flask-Migrate) · Flask-JWT-Extended (cookies httpOnly + refresh + CSRF) ·
  Marshmallow · Flask-Limiter · PostgreSQL (repli SQLite en dev) · Gunicorn
- **Frontend** (à venir) : React 19 · React Router · Context API · Axios ·
  Bootstrap 5.3 · Vite

## Architecture

```
backend/
  app/
    __init__.py        # app factory (create_app)
    config.py          # configuration typée par environnement
    extensions.py      # singletons (db, migrate, jwt, cors, ma, limiter)
    models/            # BaseModel (soft-delete) + modèles par module
    routes/            # blueprints REST, montés sous /api
    services/          # logique métier (sans HTTP)
    schemas/           # validation / sérialisation (marshmallow)
    permissions/       # RBAC (décorateurs require_permission / require_role)
    utils/             # erreurs JSON, réponses paginées
    seeds/             # permissions, rôles, super-admin
  migrations/          # Alembic
  wsgi.py              # point d'entrée (gunicorn wsgi:app)
frontend/              # (à venir)
```

## Démarrer le backend

```bash
cd backend
cp .env.example .env                      # ajuster si besoin
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
export FLASK_APP=wsgi.py APP_ENV=development
flask db upgrade                          # applique les migrations
flask seed                                # permissions, rôles, super-admin
python wsgi.py                            # API sur http://localhost:3001
```

Super-admin par défaut : `admin@marveen.cms` / `ChangeMe123!` (à changer).

## Sécurité & conventions

- JWT en **cookies httpOnly** (access court + refresh rotatif) + **CSRF**,
  révocation via `token_blocklist`.
- **RBAC** : `User` → `Role` → `Permission` (code `module.action`).
  `is_superadmin` court-circuite toute vérification.
- **Soft-delete** généralisé (`deleted_at`) pour la Corbeille.
- Réponses JSON normalisées : `{ ok, data }` / `{ items, meta }` /
  `{ ok:false, message }`.

## Feuille de route (modules)

Auth+RBAC ✅ · CRUD générique · Pages + Page Builder (blocs JSONB) · Menus ·
SEO · Médias (WebP/miniatures) · PDF (lecteur intégré) · Blog/Actus/Catégories ·
FAQ · Partenaires/Marques/Équipe · Événements/Réservations · Témoignages ·
Paramètres · Logs · Historique · Corbeille · Sauvegardes · Dashboard · Front admin.
