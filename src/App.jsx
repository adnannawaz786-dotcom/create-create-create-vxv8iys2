import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AudioPlayer from './components/AudioPlayer'
import TrackList from './components/TrackList'
import  storageService  from './services/storageService'

function App() {
  const [tracks, setTracks] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    const savedTracks = storageService.getTracks()
    setTracks(savedTracks)
    
    const savedSettings = storageService.getSettings()
    if (savedSettings.volume !== undefined) {
      setVolume(savedSettings.volume)
    }
  }, [])

  useEffect(() => {
    storageService.saveSettings({ volume })
  }, [volume])

  const handleFileUpload = async (files) => {
    const newTracks = []
    
    for (const file of files) {
      if (file.type.startsWith('audio/')) {
        try {
          const trackData = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const track = {
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ''),
                file: file.name,
                duration: 0,
                size: file.size,
                type: file.type,
                data: e.target.result,
                uploadedAt: new Date().toISOString()
              }
              resolve(track)
            }
            reader.readAsDataURL(file)
          })
          
          newTracks.push(trackData)
        } catch (error) {
          console.error('Error processing file:', file.name, error)
        }
      }
    }

    if (newTracks.length > 0) {
      const updatedTracks = [...tracks, ...newTracks]
      setTracks(updatedTracks)
      storageService.saveTracks(updatedTracks)
      setShowUpload(false)
    }
  }

  const handleTrackSelect = (track) => {
    if (currentTrack?.id !== track.id) {
      setCurrentTrack(track)
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  const handleTrackDelete = (trackId) => {
    const updatedTracks = tracks.filter(track => track.id !== trackId)
    setTracks(updatedTracks)
    storageService.saveTracks(updatedTracks)
    
    if (currentTrack?.id === trackId) {
      setCurrentTrack(null)
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  const handlePlayPause = () => {
    if (currentTrack) {
      setIsPlaying(!isPlaying)
    }
  }

  const handleNext = () => {
    if (tracks.length === 0) return
    
    const currentIndex = tracks.findIndex(track => track.id === currentTrack?.id)
    const nextIndex = currentIndex < tracks.length - 1 ? currentIndex + 1 : 0
    setCurrentTrack(tracks[nextIndex])
    setCurrentTime(0)
  }

  const handlePrevious = () => {
    if (tracks.length === 0) return
    
    const currentIndex = tracks.findIndex(track => track.id === currentTrack?.id)
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1
    setCurrentTrack(tracks[prevIndex])
    setCurrentTime(0)
  }

  const handleSeek = (time) => {
    setCurrentTime(time)
  }

  const handleTimeUpdate = (time) => {
    if (!isDragging) {
      setCurrentTime(time)
    }
  }

  const handleDurationChange = (newDuration) => {
    setDuration(newDuration)
    
    if (currentTrack && currentTrack.duration === 0) {
      const updatedTrack = { ...currentTrack, duration: newDuration }
      const updatedTracks = tracks.map(track => 
        track.id === currentTrack.id ? updatedTrack : track
      )
      setTracks(updatedTracks)
      setCurrentTrack(updatedTrack)
      storageService.saveTracks(updatedTracks)
    }
  }

  const handleTrackEnd = () => {
    handleNext()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Create Music Player
          </h1>
          <p className="text-slate-300 text-lg">
            Upload, play, and visualize your music collection
          </p>
        </motion.header>

        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <AudioPlayer
              track={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSeek={handleSeek}
              onVolumeChange={setVolume}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              onTrackEnd={handleTrackEnd}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <TrackList
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onTrackSelect={handleTrackSelect}
              onTrackDelete={handleTrackDelete}
              onFileUpload={handleFileUpload}
              showUpload={showUpload}
              onToggleUpload={() => setShowUpload(!showUpload)}
            />
          </motion.div>
        </div>

        {tracks.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-16"
          >
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 border border-slate-700/50">
              <div className="text-6xl mb-6">🎵</div>
              <h3 className="text-2xl font-semibold text-white mb-4">
                No tracks uploaded yet
              </h3>
              <p className="text-slate-400 mb-8">
                Upload your first MP3 file to get started with the music player
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105"
              >
                Upload Music
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default App