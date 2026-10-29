# Database schema (SQLite MVP)

SQLite database path: `data/ai_rakshak.db`. SQLAlchemy creates tables at application startup.

## `incidents`
- `id`: integer primary key
- `title`, `description`, `district`
- `latitude`, `longitude`
- `severity`: low / medium / high / critical
- `status`: reported / reviewing / verified / resolved
- `verified`: boolean, false by default
- `is_demo`: marks seeded demonstration records
- `created_at`: UTC timestamp

## `shelters`
- `id`, `name`, `district`, `latitude`, `longitude`
- `capacity`, `occupancy` (seeded illustrative values only)
- `status`, `last_verified_at`, `is_demo`

## `data_sources`
- `id`, `name`, `source_url`, `data_type`
- `access_status`, `licence_status`, `notes`

## Production migration
For a real multi-user deployment, use PostgreSQL + PostGIS, Alembic migrations, proper authentication and role-based access control, rate limits, audit logs, backups, monitoring, retention rules, and security review. Never store plaintext passwords. This MVP intentionally does not collect user accounts or real emergency personal data.
