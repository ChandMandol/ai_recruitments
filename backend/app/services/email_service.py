import asyncio
import logging
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional
from urllib.parse import quote_plus
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.analysis import SystemSetting

logger = logging.getLogger("ai_recruitment_hub.email")


async def get_smtp_config_from_db_or_env(db: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """
    Retrieve SMTP configuration from database SystemSetting table with fallback to core settings.
    """
    config = {
        "host": settings.SMTP_HOST or "smtp.gmail.com",
        "port": settings.SMTP_PORT or 587,
        "user": settings.SMTP_USER or "",
        "password": settings.SMTP_PASSWORD or "",
        "from_name": settings.SMTP_FROM_NAME or "AI Recruitment Hub",
        "is_enabled": settings.EMAILS_ENABLED or False,
        "source": "ENVIRONMENT",
    }

    if db is not None:
        try:
            stmt = select(SystemSetting).where(
                SystemSetting.key.in_([
                    "SMTP_HOST",
                    "SMTP_PORT",
                    "SMTP_USER",
                    "SMTP_PASSWORD",
                    "SMTP_FROM_NAME",
                    "EMAILS_ENABLED",
                ])
            )
            res = await db.execute(stmt)
            settings_map = {s.key: s.value for s in res.scalars().all()}

            if "SMTP_HOST" in settings_map:
                config["host"] = settings_map["SMTP_HOST"]
                config["source"] = "DATABASE"
            if "SMTP_PORT" in settings_map:
                try:
                    config["port"] = int(settings_map["SMTP_PORT"])
                except ValueError:
                    pass
            if "SMTP_USER" in settings_map:
                config["user"] = settings_map["SMTP_USER"]
                config["source"] = "DATABASE"
            if "SMTP_PASSWORD" in settings_map:
                config["password"] = settings_map["SMTP_PASSWORD"]
            if "SMTP_FROM_NAME" in settings_map:
                config["from_name"] = settings_map["SMTP_FROM_NAME"]
            if "EMAILS_ENABLED" in settings_map:
                config["is_enabled"] = settings_map["EMAILS_ENABLED"].lower() in ("true", "1", "yes")
        except Exception as e:
            logger.warning(f"Could not load SMTP config from DB, using env fallback: {e}")

    return config


def _send_smtp_sync(
    host: str,
    port: int,
    user: str,
    password: str,
    from_name: str,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    """Synchronous SMTP email delivery function executed in thread worker."""
    sender_address = user or "notifications@recruitmenthub.ai"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{sender_address}>"
    msg["To"] = to_email

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    logger.info(f"Connecting to SMTP server {host}:{port} to send email to {to_email}...")
    with smtplib.SMTP(host, port, timeout=20) as server:
        # Secure the connection using TLS if port is standard submission port (587)
        if port == 587 or port == 25:
            server.starttls()

        if user and password:
            server.login(user, password)

        server.send_message(msg)

    logger.info(f"Successfully dispatched email to {to_email} with subject '{subject}'.")
    return True


async def send_email_async(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> bool:
    """
    Non-blocking async email dispatcher.
    Runs SMTP network transmission in a dedicated worker thread to avoid blocking FastAPI.
    """
    cfg = await get_smtp_config_from_db_or_env(db)

    if not cfg["is_enabled"]:
        logger.info(f"Email dispatcher is disabled. Skipped email to {to_email} [{subject}].")
        return False

    if not cfg["host"] or not cfg["user"]:
        logger.warning(f"SMTP credentials missing. Skipped email to {to_email} [{subject}].")
        return False

    try:
        await asyncio.to_thread(
            _send_smtp_sync,
            host=cfg["host"],
            port=cfg["port"],
            user=cfg["user"],
            password=cfg["password"],
            from_name=cfg["from_name"],
            to_email=to_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
        )
        return True
    except Exception as exc:
        logger.error(f"Failed to deliver SMTP email to {to_email}: {exc}", exc_info=True)
        return False


def build_calendar_invite_url(
    title: str,
    details: str,
    start_time: datetime,
    end_time: datetime,
    location_url: str,
) -> str:
    """Generates an instant Google Calendar event template URL."""
    fmt = "%Y%m%dT%H%M%SZ"
    st = start_time.strftime(fmt)
    et = end_time.strftime(fmt)
    params = f"action=TEMPLATE&text={quote_plus(title)}&dates={st}/{et}&details={quote_plus(details)}&location={quote_plus(location_url)}"
    return f"https://calendar.google.com/calendar/render?{params}"


async def send_interview_invitation_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    start_time: datetime,
    end_time: datetime,
    meeting_link: str,
    instructions: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> bool:
    """Sends a professional branded AI Interview Schedule Confirmation with Google Calendar 1-click link."""
    time_str = start_time.strftime("%A, %B %d, %Y at %I:%M %p") + " UTC"
    calendar_link = build_calendar_invite_url(
        title=f"AI Technical Interview - {job_title}",
        details=f"AI Interview Session for {job_title}.\nAccess Room: {meeting_link}\n\nInstructions: {instructions or 'Test camera and microphone beforehand.'}",
        start_time=start_time,
        end_time=end_time,
        location_url=meeting_link,
    )

    subject = f"Interview Scheduled: {job_title} — AI Recruitment Hub"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
        .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
        .title {{ font-size: 22px; font-weight: 800; margin: 8px 0 4px 0; }}
        .subtitle {{ font-size: 13px; color: #c7d2fe; }}
        .content {{ padding: 28px 24px; }}
        .greeting {{ font-size: 16px; font-weight: 600; margin-bottom: 12px; }}
        .info-box {{ background: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0; border-left: 4px solid #6366f1; }}
        .info-row {{ margin-bottom: 8px; font-size: 14px; }}
        .info-row:last-child {{ margin-bottom: 0; }}
        .info-label {{ font-weight: 700; color: #475569; }}
        .cta-btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; margin: 12px 0; }}
        .calendar-btn {{ display: inline-block; background-color: #ffffff; color: #4338ca !important; border: 1px solid #c7d2fe; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 13px; margin-left: 8px; }}
        .note {{ font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px; }}
        .footer {{ text-align: center; font-size: 11px; color: #94a3b8; padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="font-size: 28px; margin-bottom: 4px;">🎯</div>
          <div class="title">AI Technical Interview Scheduled</div>
          <div class="subtitle">Google Gemini Live & Adaptive Proctoring Engine</div>
        </div>
        <div class="content">
          <div class="greeting">Hello {candidate_name},</div>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Your live AI technical screening for the position of <strong>{job_title}</strong> has been confirmed. Below are your session details:
          </p>
          <div class="info-box">
            <div class="info-row"><span class="info-label">Role:</span> {job_title}</div>
            <div class="info-row"><span class="info-label">Date & Time:</span> {time_str}</div>
            <div class="info-row"><span class="info-label">Instructions:</span> {instructions or 'Ensure your camera and microphone are tested prior to joining.'}</div>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="{meeting_link}" class="cta-btn">Enter AI Interview Room</a>
            <a href="{calendar_link}" target="_blank" class="calendar-btn">📅 Add to Google Calendar</a>
          </div>
          <div class="note">
            <strong>System Checklist before entering:</strong>
            <ul>
              <li>Use a Chrome or Chromium-based modern browser on desktop/laptop.</li>
              <li>Grant camera and microphone permissions when prompted.</li>
              <li>Ensure a quiet, well-lit environment. Anti-cheating proctoring will monitor tab-switching.</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          © 2026 AI Recruitment Hub. Automated system notification.
        </div>
      </div>
    </body>
    </html>
    """

    return await send_email_async(
        to_email=to_email,
        subject=subject,
        html_body=html_content,
        text_body=f"Hello {candidate_name},\n\nYour interview for {job_title} is scheduled for {time_str}.\nAccess Room: {meeting_link}\nAdd to Calendar: {calendar_link}",
        db=db,
    )


async def send_interview_result_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    decision: str,
    score: Optional[float] = None,
    feedback: Optional[str] = None,
    dashboard_url: str = "/candidate/interviews",
    db: Optional[AsyncSession] = None,
) -> bool:
    """Dispatches interview decision notification to candidate."""
    is_positive = decision.upper() in ("SELECTED", "ACCEPTED", "OFFER", "SHORTLISTED")
    badge_bg = "#ecfdf5" if is_positive else "#fef2f2"
    badge_color = "#047857" if is_positive else "#b91c1c"
    badge_border = "#a7f3d0" if is_positive else "#fecaca"

    score_text = f"{score:.1f}%" if score is not None else "Evaluated"
    subject = f"Interview Outcome: {job_title} — {decision.title()}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
        .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
        .title {{ font-size: 22px; font-weight: 800; margin: 8px 0 4px 0; }}
        .content {{ padding: 28px 24px; }}
        .badge {{ display: inline-block; padding: 6px 16px; border-radius: 9999px; font-weight: 800; font-size: 13px; text-transform: uppercase; background: {badge_bg}; color: {badge_color}; border: 1px solid {badge_border}; margin: 12px 0; }}
        .box {{ background: #f8fafc; border-radius: 12px; padding: 18px; margin: 16px 0; border: 1px solid #e2e8f0; }}
        .cta-btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; }}
        .footer {{ text-align: center; font-size: 11px; color: #94a3b8; padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="font-size: 28px;">📊</div>
          <div class="title">Interview Outcome Published</div>
          <div style="font-size: 13px; color: #c7d2fe;">{job_title}</div>
        </div>
        <div class="content">
          <p>Dear {candidate_name},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            The evaluation for your technical assessment for the role of <strong>{job_title}</strong> is now finalized:
          </p>
          <div style="text-align: center;">
            <div class="badge">{decision}</div>
          </div>
          <div class="box">
            <div style="font-size: 13px; margin-bottom: 6px;"><strong>Overall Assessment Score:</strong> {score_text}</div>
            {f'<div style="font-size: 13px; color: #475569; margin-top: 8px;"><strong>Feedback Summary:</strong> {feedback}</div>' if feedback else ''}
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="{dashboard_url}" class="cta-btn">View Full Performance Report</a>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Thank you for participating with AI Recruitment Hub. You can view full radar charts and topic breakdown in your candidate portal.
          </p>
        </div>
        <div class="footer">
          © 2026 AI Recruitment Hub. Automated system notification.
        </div>
      </div>
    </body>
    </html>
    """

    return await send_email_async(
        to_email=to_email,
        subject=subject,
        html_body=html_content,
        text_body=f"Hello {candidate_name},\n\nYour interview outcome for {job_title}: {decision}. Score: {score_text}.\nView report: {dashboard_url}",
        db=db,
    )


async def send_smtp_test_email(
    to_email: str,
    db: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """Test SMTP connection and send a test verification email."""
    cfg = await get_smtp_config_from_db_or_env(db)

    if not cfg["host"] or not cfg["user"]:
        return {
            "success": False,
            "message": "SMTP host or Gmail username is missing in settings.",
            "config": {k: (v if k != "password" else "****") for k, v in cfg.items()},
        }

    subject = "AI Recruitment Hub — Gmail SMTP Connection Test"
    timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: sans-serif; background: #f8fafc; padding: 20px; color: #0f172a; }}
        .card {{ max-width: 500px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; }}
        .success {{ color: #059669; font-weight: bold; font-size: 16px; margin-bottom: 12px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="success">✅ Gmail SMTP Connection Verified!</div>
        <p>This is a test notification dispatched from the <strong>AI Recruitment Hub Admin Dashboard</strong>.</p>
        <p style="font-size: 12px; color: #64748b;">Dispatched at: {timestamp_str}<br>SMTP Host: {cfg['host']}:{cfg['port']}<br>Sender: {cfg['user']}</p>
      </div>
    </body>
    </html>
    """

    try:
        await asyncio.to_thread(
            _send_smtp_sync,
            host=cfg["host"],
            port=cfg["port"],
            user=cfg["user"],
            password=cfg["password"],
            from_name=cfg["from_name"],
            to_email=to_email,
            subject=subject,
            html_body=html_content,
            text_body=f"Gmail SMTP connection verified successfully at {timestamp_str}.",
        )
        return {
            "success": True,
            "message": f"Test email successfully sent to {to_email} via {cfg['host']}:{cfg['port']}!",
        }
    except Exception as exc:
        return {
            "success": False,
            "message": f"SMTP test failed: {str(exc)}",
        }

