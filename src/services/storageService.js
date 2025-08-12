// LocalStorage management utilities for audio tracks

const STORAGE_KEYS = {
  TRACKS: 'audioPlayer_tracks',
  CURRENT_TRACK: 'audioPlayer_currentTrack',
  VOLUME: 'audioPlayer_volume',
  PLAYLIST_STATE: 'audioPlayer_playlistState'
};

class StorageService {
  // Track management
  static saveTracks(tracks) {
    try {
      const serializedTracks = JSON.stringify(tracks);
      localStorage.setItem(STORAGE_KEYS.TRACKS, serializedTracks);
      return true;
    } catch (error) {
      console.error('Failed to save tracks to localStorage:', error);
      return false;
    }
  }

  static getTracks() {
    try {
      const serializedTracks = localStorage.getItem(STORAGE_KEYS.TRACKS);
      if (!serializedTracks) return [];
      return JSON.parse(serializedTracks);
    } catch (error) {
      console.error('Failed to retrieve tracks from localStorage:', error);
      return [];
    }
  }

  static addTrack(track) {
    try {
      const tracks = this.getTracks();
      const newTrack = {
        id: Date.now().toString(),
        name: track.name,
        size: track.size,
        duration: track.duration || 0,
        dateAdded: new Date().toISOString(),
        ...track
      };
      tracks.push(newTrack);
      this.saveTracks(tracks);
      return newTrack;
    } catch (error) {
      console.error('Failed to add track:', error);
      return null;
    }
  }

  static removeTrack(trackId) {
    try {
      const tracks = this.getTracks();
      const filteredTracks = tracks.filter(track => track.id !== trackId);
      this.saveTracks(filteredTracks);
      
      // Clean up track data URL if it exists
      const removedTrack = tracks.find(track => track.id === trackId);
      if (removedTrack && removedTrack.url && removedTrack.url.startsWith('blob:')) {
        URL.revokeObjectURL(removedTrack.url);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to remove track:', error);
      return false;
    }
  }

  static updateTrack(trackId, updates) {
    try {
      const tracks = this.getTracks();
      const trackIndex = tracks.findIndex(track => track.id === trackId);
      
      if (trackIndex === -1) return false;
      
      tracks[trackIndex] = { ...tracks[trackIndex], ...updates };
      this.saveTracks(tracks);
      return true;
    } catch (error) {
      console.error('Failed to update track:', error);
      return false;
    }
  }

  // Current track state
  static saveCurrentTrack(trackId) {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_TRACK, trackId);
      return true;
    } catch (error) {
      console.error('Failed to save current track:', error);
      return false;
    }
  }

  static getCurrentTrack() {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_TRACK);
    } catch (error) {
      console.error('Failed to get current track:', error);
      return null;
    }
  }

  // Volume settings
  static saveVolume(volume) {
    try {
      localStorage.setItem(STORAGE_KEYS.VOLUME, volume.toString());
      return true;
    } catch (error) {
      console.error('Failed to save volume:', error);
      return false;
    }
  }

  static getVolume() {
    try {
      const volume = localStorage.getItem(STORAGE_KEYS.VOLUME);
      return volume !== null ? parseFloat(volume) : 0.7; // Default volume 70%
    } catch (error) {
      console.error('Failed to get volume:', error);
      return 0.7;
    }
  }

  // Playlist state (shuffle, repeat, etc.)
  static savePlaylistState(state) {
    try {
      const serializedState = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEYS.PLAYLIST_STATE, serializedState);
      return true;
    } catch (error) {
      console.error('Failed to save playlist state:', error);
      return false;
    }
  }

  static getPlaylistState() {
    try {
      const serializedState = localStorage.getItem(STORAGE_KEYS.PLAYLIST_STATE);
      if (!serializedState) {
        return {
          shuffle: false,
          repeat: 'none', // 'none', 'one', 'all'
          currentIndex: 0
        };
      }
      return JSON.parse(serializedState);
    } catch (error) {
      console.error('Failed to get playlist state:', error);
      return {
        shuffle: false,
        repeat: 'none',
        currentIndex: 0
      };
    }
  }

  // File handling utilities
  static async saveFileAsBlob(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });
      const url = URL.createObjectURL(blob);
      
      return {
        url,
        name: file.name,
        size: file.size,
        type: file.type
      };
    } catch (error) {
      console.error('Failed to save file as blob:', error);
      return null;
    }
  }

  // Storage cleanup utilities
  static clearAllData() {
    try {
      // Revoke all blob URLs before clearing
      const tracks = this.getTracks();
      tracks.forEach(track => {
        if (track.url && track.url.startsWith('blob:')) {
          URL.revokeObjectURL(track.url);
        }
      });

      // Clear localStorage
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  static getStorageUsage() {
    try {
      let totalSize = 0;
      Object.values(STORAGE_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += new Blob([item]).size;
        }
      });
      
      return {
        used: totalSize,
        usedMB: (totalSize / (1024 * 1024)).toFixed(2),
        trackCount: this.getTracks().length
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, usedMB: '0.00', trackCount: 0 };
    }
  }

  // Import/Export functionality
  static exportData() {
    try {
      const data = {
        tracks: this.getTracks(),
        currentTrack: this.getCurrentTrack(),
        volume: this.getVolume(),
        playlistState: this.getPlaylistState(),
        exportDate: new Date().toISOString()
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  static importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.tracks) this.saveTracks(data.tracks);
      if (data.currentTrack) this.saveCurrentTrack(data.currentTrack);
      if (data.volume !== undefined) this.saveVolume(data.volume);
      if (data.playlistState) this.savePlaylistState(data.playlistState);
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}

export default StorageService;