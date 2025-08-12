import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, Upload } from 'lucide-react';
import audioService  from '../services/audioService';
import storageService  from '../services/storageService';

const AudioPlayer = ({ currentTrack, tracks, onTrackChange, onTracksUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (currentTrack) {
      loadTrack(currentTrack);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioService.cleanup();
    };
  }, [currentTrack]);

  useEffect(() => {
    if (isPlaying && canvasRef.current) {
      startVisualization();
    } else {
      stopVisualization();
    }
  }, [isPlaying]);

  const loadTrack = async (track) => {
    try {
      setIsLoading(true);
      setError(null);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(track.url);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setIsLoading(false);
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        handleNext();
      });

      audio.addEventListener('error', (e) => {
        setError('Failed to load audio file');
        setIsLoading(false);
      });

      audio.volume = volume;
      await audioService.initializeContext(audio);
    } catch (err) {
      setError('Failed to load track');
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (!audioRef.current || isLoading) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setError('Playback failed');
    }
  };

  const handlePrevious = () => {
    if (!tracks.length) return;
    const currentIndex = tracks.findIndex(track => track.id === currentTrack?.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;
    onTrackChange(tracks[previousIndex]);
  };

  const handleNext = () => {
    if (!tracks.length) return;
    const currentIndex = tracks.findIndex(track => track.id === currentTrack?.id);
    const nextIndex = currentIndex < tracks.length - 1 ? currentIndex + 1 : 0;
    onTrackChange(tracks[nextIndex]);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsLoading(true);
    try {
      const newTracks = [];
      
      for (const file of files) {
        if (file.type.startsWith('audio/')) {
          const track = {
            id: Date.now() + Math.random(),
            name: file.name.replace(/\.[^/.]+$/, ''),
            file: file,
            url: URL.createObjectURL(file),
            duration: 0,
            uploadedAt: new Date().toISOString()
          };
          newTracks.push(track);
        }
      }

      if (newTracks.length > 0) {
        const updatedTracks = [...tracks, ...newTracks];
        await storageService.saveTracks(updatedTracks);
        onTracksUpdate(updatedTracks);
        
        if (!currentTrack) {
          onTrackChange(newTracks[0]);
        }
      }
    } catch (err) {
      setError('Failed to upload files');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const startVisualization = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const draw = () => {
      const frequencyData = audioService.getFrequencyData();
      if (!frequencyData) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / frequencyData.length;

      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(0.5, '#8b5cf6');
      gradient.addColorStop(1, '#ec4899');

      ctx.fillStyle = gradient;

      for (let i = 0; i < frequencyData.length; i++) {
        const barHeight = (frequencyData[i] / 255) * height * 0.8;
        const x = i * barWidth;
        const y = height - barHeight;

        ctx.fillRect(x, y, barWidth - 1, barHeight);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const stopVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto"
    >
      {/* Visualizer Canvas */}
      <div className="mb-6 bg-gray-900 rounded-lg p-4">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full h-32 rounded"
        />
      </div>

      {/* Track Info */}
      {currentTrack && (
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {currentTrack.name}
          </h3>
          <div className="flex justify-between text-sm text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div 
        className="w-full bg-gray-200 rounded-full h-2 mb-6 cursor-pointer"
        onClick={handleSeek}
      >
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-100"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <button
          onClick={handlePrevious}
          disabled={!tracks.length}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <SkipBack size={20} />
        </button>

        <button
          onClick={handlePlayPause}
          disabled={!currentTrack || isLoading}
          className="p-4 rounded-full bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={24} />
          ) : (
            <Play size={24} className="ml-1" />
          )}
        </button>

        <button
          onClick={handleNext}
          disabled={!tracks.length}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-3 mb-6">
        <Volume2 size={20} className="text-gray-600" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      {/* Upload Button */}
      <div className="text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload size={20} />
          <span>Upload Audio Files</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm"
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
};

export default AudioPlayer;