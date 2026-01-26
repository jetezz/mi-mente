"""
YouTube Transcript Service
Obtiene transcripciones nativas de YouTube usando múltiples métodos:
1. youtube_transcript_api (API directa)
2. yt-dlp con skip_download para subtítulos
"""
import logging
import re
import os
import glob
from pathlib import Path
from typing import Optional, List, Dict, Any
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable
)
from app.services.whisper_transcriber import TranscriptionResult, TranscriptionSegment


# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = Path("/tmp/yt_transcripts")
TEMP_DIR.mkdir(parents=True, exist_ok=True)


class YoutubeTranscriptService:
    """
    Servicio para extraer transcripciones nativas de YouTube.
    Prioriza métodos que no requieren descargar video.
    """
    
    # Cache de cookies path
    COOKIE_FILE = '/app/cookies/cookies.txt'
    
    def __init__(self):
        """Inicializa el servicio y detecta cookies."""
        self._cookie_file = self._detect_cookie_file()
        if self._cookie_file:
            logger.info(f"🍪 Cookies detectadas: {self._cookie_file}")
    
    def _detect_cookie_file(self) -> Optional[str]:
        """Detecta si hay un archivo de cookies disponible."""
        if os.path.exists(self.COOKIE_FILE):
            return self.COOKIE_FILE
        return None
    
    def extract_video_id(self, url: str) -> Optional[str]:
        """
        Extrae el ID del video de una URL de YouTube.
        Soporta múltiples formatos de URL.
        """
        if not url:
            return None
        
        # Patrones para extraer video ID
        patterns = [
            r'(?:v=|/)([0-9A-Za-z_-]{11})(?:[?&]|$)',  # ?v=ID o /ID
            r'(?:youtu\.be/)([0-9A-Za-z_-]{11})',       # youtu.be/ID
            r'(?:embed/)([0-9A-Za-z_-]{11})',           # embed/ID
            r'(?:shorts/)([0-9A-Za-z_-]{11})',          # shorts/ID
            r'(?:live/)([0-9A-Za-z_-]{11})',            # live/ID
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        # Si ya es un ID de 11 caracteres
        if re.match(r'^[0-9A-Za-z_-]{11}$', url):
            return url
        
        return None

    def _parse_time_str(self, time_str: str) -> float:
        """Convierte HH:MM:SS.mmm a segundos float."""
        try:
            parts = time_str.split(':')
            if len(parts) == 3:
                h, m, s = parts
                return int(h) * 3600 + int(m) * 60 + float(s)
            elif len(parts) == 2:
                m, s = parts
                return int(m) * 60 + float(s)
            else:
                return float(time_str)
        except (ValueError, AttributeError):
            return 0.0

    def _parse_vtt_content(self, content: str, lang_code: str) -> Optional[TranscriptionResult]:
        """
        Parsea contenido VTT y lo convierte a TranscriptionResult.
        Maneja tanto formato VTT estándar como formato "karaoke" de YouTube.
        """
        segments = []
        full_text_parts = []
        
        # Regex para timestamps: 00:00:00.000 --> 00:00:03.947 o 00:00.000 --> 00:03.947
        time_pattern = re.compile(
            r'(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})'
        )
        
        lines = content.splitlines()
        current_start = None
        current_end = None
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            time_match = time_pattern.search(line)
            
            if time_match:
                # Normalizar formato de tiempo (reemplazar , por .)
                start_str = time_match.group(1).replace(',', '.')
                end_str = time_match.group(2).replace(',', '.')
                
                current_start = self._parse_time_str(start_str)
                current_end = self._parse_time_str(end_str)
                
                # Acumular texto hasta la próxima línea vacía o timestamp
                text_acc = []
                i += 1
                
                while i < len(lines):
                    next_line = lines[i].strip()
                    
                    # Fin del bloque de texto
                    if not next_line:
                        i += 1
                        break
                    
                    # Nuevo timestamp encontrado
                    if time_pattern.search(next_line):
                        break
                    
                    # Limpiar tags VTT como <c.colorE5E5E5>, <00:00:01.000>, etc
                    clean_text = re.sub(r'<[^>]+>', '', next_line).strip()
                    # Limpiar timestamps inline
                    clean_text = re.sub(r'\d{1,2}:\d{2}:\d{2}[.,]\d{3}', '', clean_text).strip()
                    # Limpiar espacios múltiples
                    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
                    
                    if clean_text and clean_text != '&nbsp;':
                        text_acc.append(clean_text)
                    
                    i += 1
                
                if text_acc:
                    segment_text = " ".join(text_acc)
                    
                    # Evitar duplicados consecutivos (común en VTT estilo karaoke)
                    if not segments or segments[-1].text != segment_text:
                        segments.append(TranscriptionSegment(
                            start=current_start,
                            end=current_end,
                            text=segment_text
                        ))
                        full_text_parts.append(segment_text)
            else:
                i += 1
        
        if not segments:
            return None
        
        # Deduplicar texto final (a veces hay repeticiones)
        unique_parts = []
        for part in full_text_parts:
            if not unique_parts or unique_parts[-1] != part:
                unique_parts.append(part)
        
        full_text = " ".join(unique_parts)
        
        return TranscriptionResult(
            text=full_text,
            segments=segments,
            language=lang_code,
            duration=segments[-1].end if segments else 0.0
        )

    def _fetch_with_transcript_api(self, video_id: str, languages: List[str]) -> Optional[TranscriptionResult]:
        """
        Intenta obtener transcripción usando youtube_transcript_api.
        Este es el método más rápido y limpio.
        """
        try:
            logger.info(f"📝 Intentando youtube_transcript_api para: {video_id} (idiomas: {languages})")
            
            # Intentar listar transcripciones disponibles
            try:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            except Exception as list_error:
                logger.warning(f"No se pudo listar transcripciones: {list_error}")
                return None
            
            # Buscar transcripción en los idiomas preferidos
            transcript = None
            selected_lang = None
            
            # Primero buscar transcripción manual
            for lang in languages:
                try:
                    transcript = transcript_list.find_manually_created_transcript([lang])
                    selected_lang = lang
                    logger.info(f"✅ Encontrada transcripción MANUAL en: {lang}")
                    break
                except NoTranscriptFound:
                    continue
            
            # Si no hay manual, buscar autogenerada
            if not transcript:
                for lang in languages:
                    try:
                        transcript = transcript_list.find_generated_transcript([lang])
                        selected_lang = lang
                        logger.info(f"✅ Encontrada transcripción AUTOGENERADA en: {lang}")
                        break
                    except NoTranscriptFound:
                        continue
            
            # Fallback: usar find_transcript que busca cualquiera
            if not transcript:
                try:
                    transcript = transcript_list.find_transcript(languages)
                    selected_lang = transcript.language_code
                    logger.info(f"✅ Encontrada transcripción en: {selected_lang}")
                except NoTranscriptFound:
                    logger.warning(f"No hay transcripción en idiomas: {languages}")
                    return None
            
            # Obtener datos
            data = transcript.fetch()
            
            # Convertir al formato interno
            segments = []
            full_text_parts = []
            
            for item in data:
                text = item.get('text', '').replace('\n', ' ').strip()
                if not text:
                    continue
                    
                start = float(item.get('start', 0))
                duration = float(item.get('duration', 0))
                end = start + duration
                
                seg = TranscriptionSegment(start=start, end=end, text=text)
                segments.append(seg)
                full_text_parts.append(text)
            
            if not segments:
                return None
            
            full_text = " ".join(full_text_parts)
            
            return TranscriptionResult(
                text=full_text,
                segments=segments,
                language=transcript.language_code,
                duration=segments[-1].end if segments else 0.0
            )
            
        except TranscriptsDisabled:
            logger.info(f"⚠️ Subtítulos deshabilitados para: {video_id}")
            return None
        except VideoUnavailable:
            logger.warning(f"⚠️ Video no disponible: {video_id}")
            return None
        except NoTranscriptFound:
            logger.info(f"⚠️ No hay transcripción disponible para: {video_id}")
            return None
        except Exception as e:
            logger.warning(f"⚠️ Error en youtube_transcript_api: {type(e).__name__}: {e}")
            return None


    def _fetch_with_ytdlp(self, url: str, video_id: str, languages: List[str]) -> Optional[TranscriptionResult]:
        """
        Intenta descargar subtítulos usando yt-dlp como fallback.
        
        IMPORTANTE: Usamos configuración específica para SOLO obtener subtítulos,
        sin intentar procesar formatos de video.
        """
        try:
            logger.info(f"📥 Intentando yt-dlp para subtítulos de: {video_id}")
            
            # Limpiar posibles archivos anteriores
            base_output = TEMP_DIR / video_id
            for f in glob.glob(f"{base_output}*"):
                try:
                    os.remove(f)
                except:
                    pass
            
            # Configuración CRÍTICA para solo subtítulos
            # El truco está en NO especificar formato de video
            ydl_opts = {
                # SOLO subtítulos - sin descargar video
                'skip_download': True,
                
                # Subtítulos
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': languages,
                'subtitlesformat': 'vtt/best',  # Preferir VTT
                
                # Output
                'outtmpl': str(base_output),
                
                # Silenciar output
                'quiet': True,
                'no_warnings': True,
                
                # Evitar errores de certificado
                'nocheckcertificate': True,
                
                # No cachear
                'no_cache_dir': True,
                
                # Headers para simular navegador
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                },
                
                # Ignorar errores de extracción de info de video
                'ignoreerrors': True,
                'ignore_no_formats_error': True,
            }
            
            # Añadir cookies si existen
            if self._cookie_file:
                ydl_opts['cookiefile'] = self._cookie_file
                logger.info(f"🍪 Usando cookies para yt-dlp: {self._cookie_file}")
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Solo extraer info para los subtítulos
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    logger.warning("yt-dlp no pudo extraer información del video")
                    return None
                
                # Verificar si hay subtítulos disponibles
                subtitles = info.get('subtitles', {})
                auto_subs = info.get('automatic_captions', {})
                
                available_subs = {**subtitles, **auto_subs}
                
                if not available_subs:
                    logger.warning("No hay subtítulos disponibles via yt-dlp")
                    return None
                
                logger.info(f"📋 Subtítulos disponibles: {list(available_subs.keys())}")
                
                # Encontrar el mejor idioma disponible
                selected_lang = None
                for lang in languages:
                    if lang in available_subs:
                        selected_lang = lang
                        break
                    # Buscar variantes (ej: es-419, en-US)
                    for available_lang in available_subs.keys():
                        if available_lang.startswith(lang):
                            selected_lang = available_lang
                            break
                    if selected_lang:
                        break
                
                if not selected_lang:
                    # Usar el primero disponible
                    selected_lang = list(available_subs.keys())[0]
                    logger.info(f"Usando subtítulo alternativo: {selected_lang}")
                
                # Obtener URL del subtítulo
                sub_info = available_subs.get(selected_lang, [])
                if not sub_info:
                    logger.warning(f"No se encontró información de subtítulos para: {selected_lang}")
                    return None
                
                # Encontrar formato VTT o el mejor disponible
                sub_url = None
                for fmt in sub_info:
                    if fmt.get('ext') == 'vtt':
                        sub_url = fmt.get('url')
                        break
                
                if not sub_url and sub_info:
                    sub_url = sub_info[0].get('url')
                
                if not sub_url:
                    logger.warning("No se pudo obtener URL del subtítulo")
                    return None
                
                # Descargar el subtítulo directamente
                import urllib.request
                
                logger.info(f"📥 Descargando subtítulo: {selected_lang}")
                
                req = urllib.request.Request(
                    sub_url,
                    headers={'User-Agent': 'Mozilla/5.0'}
                )
                
                with urllib.request.urlopen(req, timeout=30) as response:
                    content = response.read().decode('utf-8')
                
                if not content:
                    logger.warning("Subtítulo vacío")
                    return None
                
                # Parsear el contenido
                result = self._parse_vtt_content(content, selected_lang)
                
                if result:
                    logger.info(f"✅ Transcripción obtenida via yt-dlp: {len(result.segments)} segmentos")
                
                return result
                
        except Exception as e:
            logger.error(f"❌ Error en fallback yt-dlp: {type(e).__name__}: {e}")
            return None
        finally:
            # Limpiar archivos temporales
            for f in glob.glob(f"{base_output}*"):
                try:
                    os.remove(f)
                except:
                    pass

    def get_transcript(
        self, 
        url: str, 
        languages: List[str] = None
    ) -> Optional[TranscriptionResult]:
        """
        Obtiene la transcripción de un video de YouTube.
        
        Flujo:
        1. Intenta youtube_transcript_api (más rápido y limpio)
        2. Fallback a yt-dlp (más robusto pero lento)
        
        Args:
            url: URL del video de YouTube
            languages: Lista de idiomas preferidos (default: ['es', 'en'])
        
        Returns:
            TranscriptionResult o None si no hay transcripción
        """
        # Idiomas por defecto
        if languages is None:
            languages = ['es', 'en', 'es-419', 'en-US']
        
        # Extraer video ID
        video_id = self.extract_video_id(url)
        if not video_id:
            logger.warning(f"❌ No se pudo extraer video ID de: {url}")
            return None
        
        logger.info(f"🎬 Buscando transcripción para: {video_id}")
        
        # === Método 1: youtube_transcript_api ===
        result = self._fetch_with_transcript_api(video_id, languages)
        if result:
            logger.info(f"✅ Transcripción obtenida via API: {result.language}")
            return result
        
        # === Método 2: yt-dlp fallback ===
        logger.info("🔄 Intentando fallback con yt-dlp...")
        result = self._fetch_with_ytdlp(url, video_id, languages)
        if result:
            logger.info(f"✅ Transcripción obtenida via yt-dlp: {result.language}")
            return result
        
        logger.warning(f"❌ No se pudo obtener transcripción nativa para: {video_id}")
        return None


# Singleton para uso global
_instance = None

def get_transcript_service() -> YoutubeTranscriptService:
    """Obtiene instancia singleton del servicio."""
    global _instance
    if _instance is None:
        _instance = YoutubeTranscriptService()
    return _instance
