from django.urls import path
from . import views

urlpatterns = [
    path('<str:operation_requested>/', views.endpoint_handler, name='endpoint_handler'),
]