from django.shortcuts import render
from rest_framework.generics import ListCreateAPIView
from django.apps import apps
from django.core.exceptions import ValidationError
from rest_framework.response import Response
from .serializers import DynamicFieldsModelSerializer

class GenericModelView(ListCreateAPIView):
    serializer_class = DynamicFieldsModelSerializer

    def get_queryset(self):
        model_name = self.kwargs.get('model_name')
        try:
            model = apps.get_model('db', model_name)  # Ensure 'db' is your actual app label
        except LookupError:
            raise ValidationError(f"No model named '{model_name}' found.")

        # Example to handle complex dynamic filtering, e.g., ?fields=id,name&filter=id__gt=5
        queryset = model.objects.all()
        filter_kwargs = {k.split('filter__')[1]: v for k, v in self.request.query_params.items() if "filter__" in k}
        queryset = queryset.filter(**filter_kwargs)
        
        return queryset

    def get_serializer_context(self):
        context = super(GenericModelView, self).get_serializer_context()
        context.update({
            'model_name': self.kwargs.get('model_name')
        })
        return context

