from db.models import Games, User
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']

class GameRetrieveSerializer(serializers.ModelSerializer):
    winner = UserSerializer()
    loser = UserSerializer()

    class Meta:
        model = Games
        fields = '__all__'