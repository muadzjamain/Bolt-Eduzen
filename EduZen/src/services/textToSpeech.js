/**
 * Text-to-speech service for ScholarAI chatbot using Web Speech API
 * Provides voice output capabilities with customizable voices
 */
class TextToSpeechService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isSupported = typeof this.synth !== 'undefined';
    this.voices = [];
    this.selectedVoice = null;
    this.isEnabled = true;
    this.isSpeaking = false;
    this.utterance = null;
    this.voicesLoadedCallbacks = [];
    
    if (!this.isSupported) {
      console.error('Text-to-speech not supported in this browser.');
      return;
    }
    
    // Load available voices
    this._loadVoices();
    
    // If voices aren't loaded immediately, wait for them
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = this._loadVoices.bind(this);
    }
    
    // Try to load saved voice preference
    this._loadSavedVoicePreference();
  }
  
  /**
   * Load available voices and set default voice if none selected
   * @private
   */
  _loadVoices() {
    this.voices = this.synth.getVoices();
    
    // Sort voices: first by language (English first), then by name
    this.voices.sort((a, b) => {
      // English voices first
      const aIsEnglish = a.lang.startsWith('en');
      const bIsEnglish = b.lang.startsWith('en');
      
      if (aIsEnglish && !bIsEnglish) return -1;
      if (!aIsEnglish && bIsEnglish) return 1;
      
      // Then sort by name
      return a.name.localeCompare(b.name);
    });
    
    // If no voice is selected yet, choose a default voice
    if (!this.selectedVoice && this.voices.length > 0) {
      this._selectDefaultVoice();
    }
    
    // Notify any pending callbacks that voices are loaded
    this.voicesLoadedCallbacks.forEach(callback => callback(this.voices));
    this.voicesLoadedCallbacks = [];
  }
  
  /**
   * Select a good default voice (prioritizing Microsoft Andrew Online)
   * @private
   */
  _selectDefaultVoice() {
    // Try to find Microsoft Andrew Online (Natural) first
    const andrewVoice = this.voices.find(v => 
      v.name === 'Microsoft Andrew Online (Natural) - English (United States)' ||
      v.name.includes('Microsoft Andrew')
    );
    
    if (andrewVoice) {
      console.log('Setting default voice to Microsoft Andrew Online');
      this.selectedVoice = andrewVoice;
      return;
    }
    
    // Fallback preferred voices if Andrew is not available
    const preferredVoiceNames = [
      'Microsoft David',
      'Google US English Male',
      'Daniel',
      'Alex',
      'Fred',
      'UK English Male',
      'US English Male'
    ];
    
    // Try to find one of our preferred voices
    for (const name of preferredVoiceNames) {
      const foundVoice = this.voices.find(v => v.name.includes(name));
      if (foundVoice) {
        console.log(`Setting default voice to ${foundVoice.name}`);
        this.selectedVoice = foundVoice;
        return;
      }
    }
    
    // If none found, try to find a male English voice
    const maleCandidates = this.voices.filter(voice => 
      (voice.name.includes('Male') || !voice.name.includes('Female')) && 
      voice.lang.startsWith('en')
    );
    
    if (maleCandidates.length > 0) {
      this.selectedVoice = maleCandidates[0];
      return;
    }
    
    // If still no voice found, just use the first English voice
    const englishVoices = this.voices.filter(voice => voice.lang.startsWith('en'));
    if (englishVoices.length > 0) {
      this.selectedVoice = englishVoices[0];
      return;
    }
    
    // Last resort: use first available voice
    if (this.voices.length > 0) {
      this.selectedVoice = this.voices[0];
    }
  }
  
  /**
   * Stop any currently speaking utterance
   */
  stop() {
    if (!this.isSupported) return;
    
    this.synth.cancel();
    this.isSpeaking = false;
  }
  
  /**
   * Enable or disable text-to-speech
   * @param {boolean} enabled - Whether TTS should be enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }
  
  /**
   * Get whether TTS is enabled
   * @returns {boolean} TTS enabled status
   */
  getEnabled() {
    return this.isEnabled;
  }
  
  /**
   * Speak the given text using the selected voice
   * @param {string} text - Text to be spoken
   * @param {Function} onEnd - Callback when speech ends
   */
  speak(text, onEnd = null) {
    if (!this.isSupported || !this.isEnabled || !text) return;
    
    // Clean up text for better speech
    const cleanText = this._prepareTextForSpeech(text);
    
    // Stop any current speech
    this.stop();
    
    // Create a new utterance
    this.utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Set voice, if available
    if (this.selectedVoice) {
      this.utterance.voice = this.selectedVoice;
    }
    
    // Configure speech parameters
    this.utterance.rate = 1.0;  // Normal speed
    this.utterance.pitch = 1.0; // Normal pitch
    this.utterance.volume = 1.0; // Full volume
    
    // Set event handlers
    this.utterance.onstart = () => {
      this.isSpeaking = true;
    };
    
    this.utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };
    
    this.utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };
    
    // Start speaking
    this.synth.speak(this.utterance);
  }
  
  /**
   * Prepare text for better speech quality
   * @param {string} text - Text to prepare
   * @returns {string} Prepared text
   * @private
   */
  _prepareTextForSpeech(text) {
    if (!text) return '';
    
    // Remove markdown formatting
    let cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1')     // Remove italic
      .replace(/```(.*?)```/gs, '$1')  // Remove code blocks
      .replace(/`(.*?)`/g, '$1')       // Remove inline code
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Replace [text](link) with just text
      .replace(/\n\n/g, '. ')          // Replace double newlines with periods for better pausing
      .replace(/\n/g, '. ');           // Replace single newlines with periods
    
    // Replace common abbreviations
    cleanText = cleanText
      .replace(/(\b)e\.g\.(\b)/g, '$1for example$2')
      .replace(/(\b)i\.e\.(\b)/g, '$1that is$2')
      .replace(/(\b)etc\.(\b)/g, '$1etcetera$2');
    
    return cleanText;
  }
  
  /**
   * Get all available voices
   * @param {Function} callback - Optional callback for when voices are loaded
   * @returns {Array} Array of voice objects
   */
  getVoices(callback = null) {
    // If voices are already loaded, return them immediately
    if (this.voices.length > 0) {
      if (callback) callback(this.voices);
      return this.voices;
    }
    
    // If voices aren't loaded yet and a callback was provided, queue it
    if (callback) {
      this.voicesLoadedCallbacks.push(callback);
    }
    
    return [];
  }
  
  /**
   * Set the active voice by URI
   * @param {string} voiceURI - The URI of the voice to use
   * @returns {boolean} Whether the voice was successfully set
   */
  setVoice(voiceURI) {
    // Find the voice with the given URI
    const voice = this.voices.find(v => v.voiceURI === voiceURI);
    
    if (voice) {
      // Set the active voice
      this.selectedVoice = voice;
      
      // Save preference
      this._saveVoicePreference(voiceURI);
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the currently selected voice
   * @returns {SpeechSynthesisVoice|null} The currently selected voice
   */
  getCurrentVoice() {
    return this.selectedVoice;
  }
  
  /**
   * Save voice preference to localStorage
   * @param {string} voiceURI - The URI of the preferred voice
   * @private
   */
  _saveVoicePreference(voiceURI) {
    try {
      localStorage.setItem('scholarai_voice_preference', voiceURI);
    } catch (e) {
      console.error('Could not save voice preference:', e);
    }
  }
  
  /**
   * Load saved voice preference from localStorage
   * @private
   */
  _loadSavedVoicePreference() {
    try {
      const savedVoiceURI = localStorage.getItem('scholarai_voice_preference');
      
      if (savedVoiceURI && this.voices.length > 0) {
        // Try to find the saved voice in available voices
        const voiceFound = this.setVoice(savedVoiceURI);
        
        // If the saved voice wasn't found, try to set Microsoft Andrew as default
        if (!voiceFound) {
          const andrewVoice = this.voices.find(v => 
            v.name === 'Microsoft Andrew Online (Natural) - English (United States)' ||
            v.name.includes('Microsoft Andrew')
          );
          
          if (andrewVoice) {
            console.log('Setting voice to Microsoft Andrew Online');
            this.selectedVoice = andrewVoice;
            this._saveVoicePreference(andrewVoice.voiceURI);
          }
        }
      } else if (this.voices.length > 0) {
        // If no saved preference, try to set Microsoft Andrew as default
        const andrewVoice = this.voices.find(v => 
          v.name === 'Microsoft Andrew Online (Natural) - English (United States)' ||
          v.name.includes('Microsoft Andrew')
        );
        
        if (andrewVoice) {
          console.log('Setting voice to Microsoft Andrew Online');
          this.selectedVoice = andrewVoice;
          this._saveVoicePreference(andrewVoice.voiceURI);
        }
      }
    } catch (e) {
      console.error('Could not load voice preference:', e);
    }
  }
}

export default TextToSpeechService;
