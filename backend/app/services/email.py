import resend
from app.config import settings


async def send_email(to: str, subject: str, html: str) -> bool:
    if not settings.RESEND_API_KEY:
        return False
    try:
        resend.api_key = settings.RESEND_API_KEY
        params = {
            "from": "KhataBox <notifications@khataboxapp.dedyn.io>",
            "to": [to],
            "subject": subject,
            "html": html,
        }
        await resend.Emails.send_async(params)
        return True
    except Exception:
        return False
