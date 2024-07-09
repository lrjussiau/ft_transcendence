from django.urls import path
from .views import *

urlpatterns = [
    path('<str:operation_requested>/', endpoint_handler, name='endpoint_handler'),
    path('integrity-check/<int:user_id>/', IntegrityCheck.as_view(), name='integrity-check'),
]