class AudioService {
  constructor() {
    this.audioContext = null;
    this.audioElement = null;
    this.sourceNode = null;
    this.analyserNode = null;
    this.gainNode = null;
    this.isInitialized = false;
    this.dataArray = null;
    this.bufferLength = 0;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw new Error('Audio initialization failed');
    }
  }

  async setupAudio(audioElement) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Clean up existing nodes
      this.cleanup();

      this.audioElement = audioElement;

      // Create audio nodes
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      this.analyserNode = this.audioContext.createAnalyser();
      this.gainNode = this.audioContext.createGain();

      // Configure analyser
      this.analyserNode.fftSize = 256;
      this.bufferLength = this.analyserNode.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);

      // Connect nodes: source -> analyser -> gain -> destination
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

    } catch (error) {
      console.error('Failed to setup audio:', error);
      throw new Error('Audio setup failed');
    }
  }

  getFrequencyData() {
    if (!this.analyserNode || !this.dataArray) {
      return new Uint8Array(128); // Return empty array if not initialized
    }

    this.analyserNode.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  getTimeDomainData() {
    if (!this.analyserNode || !this.dataArray) {
      return new Uint8Array(128); // Return empty array if not initialized
    }

    this.analyserNode.getByteTimeDomainData(this.dataArray);
    return this.dataArray;
  }

  setVolume(volume) {
    if (this.gainNode) {
      // Clamp volume between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.gainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
    }
  }

  getVolume() {
    return this.gainNode ? this.gainNode.gain.value : 1;
  }

  async resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.error('Failed to resume audio context:', error);
      }
    }
  }

  // Visualization helpers
  createVisualizationData(type = 'frequency') {
    const data = type === 'frequency' ? this.getFrequencyData() : this.getTimeDomainData();
    
    // Convert to normalized array for easier visualization
    return Array.from(data).map(value => value / 255);
  }

  // Get average volume level for simple visualizations
  getAverageVolume() {
    const data = this.getFrequencyData();
    if (!data || data.length === 0) return 0;

    const sum = Array.from(data).reduce((acc, value) => acc + value, 0);
    return sum / data.length / 255; // Normalize to 0-1
  }

  // Get peak frequency data for bar visualizations
  getPeakData(barCount = 32) {
    const data = this.getFrequencyData();
    if (!data || data.length === 0) return new Array(barCount).fill(0);

    const barSize = Math.floor(data.length / barCount);
    const peaks = [];

    for (let i = 0; i < barCount; i++) {
      const start = i * barSize;
      const end = start + barSize;
      const slice = data.slice(start, end);
      const peak = Math.max(...slice) / 255; // Normalize to 0-1
      peaks.push(peak);
    }

    return peaks;
  }

  // Audio file validation
  static isValidAudioFile(file) {
    const validTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/mp4',
      'audio/x-m4a'
    ];
    
    return file && validTypes.includes(file.type);
  }

  // Create object URL for audio file
  static createAudioURL(file) {
    if (!this.isValidAudioFile(file)) {
      throw new Error('Invalid audio file type');
    }
    
    return URL.createObjectURL(file);
  }

  // Clean up object URLs
  static revokeAudioURL(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  // Extract metadata from audio file
  static async extractMetadata(file) {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = this.createAudioURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        const metadata = {
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          duration: audio.duration,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        };
        
        this.revokeAudioURL(url);
        resolve(metadata);
      });

      audio.addEventListener('error', () => {
        this.revokeAudioURL(url);
        resolve({
          name: file.name.replace(/\.[^/.]+$/, ''),
          duration: 0,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        });
      });

      audio.src = url;
    });
  }

  cleanup() {
    try {
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      
      if (this.analyserNode) {
        this.analyserNode.disconnect();
        this.analyserNode = null;
      }
      
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
    } catch (error) {
      console.error('Error during audio cleanup:', error);
    }
  }

  destroy() {
    this.cleanup();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.error);
    }
    
    this.audioContext = null;
    this.audioElement = null;
    this.dataArray = null;
    this.bufferLength = 0;
    this.isInitialized = false;
  }
}

// Create singleton instance
const audioService = new AudioService();

export default audioService;