from django.contrib import admin

from .models import Equipo, Estadistica, Jugador, Partido, Sede, Torneo


@admin.register(Torneo)
class TorneoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "anio", "activo", "slug")
    prepopulated_fields = {"slug": ("nombre",)}


@admin.register(Sede)
class SedeAdmin(admin.ModelAdmin):
    list_display = ("nombre", "barrio", "ciudad")


class JugadorInline(admin.TabularInline):
    model = Jugador
    extra = 0


@admin.register(Equipo)
class EquipoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "categoria", "torneo")
    list_filter = ("categoria", "torneo")
    inlines = [JugadorInline]


@admin.register(Jugador)
class JugadorAdmin(admin.ModelAdmin):
    list_display = ("apellido", "nombre", "equipo", "numero", "posicion")
    search_fields = ("nombre", "apellido", "equipo__nombre")


@admin.register(Partido)
class PartidoAdmin(admin.ModelAdmin):
    list_display = ("fecha_hora", "equipo_local", "equipo_visitante", "estado", "sede")
    list_filter = ("estado", "torneo")


@admin.register(Estadistica)
class EstadisticaAdmin(admin.ModelAdmin):
    list_display = ("partido", "jugador", "puntos", "valoracion")
    list_filter = ("partido__torneo",)
