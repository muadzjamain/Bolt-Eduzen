import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  LinearProgress,
  Avatar,
  Fade,
  Tooltip,
  Divider,
  useTheme,
  Slider,
  Snackbar,
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SpaIcon from '@mui/icons-material/Spa';
import TimerIcon from '@mui/icons-material/Timer';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import { v4 as uuidv4 } from 'uuid';
import { getGeminiResponse } from '../services/gemini';
import { analyzeSentiment } from '../services/sentiment';
import { addMinutes } from 'date-fns';

const WellBeingAssistant = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathingCount, setBreathingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [breakDuration, setBreakDuration] = useState(15);
  const [showBreakSlider, setShowBreakSlider] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isSchedulingBreak, setIsSchedulingBreak] = useState(false);
  const [schedulingError, setSchedulingError] = useState(null);
  const [activeBreakTimer, setActiveBreakTimer] = useState(null);
  const [breakEndTime, setBreakEndTime] = useState(null);
  const chatEndRef = useRef(null);
  const breakSliderRef = useRef(null);
  const theme = useTheme();
  const audioRef = useRef(null);

  useEffect(() => {
    setIsBreathing(false);
    setBreathingCount(0);
    
    // Create audio element for beep sound
    audioRef.current = new Audio('https://assets.coderrocketfuel.com/pomodoro-times-up.mp3');
    audioRef.current.volume = 0.7;
    
    return () => {
      // Cleanup audio on component unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Clear any active break timers
      if (activeBreakTimer) {
        clearTimeout(activeBreakTimer);
      }
    };
  }, []);

  // Auto-scroll to bottom when chat updates
  useEffect(() => {
    // Only auto-scroll if the user is not viewing the break slider
    if (!showBreakSlider) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, showBreakSlider]);

  // Update break timer countdown
  useEffect(() => {
    if (!breakEndTime) return;
    
    const intervalId = setInterval(() => {
      const now = new Date();
      const timeLeft = breakEndTime - now;
      
      if (timeLeft <= 0) {
        clearInterval(intervalId);
      } else {
        // Force re-render to update countdown
        setBreakEndTime(prev => new Date(prev.getTime()));
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [breakEndTime]);

  // Format text by removing markdown formatting
  const formatText = (text) => {
    if (!text) return '';
    
    // Remove bold formatting
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Remove italic formatting
    formatted = formatted.replace(/\*(.*?)\*/g, '$1');
    
    // Remove code blocks
    formatted = formatted.replace(/```(.*?)```/gs, '$1');
    
    // Remove inline code
    formatted = formatted.replace(/`(.*?)`/g, '$1');
    
    // Remove headers
    formatted = formatted.replace(/#{1,6}\s+(.+)/g, '$1');
    
    return formatted;
  };

  const playBeepSound = () => {
    if (!audioRef.current) return;
    
    let beepCount = 0;
    
    const playNextBeep = () => {
      if (beepCount < 6) {
        audioRef.current.play();
        beepCount++;
        
        audioRef.current.onended = () => {
          // Add a small delay between beeps
          setTimeout(playNextBeep, 500);
        };
      } else {
        // Add a message to the chat when beeps are done
        const notificationMessage = {
          id: uuidv4(),
          message: "Your break time has ended! Time to get back to studying.",
          sender: 'assistant',
          timestamp: new Date(),
          isNotification: true
        };
        
        setChatHistory(prev => [...prev, notificationMessage]);
      }
    };
    
    playNextBeep();
  };

  const startBreakTimer = (durationMinutes) => {
    // Calculate end time
    const endTime = new Date(Date.now() + durationMinutes * 60 * 1000);
    setBreakEndTime(endTime);
    
    // Set a timeout to play the beep sound when the break ends
    const timerId = setTimeout(() => {
      playBeepSound();
      setBreakEndTime(null);
      setActiveBreakTimer(null);
      
      // Show a snackbar notification
      setSnackbarMessage('Break time is over!');
      setShowSnackbar(true);
    }, durationMinutes * 60 * 1000);
    
    setActiveBreakTimer(timerId);
    
    // Return the timer ID so it can be cleared if needed
    return timerId;
  };

  const handleMessageSend = async () => {
    if (!message.trim()) return;

    const currentMessage = message;
    setMessage(''); // Clear input immediately

    try {
      setError(null);
      setLoading(true);

      // Add user message to chat
      const userMessage = { 
        id: uuidv4(),
        message: formatText(currentMessage), 
        sender: 'user', 
        timestamp: new Date() 
      };
      setChatHistory(prev => [...prev, userMessage]);

      // Get response from Gemini
      console.log('Sending message to Gemini:', currentMessage); // Debug log
      const response = await getGeminiResponse(currentMessage);
      console.log('Received response from Gemini:', response); // Debug log
      
      if (!response || typeof response !== 'string') {
        throw new Error('Invalid response format from Gemini');
      }

      // Add assistant's response to chat
      const assistantMessage = { 
        id: uuidv4(),
        message: formatText(response), 
        sender: 'assistant', 
        timestamp: new Date() 
      };
      setChatHistory(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error in handleMessageSend:', {
        error,
        message: error.message,
        stack: error.stack
      });
      
      setError('Failed to get response. Please try again.');
      
      // Add error message to chat
      const errorMessage = { 
        id: uuidv4(),
        message: `Sorry, I encountered an error: ${error.message}`, 
        sender: 'assistant', 
        timestamp: new Date(),
        isError: true 
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const startBreathingExercise = () => {
    setIsBreathing(true);
    setBreathingCount(0);
    const interval = setInterval(() => {
      setBreathingCount(count => {
        if (count >= 10) {
          clearInterval(interval);
          setIsBreathing(false);
          return 0;
        }
        return count + 1;
      });
    }, 5000); // 5 seconds per breath
    
    // Store the interval ID so we can clear it if canceled
    window.breathingInterval = interval;
  };
  
  const cancelBreathingExercise = () => {
    if (window.breathingInterval) {
      clearInterval(window.breathingInterval);
    }
    setIsBreathing(false);
    setBreathingCount(0);
  };

  const handleBreakScheduling = async () => {
    setIsSchedulingBreak(true);
    setSchedulingError(null);
    
    try {
      // Get the break duration in minutes
      const breakDurationMinutes = parseInt(breakDuration, 10);
      if (isNaN(breakDurationMinutes) || breakDurationMinutes <= 0) {
        throw new Error('Please enter a valid break duration');
      }
      
      // Calculate break end time
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + breakDurationMinutes * 60000);
      
      // Format times for display
      const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      };
      
      // Try to use Google Calendar if available
      let calendarEventCreated = false;
      
      if (window.gapi && window.gapi.client && window.gapi.client.calendar) {
        try {
          console.log('Attempting to schedule break with Google Calendar');
          
          // Check if we have the calendar API loaded
          if (!window.gapi.client.calendar) {
            await window.gapi.client.load('calendar', 'v3');
          }
          
          // Create the calendar event
          const event = {
            'summary': 'Study Break',
            'description': 'Time to take a break from studying and recharge!',
            'start': {
              'dateTime': startTime.toISOString(),
              'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            'end': {
              'dateTime': endTime.toISOString(),
              'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            'reminders': {
              'useDefault': false,
              'overrides': [
                {'method': 'popup', 'minutes': 0}
              ]
            }
          };
          
          const request = window.gapi.client.calendar.events.insert({
            'calendarId': 'primary',
            'resource': event
          });
          
          const response = await new Promise((resolve, reject) => {
            request.execute(resp => {
              if (resp.error) {
                reject(resp.error);
              } else {
                resolve(resp);
              }
            });
          });
          
          console.log('Google Calendar event created:', response);
          calendarEventCreated = true;
          
          // Add the event to chat
          const newMessage = {
            id: Date.now(),
            sender: 'assistant',
            message: `I've scheduled a ${breakDurationMinutes} minute break for you starting now (${formatTime(startTime)}) until ${formatTime(endTime)}. I've also added this to your Google Calendar. You'll hear 6 beeps when your break time is over.`,
            timestamp: new Date().toISOString()
          };
          
          setChatHistory(prev => [...prev, newMessage]);
          
          // Start the break timer
          startBreakTimer(breakDurationMinutes);
          
        } catch (error) {
          console.error('Error scheduling with Google Calendar:', error);
          // Fall back to local timer
          calendarEventCreated = false;
        }
      }
      
      // If Google Calendar failed or isn't available, use local timer
      if (!calendarEventCreated) {
        console.log('Using local break timer');
        
        // Add the event to chat
        const newMessage = {
          id: Date.now(),
          sender: 'assistant',
          message: `I've scheduled a ${breakDurationMinutes} minute break for you starting now (${formatTime(startTime)}) until ${formatTime(endTime)}. You'll hear 6 beeps when your break time is over.`,
          timestamp: new Date().toISOString()
        };
        
        setChatHistory(prev => [...prev, newMessage]);
        
        // Start the break timer
        startBreakTimer(breakDurationMinutes);
      }
      
      // Clear the input and hide the slider
      setBreakDuration(15);
      setShowBreakSlider(false);
      
    } catch (error) {
      console.error('Error scheduling break:', error);
      setSchedulingError(error.message || 'Failed to schedule break');
    } finally {
      setIsSchedulingBreak(false);
    }
  };

  const toggleBreakSlider = () => {
    setShowBreakSlider(!showBreakSlider);
    
    // If opening the slider, scroll to it after a short delay to allow for render
    if (!showBreakSlider) {
      setTimeout(() => {
        breakSliderRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  };

  const handleSliderChange = (event, newValue) => {
    setBreakDuration(newValue);
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          borderRadius: 2,
          background: 'linear-gradient(to right bottom, #ffffff, #f8f9fa)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            color: theme.palette.primary.main,
            fontWeight: 'bold',
            mb: 3
          }}
        >
          <SpaIcon sx={{ mr: 1, fontSize: 32 }} /> AI Study Companion
        </Typography>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* Active Break Timer */}
        {breakEndTime && (
          <Fade in={true}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: theme.palette.primary.light,
                color: 'white',
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimerIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle1">
                  Break Time Remaining:
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {(() => {
                  const now = new Date();
                  const diff = Math.max(0, breakEndTime - now);
                  const minutes = Math.floor(diff / 60000);
                  const seconds = Math.floor((diff % 60000) / 1000);
                  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                })()}
              </Typography>
            </Paper>
          </Fade>
        )}
        
        {/* Chat history */}
        <Box 
          sx={{ 
            mb: 3, 
            height: '450px', 
            overflowY: 'auto',
            p: 1,
            borderRadius: 1,
            bgcolor: 'rgba(0, 0, 0, 0.02)',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
            },
          }}
        >
          <List>
            {chatHistory.map((chat) => (
              <Fade in={true} key={chat.id} timeout={500}>
                <ListItem
                  sx={{
                    justifyContent: chat.sender === 'user' ? 'flex-end' : 'flex-start',
                    mb: 2,
                    alignItems: 'flex-start'
                  }}
                >
                  {chat.sender === 'assistant' && (
                    <Avatar 
                      sx={{ 
                        mr: 1, 
                        bgcolor: chat.isError ? 'error.main' : 'primary.main',
                        width: 36,
                        height: 36
                      }}
                    >
                      <SmartToyIcon fontSize="small" />
                    </Avatar>
                  )}
                  
                  <Card
                    sx={{
                      maxWidth: '75%',
                      bgcolor: chat.sender === 'user' 
                        ? theme.palette.primary.main 
                        : chat.isError 
                          ? theme.palette.error.light 
                          : '#ffffff',
                      color: chat.sender === 'user' ? 'white' : chat.isError ? 'white' : 'text.primary',
                      borderRadius: chat.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{formatText(chat.message)}</Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          display: 'block', 
                          mt: 1,
                          color: chat.sender === 'user' ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                          textAlign: 'right'
                        }}
                      >
                        {new Date(chat.timestamp).toLocaleTimeString()}
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  {chat.sender === 'user' && (
                    <Avatar 
                      sx={{ 
                        ml: 1, 
                        bgcolor: 'secondary.main',
                        width: 36,
                        height: 36
                      }}
                    >
                      <PersonIcon fontSize="small" />
                    </Avatar>
                  )}
                </ListItem>
              </Fade>
            ))}
            <div ref={chatEndRef} />
          </List>
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <LinearProgress sx={{ width: '50%', borderRadius: 1 }} />
            </Box>
          )}
          
          {error && (
            <Typography color="error" sx={{ mt: 2, textAlign: 'center' }}>
              {error}
            </Typography>
          )}
          
          {isBreathing && (
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                my: 2,
                p: 3,
                bgcolor: 'primary.light',
                color: 'white',
                position: 'relative'
              }}
            >
              <IconButton
                aria-label="close breathing exercise"
                onClick={cancelBreathingExercise}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
              
              <Typography variant="h6" gutterBottom>
                Breathing Exercise
              </Typography>
              <Box 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  borderRadius: '50%', 
                  bgcolor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: breathingCount % 2 === 0 
                    ? 'breatheIn 5s infinite' 
                    : 'breatheOut 5s infinite',
                  '@keyframes breatheIn': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.3)' },
                    '100%': { transform: 'scale(1)' }
                  },
                  '@keyframes breatheOut': {
                    '0%': { transform: 'scale(1.3)' },
                    '50%': { transform: 'scale(1)' },
                    '100%': { transform: 'scale(1.3)' }
                  }
                }}
              >
                <Typography variant="h4" color="primary.main">
                  {breathingCount % 2 === 0 ? 'In' : 'Out'}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Breath {Math.floor(breathingCount / 2) + 1} of 5
              </Typography>
            </Box>
          )}
        </Box>

        {/* Message input */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 1,
            bgcolor: 'rgba(0, 0, 0, 0.03)',
            p: 1,
            borderRadius: 3
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleMessageSend()}
            disabled={loading}
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: '#ffffff',
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                  borderWidth: 2
                }
              }
            }}
          />
          <Tooltip title="Send message">
            <span>
              <IconButton 
                color="primary" 
                onClick={handleMessageSend}
                disabled={loading || !message.trim()}
                sx={{ 
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(0, 0, 0, 0.12)',
                    color: 'rgba(0, 0, 0, 0.26)'
                  }
                }}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
        <Tooltip title="Take a moment to breathe and relax">
          <Button
            variant="contained"
            startIcon={<SpaIcon />}
            onClick={startBreathingExercise}
            disabled={isBreathing}
            sx={{ 
              borderRadius: 3,
              py: 1.5,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              bgcolor: theme.palette.secondary.main,
              '&:hover': {
                bgcolor: theme.palette.secondary.dark
              }
            }}
          >
            Start Breathing Exercise
          </Button>
        </Tooltip>
        <Tooltip title="Schedule a break in your calendar">
          <Button
            variant="contained"
            startIcon={<TimerIcon />}
            onClick={toggleBreakSlider}
            sx={{ 
              borderRadius: 3,
              py: 1.5,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark
              }
            }}
          >
            Schedule Break
          </Button>
        </Tooltip>
      </Box>

      {showBreakSlider && (
        <Card 
          ref={breakSliderRef}
          sx={{ mt: 3, p: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
        >
          <Typography variant="h6" gutterBottom>
            Select Break Duration
          </Typography>
          <Box sx={{ px: 2, py: 3 }}>
            <Slider
              value={breakDuration}
              onChange={handleSliderChange}
              min={5}
              max={60}
              step={5}
              marks={[
                { value: 5, label: '5m' },
                { value: 15, label: '15m' },
                { value: 25, label: '25m' },
                { value: 40, label: '40m' },
                { value: 60, label: '1h' },
              ]}
              valueLabelDisplay="on"
              sx={{
                color: theme.palette.primary.main,
                '& .MuiSlider-thumb': {
                  height: 24,
                  width: 24,
                  backgroundColor: theme.palette.primary.main,
                },
                '& .MuiSlider-rail': {
                  opacity: 0.5,
                  backgroundColor: '#bfbfbf',
                },
                '& .MuiSlider-mark': {
                  backgroundColor: '#bfbfbf',
                  height: 8,
                  width: 1,
                  marginTop: -3,
                },
                '& .MuiSlider-markActive': {
                  opacity: 1,
                  backgroundColor: 'currentColor',
                },
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleBreakScheduling}
              disabled={isSchedulingBreak}
              sx={{ 
                borderRadius: 3,
                py: 1.5,
                px: 4
              }}
            >
              {isSchedulingBreak ? 'Scheduling...' : `Schedule ${breakDuration}-minute Break`}
            </Button>
          </Box>
        </Card>
      )}

      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success" 
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default WellBeingAssistant;
