import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TrackList = ({ 
  tracks, 
  currentTrack, 
  onTrackSelect, 
  onTrackDelete, 
  onFileUpload,
  isPlaying 
}) => {
  const handleFileInput = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.type.startsWith('audio/')) {
        onFileUpload(file);
      }
    });
    event.target.value = '';
  };

  const formatDuration = (duration) => {
    if (!duration || isNaN(duration)) return '--:--';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '--';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Playlist</h2>
        <div className="relative">
          <input
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id="audio-upload"
          />
          <label
            htmlFor="audio-upload"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Tracks
          </label>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-lg mb-2">No tracks uploaded</p>
          <p className="text-sm">Upload some audio files to get started</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {tracks.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -300 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`group relative p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  currentTrack?.id === track.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
                onClick={() => onTrackSelect(track)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      {currentTrack?.id === track.id && isPlaying ? (
                        <div className="flex items-center gap-1">
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '12px', animationDelay: '0ms' }}></div>
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '16px', animationDelay: '150ms' }}></div>
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{ height: '10px', animationDelay: '300ms' }}></div>
                        </div>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.name}</p>
                      <div className="flex items-center gap-4 text-sm opacity-75">
                        <span>{formatDuration(track.duration)}</span>
                        <span>{formatFileSize(track.size)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackDelete(track.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-600 rounded-full transition-all duration-200"
                    title="Delete track"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {currentTrack?.id === track.id && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="absolute bottom-0 left-0 h-0.5 bg-white origin-left"
                    style={{ width: '100%' }}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {tracks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400 text-center">
          {tracks.length} track{tracks.length !== 1 ? 's' : ''} loaded
        </div>
      )}
    </div>
  );
};

export default TrackList;