from django.urls import path
from . import views

urlpatterns = [
    path('retrieve_data/<int:user_id>/', views.RetrieveGameData.as_view(), name='retrieve-game-data'),
    path('user_stats/<int:user_id>/', views.user_stats, name='user_stats'),
]