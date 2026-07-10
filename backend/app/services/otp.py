import logging
import random
import time

from app.services.cache import get as cache_get, set as cache_set
from app.services.email import send_email

logger = logging.getLogger(__name__)

OTP_TTL = 300  # 5 minutes

_otp_store: dict[str, dict] = {}


async def send_otp(email: str) -> bool:
    otp = str(random.randint(100000, 999999))
    expires_at = time.time() + OTP_TTL

    await cache_set(f"otp:{email}", otp, ttl=OTP_TTL)
    _otp_store[email] = {"otp": otp, "expires_at": expires_at}

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#1e293b;">Your KhataBox OTP</h2>
      <p style="font-size:14px;color:#475569;">Use this code to complete your action:</p>
      <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:16px 0;">
        <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1e293b;">{otp}</span>
      </div>
      <p style="font-size:13px;color:#94a3b8;">Valid for 5 minutes. If you didn't request this, ignore this email.</p>
    </div>
    """
    sent = await send_email(email, "Your KhataBox OTP", html)
    if sent:
        logger.info("OTP sent to %s", email)
    else:
        logger.warning("Failed to send OTP to %s", email)
    return sent


async def verify_otp(email: str, otp: str) -> bool:
    cached = await cache_get(f"otp:{email}")
    if cached is not None:
        if str(cached) == otp:
            await cache_set(f"otp:{email}", None, ttl=1)
            _otp_store.pop(email, None)
            logger.info("OTP verified for %s (from cache)", email)
            return True
        logger.warning("OTP mismatch for %s: expected %s, got %s", email, cached, otp)
        return False

    record = _otp_store.get(email)
    if record and record["otp"] == otp and time.time() < record["expires_at"]:
        del _otp_store[email]
        logger.info("OTP verified for %s (from memory)", email)
        return True

    if record and record["otp"] != otp:
        logger.warning("OTP mismatch for %s (memory)", email)
    elif record and time.time() >= record["expires_at"]:
        logger.warning("OTP expired for %s", email)

    return False
