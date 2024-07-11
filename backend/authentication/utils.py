import random
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
import logging
from django.conf import settings


def generate_and_send_2fa_code(user):
    logging.info(f"Generating 2FA code for user {user.username}")
    logging.info(f"user email : {user.email}")
    code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    user.two_factor_code = code
    user.two_factor_code_timestamp = timezone.now()
    user.save()

    subject = '2FA Verification Code'
    message = f'Your 2FA verification code is: {code}. This code will expire in 10 minutes.'
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [user.email]
    
    try:
        send_mail(subject, message, from_email, recipient_list, fail_silently=False)
        logging.info(f"2FA code sent successfully to user {user.username}")
    except Exception as e:
        logging.error(f"Failed to send 2FA code email to {user.username}: {str(e)}")

    logging.info(f"2FA code for user {user.username}: {code}")  # For debugging

def verify_2fa_code(user, code):
    if user.two_factor_code == code:
        if timezone.now() <= user.two_factor_code_timestamp + timedelta(minutes=10):
            user.two_factor_code = None
            user.two_factor_code_timestamp = None
            user.save()
            return True
    return False