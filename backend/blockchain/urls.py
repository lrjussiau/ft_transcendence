from django.urls import path
from .views import GenericModelView

urlpatterns = [
    path('blockchain/', GenericModelView.as_view(), name='generic_model_view'),
]