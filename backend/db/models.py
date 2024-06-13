from django.db import models

class User(models.Model):
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    avatar_url = models.URLField(blank=True, null=True)
    default_avatar = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=50)

class Friend(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_friends')
    friend = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friends')
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

class Match(models.Model):
    game_hash = models.CharField(max_length=255)
    player1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_player1')
    player2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_player2')
    winner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='won_matches')
    player1_score = models.IntegerField()
    player2_score = models.IntegerField()
    match_date = models.DateTimeField()
    is_ia = models.BooleanField(default=False)

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
