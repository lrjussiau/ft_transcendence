import random
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
import logging
from django.utils import timezone

def generate_and_send_2fa_code(user):
    code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    logging.info(f"2FA code for user {user.username}: {code}")
    user.two_factor_code = code
    user.two_factor_code_timestamp = timezone.now()
    user.save()

    subject = '2FA Verification Code'
    message = f'Your 2FA verification code is: {code}. This code will expire in 10 minutes.'
    from_email = 'noreply@yourapp.com'
    recipient_list = [user.email]
    
    send_mail(subject, message, from_email, recipient_list)
    
    print(f"2FA code for user {user.username}: {code}")  # For debugging

def verify_2fa_code(user, code):
    if user.two_factor_code == code:
        if timezone.now() <= user.two_factor_code_timestamp + timedelta(minutes=10):
            user.two_factor_code = None
            user.two_factor_code_timestamp = None
            user.save()
            return True
    return False