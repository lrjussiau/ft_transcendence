"""from rest_framework import serializers
from django.apps import apps

class DynamicFieldsModelSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        # Remove 'fields' from kwargs to manually process it
        fields = kwargs.pop('fields', None)
        super(DynamicFieldsModelSerializer, self).__init__(*args, **kwargs)
        
        if fields:
            # Drop any fields that are not specified in the 'fields' argument.
            allowed = set(fields)
            existing = set(self.fields)
            for field_name in existing - allowed:
                self.fields.pop(field_name)

    class Meta:
        model = None
        fields = '__all__' 

from rest_framework import serializers
from django.apps import apps

class DynamicFieldsModelSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        # Remove 'fields' and 'model_name' from kwargs to manually process it
        fields = kwargs.pop('fields', None)
        model_name = kwargs.pop('model_name', None)

        if model_name:
            self.Meta.model = apps.get_model(model_name)
            
        super(DynamicFieldsModelSerializer, self).__init__(*args, **kwargs)
        
        if fields:
            # Drop any fields that are not specified in the 'fields' argument.
            allowed = set(fields)
            existing = set(self.fields)
            for field_name in existing - allowed:
                self.fields.pop(field_name)

    class Meta:
        model = None
        fields = '__all__' """

from rest_framework import serializers
from django.apps import apps

class DynamicFieldsModelSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        # Remove 'fields' from kwargs to manually process it
        fields = kwargs.pop('fields', None)
        super(DynamicFieldsModelSerializer, self).__init__(*args, **kwargs)
        
        if fields:
            # Drop any fields that are not specified in the 'fields' argument.
            allowed = set(fields)
            existing = set(self.fields)
            for field_name in existing - allowed:
                self.fields.pop(field_name)

    @property
    def model(self):
        model_name = self.context.get('model_name')
        return apps.get_model('db', model_name) if model_name else None

    class Meta:
        model = None
        fields = '__all__'

    def get_fields(self):
        model = self.model
        if not model:
            raise ValueError("Model must be provided through context.")
        
        self.Meta.model = model
        return super(DynamicFieldsModelSerializer, self).get_fields()

