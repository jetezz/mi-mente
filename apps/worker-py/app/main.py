"""
Hybrid Brain Worker - Python FastAPI Service
Maneja el procesamiento pesado: descarga y transcripción.
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import Optional, List
from enum import Enum
import logging
import time
import requests
import os

from app.services.youtube_downloader import YoutubeDownloader
from app.services.whisper_transcriber import WhisperTranscriber, TranscriptionResult
from app.services.youtube_transcript_service import YoutubeTranscriptService

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Inicializar FastAPI
app = FastAPI(
    title="Hybrid Brain Worker",
    description="Servicio de procesamiento multimedia: descarga y transcripción",
    version="1.1.0"
)

# Inicializar servicios (lazy loading para Whisper)
youtube_downloader = YoutubeDownloader()
youtube_transcript_service = YoutubeTranscriptService()
whisper_transcriber: Optional[WhisperTranscriber] = None


def get_transcriber() -> WhisperTranscriber:
    """Obtiene el transcriptor, inicializándolo si es necesario."""
    global whisper_transcriber
    if whisper_transcriber is None:
        whisper_transcriber = WhisperTranscriber()
    return whisper_transcriber


# ================== Modelos Pydantic ==================

class Platform(str, Enum):
    YOUTUBE = "youtube"
    INSTAGRAM = "instagram"
    AUTO = "auto"


class TranscribeRequest(BaseModel):
    """Request para transcribir contenido multimedia."""
    url: str
    platform: Platform = Platform.AUTO
    language: Optional[str] = None  # None = auto-detect
    include_timestamps: bool = True
    
    @validator('url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL debe comenzar con http:// o https://')
        return v


class TranscribeResponse(BaseModel):
    """Respuesta de transcripción exitosa."""
    success: bool
    text: str
    segments: Optional[List[dict]] = None
    language: str
    duration: float
    word_count: int
    video_info: dict
    processing_time: float
    method: str = "whisper"


class VideoInfoRequest(BaseModel):
    """Request para obtener info de video."""
    url: str


class VideoInfoResponse(BaseModel):
    """Respuesta con información del video."""
    id: str
    title: str
    duration: Optional[int]
    channel: Optional[str]
    upload_date: Optional[str]
    thumbnail: Optional[str]


class HealthResponse(BaseModel):
    """Response del health check."""
    status: str
    service: str
    whisper_loaded: bool
    whisper_model: str


# ================== Endpoints ==================

@app.get("/health", response_model=HealthResponse)
def health_check():
    """
    Verifica el estado del servicio.
    """
    return {
        "status": "ok",
        "service": "worker-py",
        "whisper_loaded": whisper_transcriber is not None and whisper_transcriber.is_model_loaded(),
        "whisper_model": WhisperTranscriber.DEFAULT_MODEL
    }


@app.post("/transcribe", response_model=TranscribeResponse)
def transcribe_endpoint(request: TranscribeRequest):
    """
    Endpoint principal: descarga y transcribe contenido multimedia.
    
    Flujo optimizado:
    1. Detecta la plataforma (YouTube/Instagram)
    2. Si es YouTube, intenta obtener transcripción nativa
    3. Si no hay nativa, descarga audio y transcribe con Whisper
    4. Limpia archivos temporales
    5. Retorna transcripción
    """
    start_time = time.time()
    
    logger.info(f"📥 Nueva solicitud de transcripción: {request.url}")
    
    # Detectar plataforma
    platform = request.platform
    if platform == Platform.AUTO:
        if 'youtube.com' in request.url or 'youtu.be' in request.url:
            platform = Platform.YOUTUBE
        elif 'instagram.com' in request.url:
            platform = Platform.INSTAGRAM
        else:
            raise HTTPException(
                status_code=400,
                detail="No se pudo detectar la plataforma. Especifica 'youtube' o 'instagram'."
            )
    
    audio_path = None
    
    try:
        # === YouTube: Intentar transcripción nativa primero ===
        if platform == Platform.YOUTUBE:
            # Definir idiomas preferidos
            preferred_langs = [request.language] if request.language else ['es', 'en', 'es-419', 'en-US']
            
            # Intentar obtener transcripción nativa
            logger.info("🔍 Buscando transcripción nativa de YouTube...")
            native_transcript = youtube_transcript_service.get_transcript(
                request.url, 
                languages=preferred_langs
            )
            
            if native_transcript:
                logger.info("✅ Transcripción nativa OBTENIDA de YouTube")
                
                # Obtener info del video (versión segura que no falla)
                video_info = youtube_downloader.get_video_info_safe(request.url)
                
                if not video_info:
                    # Fallback mínimo si todo falla
                    video_id = youtube_transcript_service.extract_video_id(request.url) or "unknown"
                    video_info = {
                        'id': video_id,
                        'title': 'YouTube Video (Info Unavailable)',
                        'duration': int(native_transcript.duration) if native_transcript.duration else None,
                        'channel': 'Unknown',
                        'upload_date': None,
                        'thumbnail': f'https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg' if video_id != "unknown" else None
                    }
                
                processing_time = time.time() - start_time
                
                return TranscribeResponse(
                    success=True,
                    text=native_transcript.text,
                    segments=[seg.to_dict() for seg in native_transcript.segments] if request.include_timestamps else None,
                    language=native_transcript.language,
                    duration=native_transcript.duration,
                    word_count=len(native_transcript.text.split()),
                    video_info=video_info,
                    processing_time=round(processing_time, 2),
                    method="youtube-native"
                )
            
            logger.info("⚠️ No hay transcripción nativa. Usando Whisper...")
        
        # === Fallback: Descargar audio y transcribir con Whisper ===
        if platform == Platform.YOUTUBE:
            logger.info("📥 Descargando audio de YouTube...")
            download_result = youtube_downloader.download_audio(request.url)
            audio_path = download_result['file_path']
            video_info = download_result['video_info']
            
        elif platform == Platform.INSTAGRAM:
            # TODO: Implementar descarga de Instagram
            raise HTTPException(
                status_code=501,
                detail="Descarga de Instagram aún no implementada"
            )
        
        # === Transcribir con Whisper ===
        logger.info("🎙️ Iniciando transcripción con Whisper...")
        transcriber = get_transcriber()
        
        transcription: TranscriptionResult = transcriber.transcribe(
            audio_path=audio_path,
            language=request.language,
            include_timestamps=request.include_timestamps
        )
        
        processing_time = time.time() - start_time
        
        logger.info(f"✅ Transcripción completada en {processing_time:.2f}s")
        
        # Construir respuesta
        response = TranscribeResponse(
            success=True,
            text=transcription.text,
            segments=[seg.to_dict() for seg in transcription.segments] if request.include_timestamps else None,
            language=transcription.language,
            duration=transcription.duration,
            word_count=len(transcription.text.split()),
            video_info=video_info,
            processing_time=round(processing_time, 2),
            method=f"whisper-{transcriber.model_name}"
        )
        
        return response
        
    except ValueError as e:
        logger.error(f"Error de validación: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except FileNotFoundError as e:
        logger.error(f"Archivo no encontrado: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    
    except RuntimeError as e:
        logger.error(f"Error de procesamiento: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    except Exception as e:
        logger.exception(f"Error inesperado: {e}")
        raise HTTPException(status_code=500, detail=f"Error inesperado: {str(e)}")
    
    finally:
        # === Limpiar archivos temporales ===
        if audio_path:
            youtube_downloader.cleanup(audio_path)


@app.post("/transcribe/youtube", response_model=TranscribeResponse)
async def transcribe_youtube(request: TranscribeRequest):
    """
    Endpoint específico para YouTube.
    Wrapper sobre /transcribe con platform=youtube.
    """
    request.platform = Platform.YOUTUBE
    return transcribe_endpoint(request)


@app.post("/video/info", response_model=VideoInfoResponse)
def get_video_info(request: VideoInfoRequest):
    """
    Obtiene información de un video sin descargarlo.
    Útil para preview antes de procesar.
    """
    try:
        if not youtube_downloader.validate_url(request.url):
            raise HTTPException(
                status_code=400,
                detail="URL no válida de YouTube"
            )
        
        # Usar versión segura que no falla
        info = youtube_downloader.get_video_info_safe(request.url)
        
        if not info:
            raise HTTPException(
                status_code=500,
                detail="No se pudo obtener información del video"
            )
        
        return VideoInfoResponse(**info)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Error obteniendo info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/model/load")
async def load_whisper_model(model_name: Optional[str] = None):
    """
    Pre-carga el modelo de Whisper en memoria.
    Útil para reducir latencia en la primera transcripción.
    """
    global whisper_transcriber
    
    try:
        model = model_name or WhisperTranscriber.DEFAULT_MODEL
        logger.info(f"🧠 Pre-cargando modelo Whisper: {model}")
        
        whisper_transcriber = WhisperTranscriber(model_name=model)
        whisper_transcriber._load_model()
        
        return {
            "status": "ok",
            "message": f"Modelo '{model}' cargado exitosamente",
            "device": whisper_transcriber.device
        }
        
    except Exception as e:
        logger.exception(f"Error cargando modelo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/model/unload")
async def unload_whisper_model():
    """
    Descarga el modelo de Whisper de memoria para liberar recursos.
    """
    global whisper_transcriber
    
    if whisper_transcriber:
        whisper_transcriber.unload_model()
        whisper_transcriber = None
        return {"status": "ok", "message": "Modelo descargado de memoria"}
    
    return {"status": "ok", "message": "No había modelo cargado"}


@app.delete("/cleanup")
async def cleanup_temp_files(max_age_hours: int = 24):
    """
    Limpia archivos temporales antiguos.
    """
    try:
        deleted = youtube_downloader.cleanup_old_files(max_age_hours)
        return {
            "status": "ok",
            "deleted_files": deleted,
            "max_age_hours": max_age_hours
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================== Eventos de Lifecycle ==================

@app.on_event("startup")
async def startup_event():
    """Evento de inicio de la aplicación."""
    logger.info("🧠 Hybrid Brain Worker iniciado")
    logger.info(f"📁 Directorio de descargas: {youtube_downloader.output_dir}")
    
    # Cargar configuraciones dinámicas
    try:
        api_url = os.getenv('API_URL', 'http://api-bun:3000')
        logger.info(f"Fetching settings from {api_url}/settings...")
        
        # Timeout corto para no bloquear demasiado el inicio si el API no está lista
        response = requests.get(f"{api_url}/settings", timeout=2)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                settings = {s['key']: s['value'] for s in data.get('settings', [])}
                
                # Actualizar Whisper DEFAULT_MODEL
                default_model = settings.get('transcription.default_model')
                if default_model:
                    WhisperTranscriber.DEFAULT_MODEL = default_model
                    logger.info(f"✅ Configuración actualizada: Whisper DEFAULT_MODEL = {default_model}")
                    
    except Exception as e:
        logger.warning(f"⚠️ No se pudieron cargar configuraciones del API: {e}")
        logger.warning("Usando valores por defecto.")


@app.on_event("shutdown")
async def shutdown_event():
    """Evento de cierre de la aplicación."""
    logger.info("Cerrando Hybrid Brain Worker...")
    
    # Liberar modelo de memoria
    if whisper_transcriber:
        whisper_transcriber.unload_model()
    
    # Limpiar archivos temporales
    youtube_downloader.cleanup_old_files(max_age_hours=0)
    
    logger.info("Worker cerrado correctamente")
