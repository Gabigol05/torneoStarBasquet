# 🏀 Torneo de Básquet - Córdoba Capital

¡Bienvenido al repositorio oficial del sistema de gestión para nuestro torneo de básquet! Este proyecto nace con la idea de profesionalizar la liga amateur que jugamos con amigos en la ciudad de Córdoba, brindando una plataforma robusta para seguir estadísticas, resultados y posiciones en tiempo real.

El objetivo es pasar de los grupos de WhatsApp y las planillas de Excel a una **web app totalmente responsive** y eficiente.

---

## 🚀 Tecnologías Utilizadas

El proyecto utiliza un stack desacoplado para separar la lógica de negocio de la interfaz de usuario:

### Frontend
* **React (Vite):** Para una interfaz de usuario rápida y reactiva.
* **Tailwind CSS:** Para un diseño moderno, personalizado y 100% adaptable a dispositivos móviles y tablets.
* **React Router:** Gestión de navegación interna.

### Backend
* **Django:** Framework de alta velocidad para el desarrollo del servidor.
* **Django REST Framework (DRF):** Para la creación de una API robusta que alimenta al frontend.
* **Python:** Lenguaje principal para la lógica de datos y gestión de torneos.
* **SQLite / PostgreSQL:** Gestión de base de datos para equipos, jugadores y estadísticas.

---

## ✨ Características Principales

* **📱 Diseño Full Responsive:** Optimizado para que los jugadores puedan revisar los resultados desde el celular apenas terminan el partido en la cancha.
* **📊 Tablas de Posiciones:** Cálculo automático de puntos, partidos ganados/perdidos y diferencia de tantos.
* **📅 Calendario de Partidos:** Visualización de fechas, horarios y canchas designadas en Córdoba.
* **🔥 Estadísticas Individuales:** Seguimiento de goleadores, faltas y figuras del partido.
* **🛡️ Panel de Administración:** Gestión de resultados y carga de datos protegida para los organizadores.
