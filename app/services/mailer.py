import smtplib
import os
from email.message import EmailMessage
from dotenv import load_dotenv

def send_newsletter(recipient_email, subject, html_content):
    """
    Sends the generated AI Newsletter to the user's email via Gmail SMTP.
    """
    load_dotenv(override=True)
    sender_email = os.environ.get("SENDER_EMAIL")
    sender_password = os.environ.get("SENDER_PASSWORD")
    
    if not sender_email or not sender_password or sender_email == "your_gmail_address@gmail.com":
        print("Mailing Error: SENDER_EMAIL or SENDER_PASSWORD not configured in .env file!")
        return False
        
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"AI News Aggregator <{sender_email}>"
    msg['To'] = recipient_email
    
    # Set the content of the email to our beautifully formatted HTML!
    msg.set_content("Please enable HTML to view this email.")
    msg.add_alternative(html_content, subtype='html')
    
    try:
        print(f"Connecting to Gmail SMTP to send email to {recipient_email}...")
        # Connect to Gmail's SMTP server via TLS (Port 587)
        with smtplib.SMTP('smtp.gmail.com', 587) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(sender_email, sender_password)
            smtp.send_message(msg)
        print("Email sent successfully!")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
