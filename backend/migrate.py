"""Utility script for applying SQL schema migrations."""

from __future__ import annotations

import argparse
from contextlib import closing
from pathlib import Path
import sys

from .db import get_connection


_REPO_ROOT = Path(__file__).resolve().parents[1]
_DEFAULT_SCHEMA_CANDIDATES = [
    _REPO_ROOT / "database" / "schema.sql",
    _REPO_ROOT / "infra" / "database" / "schema.sql",
]


def _default_schema_path() -> Path:
    for candidate in _DEFAULT_SCHEMA_CANDIDATES:
        if candidate.exists():
            return candidate
    # Fall back to the first candidate even if it doesn't exist so argparse shows a sensible default
    return _DEFAULT_SCHEMA_CANDIDATES[0]


def apply_schema(schema_path: Path) -> None:
    """Apply the SQL statements from *schema_path* to the configured database."""
    resolved_path = schema_path.expanduser().resolve()
    if not resolved_path.exists():
        raise FileNotFoundError(f"Schema file not found: {resolved_path}")

    with closing(get_connection()) as connection:
        if connection is None:
            raise RuntimeError("Database connection could not be established. Check your settings.")

        sql = resolved_path.read_text(encoding="utf-8")
        statements = [statement.strip() for statement in sql.split(";") if statement.strip()]

        try:
            with connection.cursor() as cursor:
                for statement in statements:
                    cursor.execute(statement)
            connection.commit()
        except Exception:
            connection.rollback()
            raise


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Apply SQL schema migrations to the configured database.")
    default_schema = _default_schema_path()
    parser.add_argument(
        "schema",
        nargs="?",
        default=default_schema,
        type=Path,
        help=f"Path to the SQL schema file (default: {default_schema})",
    )
    args = parser.parse_args(argv)

    try:
        apply_schema(args.schema)
    except Exception as exc:  # pragma: no cover - script level error reporting
        print(f"Migration failed: {exc}", file=sys.stderr)
        return 1

    print("Schema applied successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
