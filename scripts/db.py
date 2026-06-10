import os
import psycopg2
import bcrypt
from contextlib import contextmanager


DATABASE_URL = os.getenv("DATABASE_URL")


@contextmanager
def get_connection():
    """Get a connection to the NeonDB Postgres database."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set")

    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()


def _hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_user(
    name: str,
    email: str,
    password: str,
    class_: str,
    curriculum: str,
) -> dict | None:
    """
    Create a new user in the students table.
    Returns the user dict on success, or None if email already exists.
    """
    hashed = _hash_password(password)

    with get_connection() as conn:
        with conn.cursor() as cur:
            # Check for duplicate email
            cur.execute("SELECT uid FROM students WHERE email = %s", (email,))
            if cur.fetchone():
                return None  # Email already exists

            cur.execute(
                """
                INSERT INTO students (name, email, password, class, curriculum)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING uid
                """,
                (name, email, hashed, class_, curriculum),
            )
            uid = cur.fetchone()[0]
            conn.commit()

    return {
        "uid": uid,
        "name": name,
        "email": email,
        "class": class_,
        "curriculum": curriculum,
    }


def authenticate_user(email: str, password: str) -> dict | None:
    """
    Authenticate a user by email and password.
    Returns user dict on success, None on failure.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT uid, name, email, password, class, curriculum FROM students WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()

    if not row:
        return None

    uid, name, email, stored_hash, class_, curriculum = row

    if not _verify_password(password, stored_hash):
        return None

    return {
        "uid": uid,
        "name": name,
        "email": email,
        "class": class_,
        "curriculum": curriculum,
    }


def update_user_profile(uid: int, name: str, class_: str, curriculum: str) -> dict | None:
    """
    Update a user's profile in the database.
    Returns updated user dict or None if user not found.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE students
                SET name = %s, class = %s, curriculum = %s
                WHERE uid = %s
                RETURNING uid, name, email, class, curriculum
                """,
                (name, class_, curriculum, uid),
            )
            row = cur.fetchone()
            conn.commit()

    if not row:
        return None

    uid, name, email, class_, curriculum = row
    return {
        "uid": uid,
        "name": name,
        "email": email,
        "class": class_,
        "curriculum": curriculum,
    }


def get_user_by_id(uid: int) -> dict | None:
    """Fetch a user by their uid."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT uid, name, email, class, curriculum FROM students WHERE uid = %s",
                (uid,),
            )
            row = cur.fetchone()

    if not row:
        return None

    uid, name, email, class_, curriculum = row
    return {
        "uid": uid,
        "name": name,
        "email": email,
        "class": class_,
        "curriculum": curriculum,
    }
