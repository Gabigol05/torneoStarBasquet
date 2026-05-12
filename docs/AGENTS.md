# Contexto del Proyecto: Star Básquet

## 1. Visión General
"Star Básquet" es una plataforma integral para la gestión de torneos de básquetbol (femenino y masculino) en Córdoba, Argentina. El objetivo principal es modernizar la visualización de resultados y automatizar la carga de estadísticas mediante Inteligencia Artificial.

## 2. Stack Tecnológico
Para garantizar la escalabilidad y la integración de IA, el proyecto utiliza:
- **Frontend**: React + Vite + Tailwind CSS (Enfoque modular y mobile-first).
- **Backend**: Django (Python) para la lógica de negocio y procesamiento de datos[cite: 1].
- **Base de Datos**: PostgreSQL para el manejo relacional de equipos, jugadores y partidos[cite: 1].
- **IA/Vision**: Integración de modelos de lenguaje de visión (VLM) para procesar planillas de estadísticas[cite: 1].

## 3. Módulo Crítico: Automatización OCR
El sistema debe procesar imágenes de planillas (como `image_ff87d0.jpg`) para extraer estadísticas[cite: 1].
- **Flujo**: Captura de imagen -> Backend Python (OCR/VLM) -> Validación en Frontend -> Persistencia[cite: 1].
- **Campos Clave**: Puntos (PTS), Valoración (VAL), Faltas (FP/FT), y estadísticas de tiro (SC, SF, DC, DF, etc.)[cite: 1].
- **Desafío**: Manejar reflejos en pantalla y distorsiones en las fotos de los monitores[cite: 1].

## 4. Arquitectura de Datos (Modelos)
Los agentes deben respetar la relación jerárquica:
1. **Torneo**: Posee múltiples categorías (Masculino/Femenino)[cite: 1].
2. **Equipo**: Pertenece a una categoría y tiene una lista de Jugadores[cite: 1].
3. **Partido**: Vincula dos equipos, una sede (Córdoba Capital) y un conjunto de estadísticas[cite: 1].
4. **Estadística**: Registro individual por jugador y por partido[cite: 1].

## 5. Reglas de Colaboración (Git Workflow)
- **Prohibido**: Commitear directamente a la rama `main`[cite: 1].
- **Flujo**: Cada tarea (feature) debe tener su propia rama (ej: `feature/ocr-processor`)[cite: 1].
- **Integración**: Los cambios se integran mediante Pull Requests revisados por el equipo[cite: 1].

## 6. Principios de UI/UX
- **Mobile-First**: Los usuarios consultan el fixture en las canchas los sábados[cite: 1].
- **Validación Humana**: Siempre mostrar una pre-visualización de los datos extraídos por la IA antes de guardarlos definitivamente[cite: 1].