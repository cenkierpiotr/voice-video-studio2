import { useState, useRef, useEffect } from 'react';

export default function AudioPlayer({ url, filename, onDelete }) {
  const mediaRef = useRef(null);
  const [downloaded, setDownloaded] = useState(false);

  const isVideo = url && (url.endsWith('.mp4') || url.includes('.mp4'));

  useEffect(() => {
    setDownloaded(false);
  }, [url]);

  const download = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || (isVideo ? 'film.mp4' : 'nagranie.mp3');
    a.click();
    setDownloaded(true);
  };

  const replay = () => {
    if (mediaRef.current) { mediaRef.current.currentTime = 0; mediaRef.current.play(); }
  };

  return (
    <div className="player-panel">
      <div className="player-title">
        {isVideo ? '🎬' : '🎵'} {isVideo ? 'Film gotowy' : 'Nagranie gotowe'}:{' '}
        <span className="filename">{filename}</span>
      </div>

      {isVideo ? (
        <video
          ref={mediaRef}
          controls
          autoPlay
          src={url}
          preload="auto"
          style={{ width: '100%', maxHeight: 360, borderRadius: 8, background: '#000' }}
        />
      ) : (
        <audio ref={mediaRef} controls autoPlay src={url} preload="auto" />
      )}

      <div className="player-actions">
        <button className="btn btn-primary btn-sm" onClick={download}>
          {downloaded ? '✅ Pobrano' : isVideo ? '⬇️ Pobierz MP4' : '⬇️ Pobierz MP3'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={replay}>
          ▶ Odtwórz ponownie
        </button>
        {onDelete && (
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            🗑 Usuń
          </button>
        )}
      </div>
    </div>
  );
}
