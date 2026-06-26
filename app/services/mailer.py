import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from dotenv import load_dotenv

def send_newsletter(recipient_email, subject, html_content):
    """
    Sends the generated AI Newsletter to the user's email via Brevo (Sendinblue) HTTP API.
    Uses HTTPS (port 443) so it works on Railway and all cloud hosts.
    """
    load_dotenv(override=True)
    
    api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("SENDER_EMAIL", "temporar388y@gmail.com")
    
    if not api_key:
        print("Mailing Error: BREVO_API_KEY not configured!")
        return False
        
    try:
        print(f"Sending email via Brevo API to {recipient_email}...")
        
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = api_key
        
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
            sib_api_v3_sdk.ApiClient(configuration)
        )
        
        email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": recipient_email}],
            sender={"name": "AI News Aggregator", "email": sender_email},
            subject=subject,
            html_content=html_content
        )
        
        api_instance.send_transac_email(email)
        print("Email sent successfully!")
        return True
    except ApiException as e:
        print(f"Brevo API error: {e}")
        return False
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
