"""
Configuración de pytest para el ML service.
Añade el directorio raíz al sys.path para importar módulos correctamente.
"""
import sys
import os

# Asegurar que el directorio raíz del ml-service esté en el path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
