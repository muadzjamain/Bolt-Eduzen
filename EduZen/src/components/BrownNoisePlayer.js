import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Slider,
  IconButton,
  Paper,
  Card,
  CardContent,
  useTheme,
  Tooltip
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';
import StopIcon from '@mui/icons-material/Stop';

/**
 * Brown noise player component for improving focus
 * Provides volume control and stop functionality
 */
const BrownNoisePlayer = ({ onStop }) => {
  const theme = useTheme();
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const audioRef = useRef(null);
  
  // Create audio context and nodes when component mounts
  useEffect(() => {
    // Create an AudioContext
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    // Create a buffer source node
    const bufferSize = 10 * audioContext.sampleRate;
    const brownNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = brownNoiseBuffer.getChannelData(0);
    
    // Generate brown noise
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      // Generate white noise
      const white = Math.random() * 2 - 1;
      
      // Apply brown noise filter
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Adjust volume
    }
    
    // Create a source node
    const brownNoiseSource = audioContext.createBufferSource();
    brownNoiseSource.buffer = brownNoiseBuffer;
    brownNoiseSource.loop = true;
    
    // Create a gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume / 100;
    
    // Connect the nodes
    brownNoiseSource.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start playing
    brownNoiseSource.start(0);
    
    // Assign to ref for later access
    audioRef.current = {
      audioContext,
      brownNoiseSource,
      gainNode
    };
    
    // Cleanup function
    return () => {
      if (audioRef.current) {
        try {
          if (audioRef.current.brownNoiseSource && 
              audioRef.current.brownNoiseSource.context && 
              audioRef.current.brownNoiseSource.context.state !== 'closed') {
            audioRef.current.brownNoiseSource.stop();
          }
          
          if (audioRef.current.audioContext && 
              audioRef.current.audioContext.state !== 'closed') {
            audioRef.current.audioContext.close();
          }
        } catch (err) {
          console.error('Error cleaning up audio context:', err);
        }
      }
    };
  }, []);
  
  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current && audioRef.current.gainNode) {
      audioRef.current.gainNode.gain.value = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);
  
  // Handle volume change
  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
    if (newValue > 0 && isMuted) {
      setIsMuted(false);
    }
  };
  
  // Handle mute toggle
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };
  
  // Handle stop button click
  const handleStop = () => {
    setIsPlaying(false);
    
    // Stop the audio
    if (audioRef.current) {
      try {
        // Check if source and context exist and are not already closed
        if (audioRef.current.brownNoiseSource && 
            audioRef.current.brownNoiseSource.context && 
            audioRef.current.brownNoiseSource.context.state !== 'closed') {
          audioRef.current.brownNoiseSource.stop();
        }
        
        if (audioRef.current.audioContext && 
            audioRef.current.audioContext.state !== 'closed') {
          audioRef.current.audioContext.close();
        }
      } catch (err) {
        console.error('Error stopping brown noise:', err);
      }
    }
    
    // Call the onStop callback
    if (onStop) {
      onStop();
    }
  };
  
  // Determine which volume icon to show
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeMuteIcon />;
    } else if (volume < 50) {
      return <VolumeDownIcon />;
    } else {
      return <VolumeUpIcon />;
    }
  };
  
  if (!isPlaying) {
    return null;
  }
  
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 2, 
        borderRadius: 2,
        backgroundColor: theme.palette.background.default,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <CardContent>
        <Typography variant="subtitle1" fontWeight="medium" color="primary" sx={{ mb: 1 }}>
          Brown Noise Player
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          Brown noise can help mask distracting sounds and improve focus. Adjust the volume to a comfortable level.
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton 
            onClick={handleMuteToggle}
            size="small"
            color={isMuted ? "default" : "primary"}
          >
            {getVolumeIcon()}
          </IconButton>
          
          <Slider
            value={volume}
            onChange={handleVolumeChange}
            aria-labelledby="brown-noise-volume-slider"
            sx={{ 
              mx: 2,
              color: theme.palette.primary.main
            }}
            disabled={!isPlaying}
          />
          
          <Tooltip title="Stop brown noise">
            <IconButton 
              onClick={handleStop}
              size="small"
              color="error"
              aria-label="stop brown noise"
            >
              <StopIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 1 }}
        >
          Brown noise is playing at {isMuted ? 'muted' : `${volume}%`} volume
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BrownNoisePlayer;
