/**
 * Speech Recognition Service for the ScholarAI chatbot
 * Provides continuous voice input capabilities with silence detection
 */
class SpeechRecognitionService {
  constructor() {
    // Check if browser supports SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.isSupported = false;
      console.error('Speech recognition not supported in this browser.');
      return;
    }
    
    this.isSupported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    // Settings
    this.silenceTimeout = null;
    this.silenceDelay = 1800; // 1.8 seconds of silence
    this.isListening = false;
    this.transcript = '';
    this.onResult = null;
    this.onSilenceEnd = null;
    this.onListeningChange = null;
    
    // Initialize event handlers
    this._initEventHandlers();
  }
  
  /**
   * Initialize speech recognition event handlers
   * @private
   */
  _initEventHandlers() {
    if (!this.isSupported) return;
    
    // Handle when speech is detected
    this.recognition.onresult = (event) => {
      // Get the latest result
      const current = event.resultIndex;
      const result = event.results[current];
      const transcript = result[0].transcript;
      
      // Update transcript with the latest recognition
      this.transcript = transcript;
      
      // Reset silence detection timer
      this._resetSilenceTimer();
      
      // Call result callback
      if (this.onResult) {
        this.onResult(transcript, result.isFinal);
      }
    };
    
    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      // Restart recognition if it's "no-speech" error and we're still supposed to be listening
      if (event.error === 'no-speech' && this.isListening) {
        this.restart();
      }
    };
    
    // Handle end event - may occur automatically due to silence
    this.recognition.onend = () => {
      // If we're supposed to be listening but recognition ended, restart it
      if (this.isListening) {
        this.recognition.start();
      }
    };
  }
  
  /**
   * Reset the silence detection timer
   * @private
   */
  _resetSilenceTimer() {
    // Clear existing timer
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    
    // Set new timer
    this.silenceTimeout = setTimeout(() => {
      // Silence detected - trigger the callback
      if (this.transcript && this.onSilenceEnd) {
        this.onSilenceEnd(this.transcript);
        this.transcript = '';
      }
    }, this.silenceDelay);
  }
  
  /**
   * Start listening for speech
   */
  start() {
    if (!this.isSupported) return;
    
    try {
      this.recognition.start();
      this.isListening = true;
      this.transcript = '';
      
      // Notify listener status changed
      if (this.onListeningChange) {
        this.onListeningChange(true);
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }
  
  /**
   * Stop listening for speech
   */
  stop() {
    if (!this.isSupported) return;
    
    try {
      this.recognition.stop();
      this.isListening = false;
      
      // Clear any pending silence timer
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
      
      // Notify listener status changed
      if (this.onListeningChange) {
        this.onListeningChange(false);
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }
  
  /**
   * Restart the speech recognition
   */
  restart() {
    this.stop();
    setTimeout(() => this.start(), 100);
  }
  
  /**
   * Toggle listening state
   * @returns {boolean} New listening state
   */
  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
    return this.isListening;
  }
}

export default SpeechRecognitionService;
