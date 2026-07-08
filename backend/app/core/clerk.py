"""Clerk JWT verification using PyJWT + JWKS endpoint."""

from jwt import PyJWKClient

from app.config import settings

_jwks_client = None


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if _jwks_client is None and settings.CLERK_JWKS_URL:
        _jwks_client = PyJWKClient(settings.CLERK_JWKS_URL, cache_keys=True)
    return _jwks_client


def verify_clerk_token(token: str) -> dict | None:
    client = _get_jwks_client()
    if not client:
        return None
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = __import__("jwt").decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_exp": True},
        )
        return payload
    except Exception:
        return None
