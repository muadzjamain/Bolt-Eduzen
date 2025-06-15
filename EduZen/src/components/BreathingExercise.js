import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Fade,
  useTheme
} from '@mui/material';

/**
 * Interactive 4-7-8 breathing exercise component
 * Guides users through the 4-7-8 breathing technique
 */
const BreathingExercise = ({ onStop }) => {
  const theme = useTheme();
  const [phase, setPhase] = useState('inhale'); // inhale, hold, exhale
  const [countdown, setCountdown] = useState(4);
  const [cycles, setCycles] = useState(0);
  const [isActive, setIsActive] = useState(true);
  
  // Define the breathing cycle timing
  const timings = {
    inhale: 4,
    hold: 7,
    exhale: 8
  };
  
  // Handle the breathing cycle
  useEffect(() => {
    if (!isActive) return;
    
    const timer = setTimeout(() => {
      setCountdown(prev => {
        if (prev > 1) {
          return prev - 1;
        } else {
          // Move to next phase
          if (phase === 'inhale') {
            setPhase('hold');
            return timings.hold;
          } else if (phase === 'hold') {
            setPhase('exhale');
            return timings.exhale;
          } else {
            // End of cycle
            setPhase('inhale');
            setCycles(prev => prev + 1);
            return timings.inhale;
          }
        }
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, phase, isActive]);
  
  // Instructions based on current phase
  const instructions = {
    inhale: 'Breathe in deeply through your nose',
    hold: 'Hold your breath',
    exhale: 'Exhale completely through your mouth'
  };
  
  // Colors for each phase
  const phaseColors = {
    inhale: theme.palette.primary.light,
    hold: theme.palette.secondary.main,
    exhale: theme.palette.primary.dark
  };
  
  // Handle stop button click
  const handleStop = useCallback(() => {
    setIsActive(false);
    if (onStop) {
      onStop();
    }
  }, [onStop]);
  
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 2,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        mb: 2,
        bgcolor: 'background.default'
      }}
    >
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'medium', color: phaseColors[phase] }}>
        4-7-8 Breathing Exercise
      </Typography>
      
      <Typography variant="subtitle1" gutterBottom>
        Cycle {cycles + 1} - {instructions[phase]}
      </Typography>
      
      <Box sx={{ position: 'relative', display: 'inline-flex', my: 3 }}>
        <CircularProgress
          variant="determinate"
          size={140}
          thickness={5}
          value={(countdown / timings[phase]) * 100}
          sx={{ color: phaseColors[phase] }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h3" component="div" color="text.secondary">
            {countdown}
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Fade in={phase === 'inhale'} timeout={300}>
          <Typography variant="body1" sx={{ minHeight: '24px', color: phaseColors.inhale }}>
            {phase === 'inhale' && 'Breathe in through your nose quietly'}
          </Typography>
        </Fade>
        <Fade in={phase === 'hold'} timeout={300}>
          <Typography variant="body1" sx={{ minHeight: '24px', color: phaseColors.hold }}>
            {phase === 'hold' && 'Hold your breath completely'}
          </Typography>
        </Fade>
        <Fade in={phase === 'exhale'} timeout={300}>
          <Typography variant="body1" sx={{ minHeight: '24px', color: phaseColors.exhale }}>
            {phase === 'exhale' && 'Exhale completely through your mouth with a whoosh sound'}
          </Typography>
        </Fade>
      </Box>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Complete at least 4 cycles for best results
      </Typography>
      
      <Button
        variant="outlined"
        color="primary"
        onClick={handleStop}
        sx={{ mt: 1 }}
      >
        Stop Exercise
      </Button>
    </Paper>
  );
};

export default BreathingExercise;
