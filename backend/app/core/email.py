"""
core/email.py
──────────────
Asynchronous SMTP email dispatch system for Attend AI.
Handles transactional emails (Password Reset, Welcome Emails, Notifications).
"""

import asyncio
import logging
import smtplib
from email.message import EmailMessage
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _send_smtp_email_sync(to_email: str, subject: str, html_content: str, text_content: str) -> bool:
    """Synchronous SMTP email worker to be offloaded to thread executor."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
    msg["To"] = to_email
    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype="html")

    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.send_message(msg)
        server.quit()
        logger.info("📧 Email successfully sent to %s via SMTP (%s)", to_email, settings.SMTP_HOST)
        return True
    except Exception as exc:
        logger.error("❌ Failed to send SMTP email to %s: %s", to_email, exc)
        return False


async def send_password_reset_email(to_email: str, reset_link: str, user_name: str = "User") -> bool:
    """
    Sends a styled Password Reset HTML email to the specified recipient.
    Offloads SMTP socket calls to thread pool to prevent blocking FastAPI event loop.
    """
    subject = "Reset Your Password — Attend AI"
    
    text_content = (
        f"Hello {user_name},\n\n"
        f"We received a request to reset your password for your Attend AI account.\n\n"
        f"Click the link below to set a new password:\n{reset_link}\n\n"
        f"This link will expire in 30 minutes.\n"
        f"If you did not request a password reset, please ignore this email.\n\n"
        f"Best regards,\nAttend AI Security Team"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }}
        .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }}
        .logo-box {{ background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #ffffff; padding: 12px 20px; border-radius: 12px; display: inline-block; font-weight: 800; font-size: 20px; margin-bottom: 24px; }}
        h2 {{ font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 0; }}
        p {{ font-size: 15px; color: #475569; line-height: 1.6; }}
        .btn {{ display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 20px 0; box-shadow: 0 4px 14px rgba(109, 40, 217, 0.4); }}
        .footer {{ margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #94a3b8; text-align: center; }}
        .token-box {{ background: #f5f3ff; border: 1px dashed #c4b5fd; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-all; color: #4c1d95; margin-top: 10px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-box">Attend AI</div>
        <h2>Reset Your Password</h2>
        <p>Hello <strong>{user_name}</strong>,</p>
        <p>We received a request to reset the password for your Attend AI account registered with <strong>{to_email}</strong>.</p>
        <p>Click the button below to choose a new password. This link is valid for <strong>30 minutes</strong>:</p>
        
        <div style="text-align: center;">
          <a href="{reset_link}" target="_blank" class="btn">Reset My Password</a>
        </div>

        <p style="font-size: 13px; color: #64748b;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <div class="token-box">{reset_link}</div>

        <div class="footer">
          If you did not request a password reset, you can safely ignore this email.<br>
          &copy; Attend AI Inc. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

    # Dispatch email in background non-blocking task so API responds instantly
    if settings.SMTP_HOST and settings.SMTP_USER:
        asyncio.create_task(
            asyncio.to_thread(_send_smtp_email_sync, to_email, subject, html_content, text_content)
        )
        return True
    else:
        logger.warning(
            "⚠️ SMTP credentials not configured in .env!\nReset Link: %s", reset_link
        )
        return False
