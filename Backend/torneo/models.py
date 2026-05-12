from django.db import models


class CategoriaTorneo(models.TextChoices):
    FEMENINO = "F", "Femenino"
    MASCULINO = "M", "Masculino"


class EstadoPartido(models.TextChoices):
    PROGRAMADO = "programado", "Programado"
    EN_JUEGO = "en_juego", "En juego"
    FINALIZADO = "finalizado", "Finalizado"
    POSTERGADO = "postergado", "Postergado"


class Torneo(models.Model):
    nombre = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    anio = models.PositiveSmallIntegerField()
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-anio", "nombre"]

    def __str__(self) -> str:
        return f"{self.nombre} ({self.anio})"


class Sede(models.Model):
    """Sedes en Córdoba Capital y alrededores."""

    nombre = models.CharField(max_length=160)
    barrio = models.CharField(max_length=120, blank=True)
    direccion = models.CharField(max_length=200, blank=True)
    ciudad = models.CharField(max_length=80, default="Córdoba")
    provincia = models.CharField(max_length=80, default="Córdoba")
    notas = models.TextField(blank=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class Equipo(models.Model):
    torneo = models.ForeignKey(Torneo, on_delete=models.CASCADE, related_name="equipos")
    categoria = models.CharField(max_length=1, choices=CategoriaTorneo.choices)
    nombre = models.CharField(max_length=120)
    abreviatura = models.CharField(max_length=8, blank=True)
    escudo = models.ImageField(upload_to="escudos/", blank=True, null=True)

    class Meta:
        ordering = ["categoria", "nombre"]
        unique_together = [("torneo", "categoria", "nombre")]

    def __str__(self) -> str:
        return f"{self.get_categoria_display()} · {self.nombre}"


class Jugador(models.Model):
    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="jugadores")
    nombre = models.CharField(max_length=80)
    apellido = models.CharField(max_length=80)
    numero = models.PositiveSmallIntegerField(blank=True, null=True)
    posicion = models.CharField(max_length=32, blank=True)

    class Meta:
        ordering = ["apellido", "nombre"]

    def __str__(self) -> str:
        return f"{self.apellido}, {self.nombre}"


class Partido(models.Model):
    torneo = models.ForeignKey(Torneo, on_delete=models.CASCADE, related_name="partidos")
    sede = models.ForeignKey(Sede, on_delete=models.PROTECT, related_name="partidos")
    fecha_hora = models.DateTimeField()
    equipo_local = models.ForeignKey(
        Equipo, on_delete=models.PROTECT, related_name="partidos_como_local"
    )
    equipo_visitante = models.ForeignKey(
        Equipo, on_delete=models.PROTECT, related_name="partidos_como_visitante"
    )
    puntos_local = models.PositiveSmallIntegerField(blank=True, null=True)
    puntos_visitante = models.PositiveSmallIntegerField(blank=True, null=True)
    estado = models.CharField(
        max_length=20, choices=EstadoPartido.choices, default=EstadoPartido.PROGRAMADO
    )
    jornada = models.PositiveSmallIntegerField(blank=True, null=True)
    notas = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-fecha_hora"]

    def __str__(self) -> str:
        return f"{self.equipo_local} vs {self.equipo_visitante}"


class Estadistica(models.Model):
    """Registro por jugador y partido (planilla / OCR)."""

    partido = models.ForeignKey(Partido, on_delete=models.CASCADE, related_name="estadisticas")
    jugador = models.ForeignKey(Jugador, on_delete=models.CASCADE, related_name="estadisticas")
    minutos = models.PositiveSmallIntegerField(blank=True, null=True)
    puntos = models.PositiveSmallIntegerField(default=0)
    valoracion = models.SmallIntegerField(default=0)
    faltas_personales = models.PositiveSmallIntegerField(default=0)
    faltas_tecnicas = models.PositiveSmallIntegerField(default=0)
    tiros_simples_convertidos = models.PositiveSmallIntegerField(default=0)
    tiros_simples_fallados = models.PositiveSmallIntegerField(default=0)
    tiros_dobles_convertidos = models.PositiveSmallIntegerField(default=0)
    tiros_dobles_fallados = models.PositiveSmallIntegerField(default=0)
    tiros_triples_convertidos = models.PositiveSmallIntegerField(default=0)
    tiros_triples_fallados = models.PositiveSmallIntegerField(default=0)
    rebotes_ofensivos = models.PositiveSmallIntegerField(default=0)
    rebotes_defensivos = models.PositiveSmallIntegerField(default=0)
    asistencias = models.PositiveSmallIntegerField(default=0)
    robos = models.PositiveSmallIntegerField(default=0)
    tapones = models.PositiveSmallIntegerField(default=0)
    perdidas = models.PositiveSmallIntegerField(default=0)
    datos_crudos_ocr = models.JSONField(blank=True, null=True)

    class Meta:
        unique_together = [("partido", "jugador")]
        verbose_name_plural = "estadísticas"

    def __str__(self) -> str:
        return f"{self.jugador} · {self.partido}"
