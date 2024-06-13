from django.urls import path
from .views import GenericModelView

urlpatterns = [
    path('<str:model_name>/', GenericModelView.as_view(), name='generic_model_view'),
]