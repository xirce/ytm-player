import axios, { AxiosResponse } from 'axios';

// ---- Константы ----
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'; // публичный ключ YouTube Music
const INNERTUBE_API_URL = 'https://music.youtube.com/youtubei/v1/player';

// Контекст клиента – обязателен, эмулирует веб-плеер
const CLIENT_CONTEXT = {
  client: {
    clientName: 'WEB_MUSIC',
    clientVersion: '1.20240801.00.00', // актуальная версия на момент написания
    hl: 'en',
    gl: 'US',
  },
};

// ---- Интерфейсы ответа (упрощённые) ----
interface PlayerResponse {
  playabilityStatus: {
    status: string;
    reason?: string;
  };
  streamingData?: {
    expiresInSeconds: string;
    adaptiveFormats: AdaptiveFormat[];
    dashManifestUrl?: string;
  };
}

interface AdaptiveFormat {
  itag: number;
  mimeType: string;
  bitrate: number;
  url?: string;        // может отсутствовать, если требуется расшифровка
  signatureCipher?: string; // альтернатива url для расшифровки
  initRange?: { start: string; end: string };
  indexRange?: { start: string; end: string };
  lastModified: string;
  contentLength: string;
  quality: string;
  audioQuality?: string;
}

// ---- Основная функция получения ответа плеера ----
export async function getPlayerResponse(
  videoId: string,
  cookies?: string // опционально, для доступа к контенту с ограничениями
): Promise<PlayerResponse> {
  const requestBody = {
    videoId,
    context: CLIENT_CONTEXT,
    // можно добавить параметры качества, но оставляем по умолчанию
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };
  if (cookies) {
    headers['Cookie'] = cookies;
  }

  try {
    const response: AxiosResponse<PlayerResponse> = await axios.post(
      `${INNERTUBE_API_URL}?key=${INNERTUBE_API_KEY}`,
      requestBody,
      {
        headers,
        timeout: 15000,
      }
    );

    // Проверка на playability
    if (response.data.playabilityStatus?.status !== 'OK') {
      const reason = response.data.playabilityStatus?.reason || 'Неизвестная ошибка';
      throw new Error(`Трек недоступен: ${reason}`);
    }

    if (!response.data.streamingData) {
      throw new Error('streamingData отсутствует в ответе');
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Ошибка запроса к InnerTube: ${error.message}`);
    }
    throw error;
  }
}

// ---- Извлечение аудио-URL (выбор лучшего качества) ----
export function extractBestAudioUrl(playerResponse: PlayerResponse): string {
  const formats = playerResponse.streamingData?.adaptiveFormats || [];
  // Приоритет: Opus (itag 251) > AAC (itag 140)
  const audioFormats = formats.filter(
    (f) => f.mimeType.startsWith('audio/') && (f.url || f.signatureCipher)
  );

  if (audioFormats.length === 0) {
    throw new Error('Нет доступных аудиоформатов');
  }

  // Сортировка по битрейту (убывание) – берём самый высокий
  audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  const bestFormat = audioFormats[0];

  // Если есть url – возвращаем
  if (bestFormat.url) {
    return bestFormat.url;
  }

  // Если есть signatureCipher – требуется расшифровка (сложно, пропускаем)
  if (bestFormat.signatureCipher) {
    const urlParams = new URLSearchParams(bestFormat.signatureCipher);
    const url = urlParams.get('url');
    if (url)
        return url;

    throw new Error(
      'URL требует расшифровки сигнатуры. ' + bestFormat.signatureCipher 
    );
  }

  throw new Error('Не удалось извлечь URL аудио');
}

// ---- Извлечение видео-URL (если нужно) ----
export function extractBestVideoUrl(playerResponse: PlayerResponse): string {
  const formats = playerResponse.streamingData?.adaptiveFormats || [];
  // Ищем видеоформаты (mimeType начинается с video/)
  const videoFormats = formats.filter(
    (f) => f.mimeType.startsWith('video/') && (f.url || f.signatureCipher)
  );

  if (videoFormats.length === 0) {
    throw new Error('Нет доступных видеоформатов');
  }

  // Сортируем по разрешению (quality) – упрощённо берём первый
  const best = videoFormats[0];
  if (best.url) {
    return best.url;
  }
  throw new Error('Видео-URL требует расшифровки');
}

// ---- Универсальная функция "всё в одном" ----
export async function getAudioUrl(videoId: string, cookies?: string): Promise<string> {
  const playerResponse = await getPlayerResponse(videoId, cookies);
  const audioUrl = extractBestAudioUrl(playerResponse);
  return audioUrl;
}
