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

    class Meta:
        model = None
        fields = '__all__'