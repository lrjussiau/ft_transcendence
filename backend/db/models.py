# db/models.py

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(username, email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):

    STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('away', 'Away'),
    ]
    #bloc
    username = models.CharField(max_length=30, unique=True)
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)  # Added avatar field
    is_2fa_enabled = models.BooleanField(default=False)
    two_factor_code = models.CharField(max_length=6, blank=True, null=True)
    two_factor_code_timestamp = models.DateTimeField(null=True, blank=True)
    default_avatar = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='offline')
    last_active = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    password = models.CharField(max_length=255)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    objects = UserManager()

    def __str__(self):
        return self.username


class Friend(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_friends')
    friend = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friends')
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

#player1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_player1')
#player2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_player2')
#player1_score = models.IntegerField()
#is_ia = models.BooleanField(default=False)
class Games(models.Model):
    game_id = models.AutoField(primary_key=True) 
    winner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='won_game')
    loser = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lost_game')
    loser_score = models.IntegerField(default = 0)
    match_date = models.DateTimeField(auto_now_add=True)
    is_tournament_game = models.BooleanField(default=False)

class UserStat(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stats')
    total_wins = models.IntegerField(default=0)
    total_losses = models.IntegerField(default=0)
    total_matches = models.IntegerField(default=0)

class Session(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

#python manage.py makemigrations
#python manage.py migrate
