import logging
import random
import re
import time

from fastapi import HTTPException, status

from app.services.cache import get as cache_get, set as cache_set
from app.services.email import send_email

logger = logging.getLogger(__name__)

EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
OTP_TTL = 300  # 5 minutes

# In-memory fallback store: email -> (otp, expiry_timestamp)
_otp_store: dict[str, tuple[str, float]] = {}


async def send_otp(email: str) -> bool:
    if not email or not re.match(EMAIL_REGEX, email):
        logger.warning("Invalid email syntax: %s", email)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="incorrect email")

    otp = str(random.randint(100000, 999999))

    await cache_set(f"otp:{email}", otp, ttl=OTP_TTL)
    _otp_store[email] = (otp, time.time() + OTP_TTL)

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

    sent = await send_email(email, "Your KhataBox OTP Verification Code", html)

    if sent:
        logger.info("OTP sent to %s", email)
        return True
    else:
        logger.warning("Failed to send OTP via Resend to %s", email)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="incorrect email")


async def verify_otp(email: str, otp: str) -> bool:
    # Try Redis first
    stored = await cache_get(f"otp:{email}")
    if stored is not None and stored == otp:
        return True

    # Fallback to in-memory store (Redis may be unavailable)
    entry = _otp_store.get(email)
    if entry is None:
        return False
    stored_otp, expires = entry
    if time.time() > expires:
        del _otp_store[email]
        return False
    if stored_otp != otp:
        return False
    del _otp_store[email]
    return True
