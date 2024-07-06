from db.models import Games, User
from rest_framework import serializers

"""class GameStoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Games
        fields = ['winner', 'loser', 'loser_score', 'is_tournament_game']"""

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