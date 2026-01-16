"""
Whisper Transcriber Service
Utiliza faster-whisper para transcribir audio a texto de forma eficiente.
"""
import os
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directorio para modelos de Whisper
MODELS_DIR = Path("/root/.cache/huggingface")


@dataclass
class TranscriptionSegment:
    """Representa un segmento de la transcripción con timestamps."""
    start: float
    end: float
    text: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'start': round(self.start, 2),
            'end': round(self.end, 2),
            'text': self.text.strip()
        }


@dataclass 
class TranscriptionResult:
    """Resultado completo de una transcripción."""
    text: str
    segments: List[TranscriptionSegment]
    language: str
    duration: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'text': self.text,
            'segments': [seg.to_dict() for seg in self.segments],
            'language': self.language,
            'duration': round(self.duration, 2),
            'word_count': len(self.text.split())
        }


class WhisperTranscriber:
    """
    Servicio para transcribir audio usando faster-whisper.
    Optimizado para balance entre velocidad y calidad.
    """
    
    # Modelos disponibles ordenados por tamaño/calidad
    AVAILABLE_MODELS = ['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3']
    DEFAULT_MODEL = 'small'  # Balance óptimo velocidad/calidad
    
    def __init__(self, model_name: Optional[str] = None, device: str = "auto"):
        """
        Inicializa el transcriptor.
        
        Args:
            model_name: Nombre del modelo Whisper a usar
            device: 'cuda', 'cpu', o 'auto' para detección automática
        """
        self.model_name = model_name or self.DEFAULT_MODEL
        self.device = self._detect_device(device)
        self.compute_type = self._get_compute_type()
        self._model = None
        
        logger.info(f"WhisperTranscriber inicializado: modelo={self.model_name}, device={self.device}")
    
    def _detect_device(self, device: str) -> str:
        """Detecta automáticamente el dispositivo disponible."""
        if device != "auto":
            return device
        
        try:
            import torch
            if torch.cuda.is_available():
                logger.info("CUDA disponible, usando GPU")
                return "cuda"
        except ImportError:
            pass
        
        logger.info("Usando CPU para transcripción")
        return "cpu"
    
    def _get_compute_type(self) -> str:
        """Determina el tipo de cómputo óptimo según el dispositivo."""
        if self.device == "cuda":
            return "float16"  # Más rápido en GPU
        return "int8"  # Más eficiente en CPU
    
    def _load_model(self):
        """Carga el modelo de Whisper (lazy loading)."""
        if self._model is None:
            logger.info(f"Cargando modelo Whisper '{self.model_name}'...")
            
            try:
                from faster_whisper import WhisperModel
                
                self._model = WhisperModel(
                    self.model_name,
                    device=self.device,
                    compute_type=self.compute_type,
                    download_root=str(MODELS_DIR)
                )
                
                logger.info("Modelo cargado exitosamente")
                
            except Exception as e:
                logger.error(f"Error cargando modelo: {e}")
                raise RuntimeError(f"No se pudo cargar el modelo Whisper: {e}")
        
        return self._model
    
    def transcribe(
        self, 
        audio_path: str,
        language: Optional[str] = None,
        task: str = "transcribe",
        include_timestamps: bool = True
    ) -> TranscriptionResult:
        """
        Transcribe un archivo de audio.
        
        Args:
            audio_path: Ruta al archivo de audio
            language: Código de idioma (ej: 'es', 'en'). None para auto-detección.
            task: 'transcribe' para mantener idioma original, 'translate' para traducir a inglés
            include_timestamps: Si incluir timestamps por segmento
            
        Returns:
            TranscriptionResult con texto completo, segmentos y metadata
        """
        # Validar que el archivo existe
        audio_file = Path(audio_path)
        if not audio_file.exists():
            raise FileNotFoundError(f"Archivo de audio no encontrado: {audio_path}")
        
        logger.info(f"Iniciando transcripción de: {audio_path}")
        
        # Cargar modelo
        model = self._load_model()
        
        try:
            # Realizar transcripción
            segments_generator, info = model.transcribe(
                audio_path,
                language=language,
                task=task,
                beam_size=5,  # Balance precisión/velocidad
                best_of=5,
                temperature=0.0,  # Determinístico
                condition_on_previous_text=True,
                vad_filter=True,  # Filtrar silencio para mayor velocidad
                vad_parameters=dict(
                    min_silence_duration_ms=500,
                ),
            )
            
            # Procesar segmentos
            segments = []
            full_text_parts = []
            
            for segment in segments_generator:
                seg = TranscriptionSegment(
                    start=segment.start,
                    end=segment.end,
                    text=segment.text
                )
                segments.append(seg)
                full_text_parts.append(segment.text.strip())
            
            full_text = " ".join(full_text_parts)
            
            result = TranscriptionResult(
                text=full_text,
                segments=segments if include_timestamps else [],
                language=info.language,
                duration=info.duration
            )
            
            logger.info(
                f"Transcripción completada: {len(full_text)} caracteres, "
                f"{len(segments)} segmentos, idioma={info.language}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error durante transcripción: {e}")
            raise RuntimeError(f"Error transcribiendo audio: {e}")
    
    def get_supported_languages(self) -> List[str]:
        """Retorna lista de idiomas soportados por Whisper."""
        return [
            'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
            'ar', 'hi', 'nl', 'pl', 'tr', 'vi', 'th', 'cs', 'el', 'he',
            'hu', 'id', 'ms', 'no', 'ro', 'sk', 'sv', 'uk', 'ca', 'da',
            'fi', 'hr', 'lt', 'lv', 'sl', 'et', 'bg', 'ta', 'te', 'ml'
        ]
    
    def is_model_loaded(self) -> bool:
        """Verifica si el modelo está cargado en memoria."""
        return self._model is not None
    
    def unload_model(self):
        """Descarga el modelo de memoria para liberar recursos."""
        if self._model is not None:
            del self._model
            self._model = None
            logger.info("Modelo descargado de memoria")
            
            # Limpiar caché de GPU si está disponible
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except ImportError:
                pass
