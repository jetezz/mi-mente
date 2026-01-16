"""
YouTube Downloader Service
Utiliza yt-dlp para extraer y descargar audio de videos de YouTube.
"""
import os
import uuid
import logging
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
    Extrae solo el audio en formato ligero (m4a/opus) para optimizar espacio y velocidad.
    """
    
    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or TEMP_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def _get_ydl_options(self, output_path: str) -> Dict[str, Any]:
        """
        Configura las opciones de yt-dlp para extracción de audio.
        """
        return {
            # Extraer solo audio
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '128',  # 128kbps es suficiente para transcripción
            }],
            # Ruta de salida
            'outtmpl': output_path,
            # Opciones adicionales
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            # Evitar errores de certificado
            'nocheckcertificate': True,
            # Límites de seguridad
            'max_filesize': 500 * 1024 * 1024,  # 500MB máximo
        }
    
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
    
    def get_video_info(self, url: str) -> Dict[str, Any]:
        """
        Obtiene información del video sin descargarlo.
        """
        if not self.validate_url(url):
            raise ValueError(f"URL no válida de YouTube: {url}")
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return {
                    'id': info.get('id'),
                    'title': info.get('title'),
                    'duration': info.get('duration'),  # segundos
                    'channel': info.get('channel'),
                    'upload_date': info.get('upload_date'),
                    'view_count': info.get('view_count'),
                    'description': info.get('description', '')[:500],  # Primeros 500 chars
                    'thumbnail': info.get('thumbnail'),
                }
        except Exception as e:
            logger.error(f"Error obteniendo info del video: {e}")
            raise
    
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
        
        logger.info(f"Descargando audio de: {url}")
        
        ydl_opts = self._get_ydl_options(output_path)
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                
                # yt-dlp añade la extensión automáticamente
                audio_file = Path(f"{output_path}.mp3")
                
                if not audio_file.exists():
                    # Buscar el archivo con cualquier extensión
                    possible_files = list(self.output_dir.glob(f"{file_id}.*"))
                    if possible_files:
                        audio_file = possible_files[0]
                    else:
                        raise FileNotFoundError(f"No se encontró el archivo de audio descargado")
                
                file_size = audio_file.stat().st_size
                
                logger.info(f"Audio descargado: {audio_file} ({file_size / 1024 / 1024:.2f} MB)")
                
                return {
                    'file_path': str(audio_file),
                    'video_info': {
                        'id': info.get('id'),
                        'title': info.get('title'),
                        'duration': info.get('duration'),
                        'channel': info.get('channel'),
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
                logger.info(f"Archivo eliminado: {file_path}")
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
                    file_path.unlink()
                    deleted_count += 1
                    logger.info(f"Archivo antiguo eliminado: {file_path}")
        
        return deleted_count
