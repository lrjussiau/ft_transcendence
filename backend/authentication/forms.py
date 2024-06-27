# authentication/forms.py

from django import forms
from db.models import User

class AvatarUploadForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['avatar']
