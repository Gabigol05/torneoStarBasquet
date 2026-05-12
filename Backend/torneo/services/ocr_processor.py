"""
Procesamiento OCR / visión para planillas de estadísticas (ej. image_ff87d0.jpg).

Punto de extensión: aquí se integrará un VLM u OCR real sin acoplarlo a vistas.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, BinaryIO


@dataclass
class OCRResult:
    """Resultado normalizado listo para validación en frontend."""

    raw: dict[str, Any] = field(default_factory=dict)
    jugadores: list[dict[str, Any]] = field(default_factory=list)
    errores: list[str] = field(default_factory=list)


class OCRProcessor:
    """
    Recibe una imagen de planilla y devuelve datos estructurados.

    Uso previsto:
        OCRProcessor().process_path(Path("media/uploads/image_ff87d0.jpg"))
        OCRProcessor().process_bytes(stream, filename="image_ff87d0.jpg")
    """

    def process_path(self, path: str | Path) -> OCRResult:
        path = Path(path)
        if not path.is_file():
            return OCRResult(errores=[f"No existe el archivo: {path}"])
        data = path.read_bytes()
        return self.process_bytes(data, filename=path.name)

    def process_bytes(self, data: bytes, *, filename: str) -> OCRResult:
        _ = filename
        if not data:
            return OCRResult(errores=["Imagen vacía"])
        # Placeholder: sin motor OCR aún; devolver estructura mínima documentada.
        return OCRResult(
            raw={"fuente": "OCRProcessor", "bytes": len(data)},
            jugadores=[],
            errores=[],
        )

    def process_upload(self, fileobj: BinaryIO, *, filename: str) -> OCRResult:
        try:
            data = fileobj.read()
        except OSError as exc:
            return OCRResult(errores=[str(exc)])
        return self.process_bytes(data, filename=filename)
