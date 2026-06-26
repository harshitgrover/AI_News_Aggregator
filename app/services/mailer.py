import os
import resend
from dotenv import load_dotenv

def send_newsletter(recipient_email, subject, html_content):
    """
    Sends the generated AI Newsletter to the user's email via Resend API.
    """
    load_dotenv(override=True)
    resend.api_key = os.environ.get("RESEND_API_KEY")
    
    if not resend.api_key:
        print("Mailing Error: RESEND_API_KEY not configured in .env file!")
        return False
        
    try:
        print(f"Connecting to Resend API to send email to {recipient_email}...")
        params = {
            # Since the user hasn't verified a custom domain yet, we must use Resend's default sender:
            "from": "AI News <onboarding@resend.dev>",
            "to": [recipient_email],
            "subject": subject,
            "html": html_content
        }
        
        resend.Emails.send(params)
        print("Email sent successfully!")
        return True
    except Exception as e:
        print(f"Failed to send email via Resend: {e}")
        return False
