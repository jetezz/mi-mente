"""
YouTube Downloader Service
Utiliza yt-dlp para extraer y descargar audio de videos de YouTube.
"""
import os
import uuid
import logging
import re
from pathlib import Path
from typing import Optional, Dict, Any
import yt_dlp

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directorio temporal para descargas
TEMP_DIR = Path("/tmp/hybrid-brain-downloads")
TEMP_DIR.mkdir(parents=True, exist_ok=True)


class YoutubeDownloader:
    """
    Servicio para descargar audio de videos de YouTube.
    Extrae solo el audio en formato ligero (mp3) para optimizar espacio y velocidad.
    """
    
    COOKIE_FILE = '/app/cookies/cookies.txt'
    
    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or TEMP_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._cookie_file = self._detect_cookie_file()
        
    def _detect_cookie_file(self) -> Optional[str]:
        """Detecta si hay un archivo de cookies disponible."""
        if os.path.exists(self.COOKIE_FILE):
            logger.info(f"🍪 Cookies detectadas: {self.COOKIE_FILE}")
            return self.COOKIE_FILE
        return None
    
    def _base_ydl_options(self) -> Dict[str, Any]:
        """Opciones base compartidas para todas las operaciones."""
        opts = {
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'no_cache_dir': True,
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Referer': 'https://www.youtube.com/',
            },
        }
        
        if self._cookie_file:
            opts['cookiefile'] = self._cookie_file
            
        return opts
        
    def _get_download_options(self, output_path: str) -> Dict[str, Any]:
        """
        Configura las opciones de yt-dlp para extracción de audio.
        """
        opts = self._base_ydl_options()
        opts.update({
            # Extraer solo audio - formato flexible
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '128',  # 128kbps es suficiente para transcripción
            }],
            # Ruta de salida
            'outtmpl': output_path,
            # No buscar formatos de video
            'extract_flat': False,
            # Límite de tamaño de archivo
            'max_filesize': 500 * 1024 * 1024,  # 500MB máximo
        })
        
        return opts

    def validate_url(self, url: str) -> bool:
        """
        Valida que la URL sea de YouTube.
        """
        youtube_patterns = [
            'youtube.com/watch',
            'youtu.be/',
            'youtube.com/shorts/',
            'youtube.com/live/'
        ]
        return any(pattern in url for pattern in youtube_patterns)
    
    def extract_video_id(self, url: str) -> Optional[str]:
        """
        Extrae el ID del video de una URL de YouTube.
        """
        if not url:
            return None
        
        patterns = [
            r'(?:v=|/)([0-9A-Za-z_-]{11})(?:[?&]|$)',
            r'(?:youtu\.be/)([0-9A-Za-z_-]{11})',
            r'(?:embed/)([0-9A-Za-z_-]{11})',
            r'(?:shorts/)([0-9A-Za-z_-]{11})',
            r'(?:live/)([0-9A-Za-z_-]{11})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        if re.match(r'^[0-9A-Za-z_-]{11}$', url):
            return url
        
        return None
    
    def get_video_info(self, url: str) -> Dict[str, Any]:
        """
        Obtiene información del video sin descargarlo.
        
        IMPORTANTE: Esta función usa configuración específica para evitar
        el error "Requested format is not available".
        """
        if not self.validate_url(url):
            raise ValueError(f"URL no válida de YouTube: {url}")
        
        opts = self._base_ydl_options()
        opts.update({
            # CRÍTICO: No intentar procesar formatos
            'skip_download': True,
            # Ignorar errores de formato
            'ignoreerrors': True,
            'ignore_no_formats_error': True,
            # No necesitamos formatos específicos
            'format': None,
            'check_formats': None,
        })
        
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    raise ValueError("No se pudo obtener información del video")
                
                return {
                    'id': info.get('id'),
                    'title': info.get('title'),
                    'duration': info.get('duration'),  # segundos
                    'channel': info.get('channel') or info.get('uploader'),
                    'upload_date': info.get('upload_date'),
                    'view_count': info.get('view_count'),
                    'description': (info.get('description', '') or '')[:500],
                    'thumbnail': info.get('thumbnail'),
                }
                
        except Exception as e:
            logger.error(f"Error obteniendo info del video: {e}")
            raise
    
    def get_video_info_safe(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Versión segura de get_video_info que no lanza excepciones.
        Retorna None si falla.
        """
        try:
            return self.get_video_info(url)
        except Exception as e:
            logger.warning(f"No se pudo obtener info del video: {e}")
            
            # Intentar al menos extraer el ID
            video_id = self.extract_video_id(url)
            if video_id:
                return {
                    'id': video_id,
                    'title': f'YouTube Video ({video_id})',
                    'duration': None,
                    'channel': 'Unknown',
                    'upload_date': None,
                    'view_count': None,
                    'description': '',
                    'thumbnail': f'https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg',
                }
            return None
    
    def download_audio(self, url: str) -> Dict[str, Any]:
        """
        Descarga el audio de un video de YouTube.
        
        Returns:
            Dict con:
                - file_path: Ruta al archivo de audio descargado
                - video_info: Información del video
                - file_size: Tamaño del archivo en bytes
        """
        if not self.validate_url(url):
            raise ValueError(f"URL no válida de YouTube: {url}")
        
        # Generar nombre único para el archivo
        file_id = str(uuid.uuid4())[:8]
        output_path = str(self.output_dir / f"{file_id}")
        
        logger.info(f"📥 Descargando audio de: {url}")
        
        ydl_opts = self._get_download_options(output_path)
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                
                if not info:
                    raise RuntimeError("No se pudo extraer información del video")
                
                # yt-dlp añade la extensión automáticamente
                audio_file = Path(f"{output_path}.mp3")
                
                if not audio_file.exists():
                    # Buscar el archivo con cualquier extensión
                    possible_files = list(self.output_dir.glob(f"{file_id}.*"))
                    if possible_files:
                        audio_file = possible_files[0]
                    else:
                        raise FileNotFoundError("No se encontró el archivo de audio descargado")
                
                file_size = audio_file.stat().st_size

                if file_size == 0:
                    try:
                        audio_file.unlink()
                    except:
                        pass
                    raise RuntimeError("El archivo descargado está vacío (0 bytes). Posible bloqueo de YouTube.")
                
                logger.info(f"✅ Audio descargado: {audio_file} ({file_size / 1024 / 1024:.2f} MB)")
                
                return {
                    'file_path': str(audio_file),
                    'video_info': {
                        'id': info.get('id'),
                        'title': info.get('title'),
                        'duration': info.get('duration'),
                        'channel': info.get('channel') or info.get('uploader'),
                    },
                    'file_size': file_size,
                }
                
        except yt_dlp.utils.DownloadError as e:
            logger.error(f"Error de descarga: {e}")
            raise RuntimeError(f"Error descargando video: {str(e)}")
        except Exception as e:
            logger.error(f"Error inesperado: {e}")
            raise
    
    def cleanup(self, file_path: str) -> bool:
        """
        Elimina un archivo de audio después de procesarlo.
        """
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                logger.info(f"🗑️ Archivo eliminado: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error eliminando archivo: {e}")
            return False
    
    def cleanup_old_files(self, max_age_hours: int = 24) -> int:
        """
        Limpia archivos temporales más antiguos que max_age_hours.
        """
        import time
        
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        deleted_count = 0
        
        for file_path in self.output_dir.glob("*"):
            if file_path.is_file():
                file_age = current_time - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    try:
                        file_path.unlink()
                        deleted_count += 1
                        logger.info(f"🗑️ Archivo antiguo eliminado: {file_path}")
                    except Exception as e:
                        logger.warning(f"No se pudo eliminar {file_path}: {e}")
        
        return deleted_count
