import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TimerIcon from '@mui/icons-material/Timer';
import SchoolIcon from '@mui/icons-material/School';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import DoneIcon from '@mui/icons-material/Done';
import { generateStudyPlan, generatePDFStudyPlan, generatePlanDates, estimateStudyTime } from '../services/studyPlan';
import { format, addDays } from 'date-fns';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

// Learning style options
const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual', description: 'Learns best through images, diagrams, and spatial understanding' },
  { value: 'auditory', label: 'Auditory', description: 'Learns best through listening and speaking' },
  { value: 'reading', label: 'Reading/Writing', description: 'Learns best through reading and writing information' },
  { value: 'kinesthetic', label: 'Kinesthetic', description: 'Learns best through hands-on activities and practice' }
];

const StudyPlanGenerator = ({ content, onClose, onPlanSaved }) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [studyPlan, setStudyPlan] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  
  // Timer state
  const [activeTimer, setActiveTimer] = useState(null); // {dayIndex, sessionIndex, timeLeft}
  const [sessionProgress, setSessionProgress] = useState({}); // Map of completed/in-progress sessions
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  
  // Form state
  const [startDate, setStartDate] = useState(new Date());
  const [difficulty, setDifficulty] = useState(3);
  const [timeAvailable, setTimeAvailable] = useState(120);
  const [daysToComplete, setDaysToComplete] = useState(7);
  const [learningStyle, setLearningStyle] = useState('visual');
  
  // Estimate study time based on content
  const estimatedTime = estimateStudyTime(content);
  
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleGeneratePlan = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const preferences = {
        difficulty,
        timeAvailable,
        daysToComplete,
        learningStyle
      };
      
      // Dispatch a custom event to notify AIChatbot about study plan generation
      window.dispatchEvent(new CustomEvent('scholarai:generateStudyPlan', {
        detail: {
          difficulty: difficulty,
          timeAvailable: timeAvailable,
          daysToComplete: daysToComplete,
          learningStyle: learningStyle
        }
      }));
      
      // Check if the content is from a PDF
      const isPDF = content && content.includes('PDF analysis') || content.includes('Analyzing this PDF');
      
      let plan;
      if (isPDF) {
        plan = await generatePDFStudyPlan(content, preferences);
      } else {
        plan = await generateStudyPlan(content, preferences);
      }
      
      setStudyPlan(plan);
      setActiveStep(2);
    } catch (error) {
      console.error('Error generating study plan:', error);
      setError('Failed to generate study plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownloadPlan = () => {
    if (!studyPlan) return;
    
    // Create a formatted text version of the study plan
    let planText = `# EduZen Personalized Study Plan\n\n`;
    planText += `## Overview\n${studyPlan.overview}\n\n`;
    
    studyPlan.days.forEach(day => {
      planText += `## Day ${day.day} - ${day.date}\n\n`;
      
      day.sessions.forEach(session => {
        planText += `### ${session.title} (${session.duration} minutes)\n`;
        planText += `Type: ${session.type}\n`;
        if (session.topics && session.topics.length > 0) {
          planText += `Topics: ${session.topics.join(', ')}\n`;
        }
        planText += `${session.description}\n\n`;
      });
    });
    
    planText += `## Study Tips\n`;
    studyPlan.tips.forEach(tip => {
      planText += `- ${tip}\n`;
    });
    
    // Create and download the file
    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EduZen_Study_Plan.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Timer functions
  const startTimer = (dayIndex, sessionIndex, duration) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Convert duration from minutes to milliseconds
    const durationMs = duration * 60 * 1000;
    const sessionKey = `${dayIndex}-${sessionIndex}`;
    const existingProgress = sessionProgress[sessionKey] || {};
    
    // Initialize timeLeft and timeSpent
    const initialTimeLeft = existingProgress.timeLeft !== undefined ? existingProgress.timeLeft : durationMs;
    const initialTimeSpent = existingProgress.timeSpent || 0;
    
    // Set the active timer with the correct time left
    setActiveTimer({ dayIndex, sessionIndex, timeLeft: initialTimeLeft });
    
    // Record the start time for this timer session
    const timerStartTime = Date.now();
    startTimeRef.current = timerStartTime;
    
    // Update session progress
    setSessionProgress(prev => ({
      ...prev,
      [sessionKey]: {
        ...existingProgress,
        inProgress: true,
        timeLeft: initialTimeLeft,
        startTime: timerStartTime,
        timeSpent: initialTimeSpent
      }
    }));
    
    // Start interval - update every 100ms for smoother countdown
    timerRef.current = setInterval(() => {
      // Calculate elapsed time since timer started
      const elapsed = Date.now() - timerStartTime;
      
      // Calculate new time left - based on initial time left minus elapsed time
      const newTimeLeft = Math.max(0, initialTimeLeft - elapsed);
      
      // Update the active timer display
      setActiveTimer(prev => ({
        ...prev,
        timeLeft: newTimeLeft
      }));
      
      // If timer is complete
      if (newTimeLeft <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        
        // Update the session progress with final values
        setSessionProgress(prev => {
          const currentSession = prev[sessionKey] || {};
          return {
            ...prev,
            [sessionKey]: {
              ...currentSession,
              timeLeft: 0,
              inProgress: false,
              timeSpent: initialTimeSpent + elapsed,
              completed: true
            }
          };
        });
        
        // Mark session as completed
        completeSession(dayIndex, sessionIndex);
      }
    }, 100);
  };
  
  const pauseTimer = () => {
    if (timerRef.current && activeTimer) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      
      const { dayIndex, sessionIndex, timeLeft } = activeTimer;
      const sessionKey = `${dayIndex}-${sessionIndex}`;
      
      // Calculate elapsed time and update timeSpent
      const elapsedSinceStart = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      
      // Update session progress to save current state
      setSessionProgress(prev => {
        const currentSession = prev[sessionKey] || {};
        const updatedTimeSpent = (currentSession.timeSpent || 0) + elapsedSinceStart;
        
        return {
          ...prev,
          [sessionKey]: {
            ...currentSession,
            inProgress: false,
            timeLeft: timeLeft,
            timeSpent: updatedTimeSpent
          }
        };
      });
    }
  };
  
  const resumeTimer = () => {
    if (activeTimer) {
      const { dayIndex, sessionIndex, timeLeft } = activeTimer;
      const sessionKey = `${dayIndex}-${sessionIndex}`;
      const session = studyPlan.days[dayIndex].sessions[sessionIndex];
      
      // Get the current progress for this session
      const currentProgress = sessionProgress[sessionKey] || {};
      
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Set the active timer with the current time left
      setActiveTimer({ dayIndex, sessionIndex, timeLeft });
      
      // Record the new start time
      const timerStartTime = Date.now();
      startTimeRef.current = timerStartTime;
      
      // Update session progress
      setSessionProgress(prev => ({
        ...prev,
        [sessionKey]: {
          ...currentProgress,
          inProgress: true,
          startTime: timerStartTime
        }
      }));
      
      // Start interval with the current timeLeft
      timerRef.current = setInterval(() => {
        // Calculate elapsed time since resume
        const elapsed = Date.now() - timerStartTime;
        
        // Calculate new time left
        const newTimeLeft = Math.max(0, timeLeft - elapsed);
        
        // Update the active timer display
        setActiveTimer(prev => ({
          ...prev,
          timeLeft: newTimeLeft
        }));
        
        // If timer is complete
        if (newTimeLeft <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          
          // Update the session progress
          setSessionProgress(prev => {
            const updatedSession = prev[sessionKey] || {};
            return {
              ...prev,
              [sessionKey]: {
                ...updatedSession,
                timeLeft: 0,
                inProgress: false,
                timeSpent: (updatedSession.timeSpent || 0) + elapsed,
                completed: true
              }
            };
          });
          
          // Mark session as completed
          completeSession(dayIndex, sessionIndex);
        }
      }, 100);
    }
  };
  
  const stopTimer = (dayIndex, sessionIndex) => {
    // Clear current timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const sessionKey = `${dayIndex}-${sessionIndex}`;
    
    // Calculate elapsed time and update timeSpent
    const elapsedSinceStart = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    
    // Ask if user wants to mark as completed
    const shouldComplete = window.confirm('Do you want to mark this session as completed?');
    
    // Update the session progress
    setSessionProgress(prev => {
      const currentSession = prev[sessionKey] || {};
      const updatedTimeSpent = (currentSession.timeSpent || 0) + elapsedSinceStart;
      
      return {
        ...prev,
        [sessionKey]: {
          ...currentSession,
          inProgress: false,
          timeSpent: updatedTimeSpent,
          completed: shouldComplete || false
        }
      };
    });
    
    if (shouldComplete) {
      completeSession(dayIndex, sessionIndex);
    }
    
    setActiveTimer(null);
  };
  
  const completeSession = (dayIndex, sessionIndex) => {
    const sessionKey = `${dayIndex}-${sessionIndex}`;
    const session = studyPlan?.days[dayIndex]?.sessions[sessionIndex];
    
    setSessionProgress(prev => {
      const currentSession = prev[sessionKey] || {};
      let timeSpent = currentSession.timeSpent || 0;
      
      // If no time spent but session is being completed, use full duration
      if (timeSpent === 0 && session) {
        timeSpent = (session.duration || 30) * 60 * 1000;
      }
      
      return {
        ...prev,
        [sessionKey]: {
          ...currentSession,
          completed: true,
          inProgress: false,
          timeSpent: timeSpent
        }
      };
    });
    
    setActiveTimer(null);
  };
  
  // Format time in MM:SS format
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Format for displaying time spent
  const formatTimeSpent = (milliseconds) => {
    if (!milliseconds || milliseconds <= 0) return '0 min';
    
    const totalMinutes = Math.floor(milliseconds / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
    } else {
      return `${minutes}m`;
    }
  };
  
  // Render timer control for a specific session
  const renderTimerControl = (dayIndex, sessionIndex, session) => {
    const sessionKey = `${dayIndex}-${sessionIndex}`;
    const progress = sessionProgress[sessionKey] || {};
    const isActive = activeTimer && activeTimer.dayIndex === dayIndex && activeTimer.sessionIndex === sessionIndex;
    const completed = progress.completed;
    
    if (completed) {
      return (
        <Chip
          label="Completed"
          size="small"
          icon={<DoneIcon />}
          color="success"
          sx={{ fontWeight: 'bold' }}
        />
      );
    }
    
    if (isActive) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {formatTime(activeTimer.timeLeft)}
          </Typography>
          <IconButton 
            size="small" 
            color="primary" 
            onClick={() => timerRef.current ? pauseTimer() : resumeTimer()}
          >
            {timerRef.current ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
          </IconButton>
          <IconButton 
            size="small" 
            color="error" 
            onClick={() => stopTimer(dayIndex, sessionIndex)}
          >
            <StopIcon fontSize="small" />
          </IconButton>
        </Box>
      );
    }
    
    return (
      <Chip 
        label={`${session.duration} min`} 
        size="small" 
        icon={<TimerIcon />}
        color={session.type === 'break' ? 'success' : 'primary'}
        variant="outlined"
        onClick={() => startTimer(dayIndex, sessionIndex, session.duration)}
        sx={{ cursor: 'pointer' }}
      />
    );
  };
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleSavePlan = async () => {
    try {
      setSavingPlan(true);
      setSaveSuccess(false);
      setError(null);
      
      const user = auth.currentUser;
      console.log('Saving plan, current user:', user ? user.uid : 'not logged in');
      
      if (!user) {
        console.error('No user logged in, cannot save plan');
        setError('You must be logged in to save a study plan');
        setSavingPlan(false);
        return;
      }
      
      if (!studyPlan) {
        console.error('No study plan generated');
        setError('No study plan to save');
        setSavingPlan(false);
        return;
      }
      
      console.log('Study plan to save:', studyPlan);
      console.log('Session progress to save:', sessionProgress);
      
      // Add completed property and timer progress to each session for tracking
      const planWithProgress = {
        ...studyPlan,
        days: studyPlan.days.map((day, dayIndex) => ({
          ...day,
          sessions: day.sessions.map((session, sessionIndex) => {
            const sessionKey = `${dayIndex}-${sessionIndex}`;
            const progressData = sessionProgress[sessionKey] || {};
            
            // Calculate remaining time if there's an active timer for this session
            let timeSpentValue = progressData.timeSpent || 0;
            let completedValue = progressData.completed || false;
            
            // If session is completed but no time spent, use the full duration
            if (completedValue && timeSpentValue === 0) {
              timeSpentValue = (session.duration || 30) * 60 * 1000;
            }
            
            // If we're actively timing this session and paused, save the current state
            if (activeTimer && 
                activeTimer.dayIndex === dayIndex && 
                activeTimer.sessionIndex === sessionIndex) {
              
              // Amount of time that has elapsed (duration - timeLeft)
              const elapsedMs = (session.duration * 60 * 1000) - activeTimer.timeLeft;
              
              // Add this to any previously tracked time
              timeSpentValue = (progressData.timeSpent || 0) + elapsedMs;
              console.log(`Active timer for session ${session.title}: elapsed=${elapsedMs}ms, total=${timeSpentValue}ms`);
            }
            
            return {
              ...session,
              completed: completedValue,
              timeSpent: timeSpentValue
            };
          })
        }))
      };
      
      // Create a serializable version of the plan data
      // This ensures we don't have any non-serializable objects that Firestore can't handle
      const planData = {
        userId: user.uid,
        name: `Training Plan (${format(new Date(), 'MMM d, yyyy')})`,
        overview: studyPlan.overview || '',
        days: JSON.parse(JSON.stringify(planWithProgress.days)), // Deep clone to ensure serializability
        tips: studyPlan.tips || [],
        timePerDay: timeAvailable || 60,
        difficulty: difficulty || 'Medium',
        learningStyle: learningStyle || 'Visual',
        daysToComplete: daysToComplete || 7,
        createdAt: serverTimestamp()
      };
      
      console.log('Saving plan data to Firestore:', planData);
      
      // Create a direct reference to the studyPlans collection
      // This ensures we're using the correct path
      const studyPlansRef = collection(db, 'studyPlans');
      
      // Attempt to save to Firestore with error handling
      try {
        const docRef = await addDoc(studyPlansRef, planData);
        console.log('Study plan saved with ID:', docRef.id);
        
        // Verify the plan was saved
        const savedDoc = await getDoc(doc(db, 'studyPlans', docRef.id));
        if (savedDoc.exists()) {
          console.log('Verified plan was saved:', savedDoc.data());
          setSaveSuccess(true);
          
          // Notify parent component that a plan was saved
          if (onPlanSaved) {
            console.log('Notifying parent component that plan was saved');
            onPlanSaved();
          } else {
            console.log('No onPlanSaved callback provided');
          }
        } else {
          console.error('Plan was not saved properly');
          setError('Plan was saved but could not be verified. Please check your Firestore rules.');
        }
      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        setError(`Firestore error: ${firestoreError.message}. Please check your Firebase configuration.`);
      }
    } catch (error) {
      console.error('Error saving study plan:', error);
      setError(`Error saving study plan: ${error.message}`);
    } finally {
      setSavingPlan(false);
    }
  };
  
  // Render step content
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Study Plan Preferences
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newDate) => setStartDate(newDate)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                    minDate={new Date()}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>
                  Difficulty Level
                </Typography>
                <Slider
                  value={difficulty}
                  onChange={(e, newValue) => setDifficulty(newValue)}
                  step={1}
                  marks
                  min={1}
                  max={5}
                  valueLabelDisplay="auto"
                  aria-labelledby="difficulty-slider"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">Easier</Typography>
                  <Typography variant="caption" color="text.secondary">Harder</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>
                  Available Study Time (minutes per day)
                </Typography>
                <Slider
                  value={timeAvailable}
                  onChange={(e, newValue) => setTimeAvailable(newValue)}
                  step={15}
                  marks={[
                    { value: 30, label: '30m' },
                    { value: 60, label: '1h' },
                    { value: 120, label: '2h' },
                    { value: 180, label: '3h' },
                  ]}
                  min={30}
                  max={180}
                  valueLabelDisplay="auto"
                  aria-labelledby="time-slider"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>
                  Days to Complete
                </Typography>
                <Slider
                  value={daysToComplete}
                  onChange={(e, newValue) => setDaysToComplete(newValue)}
                  step={1}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 7, label: '7' },
                    { value: 14, label: '14' },
                    { value: 30, label: '30' },
                  ]}
                  min={1}
                  max={30}
                  valueLabelDisplay="auto"
                  aria-labelledby="days-slider"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="learning-style-label">Learning Style</InputLabel>
                  <Select
                    labelId="learning-style-label"
                    id="learning-style"
                    value={learningStyle}
                    label="Learning Style"
                    onChange={(e) => setLearningStyle(e.target.value)}
                  >
                    {LEARNING_STYLES.map((style) => (
                      <MenuItem key={style.value} value={style.value}>
                        {style.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {LEARNING_STYLES.find(style => style.value === learningStyle)?.description}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Estimated study time:</strong> {estimatedTime.studyTime} minutes total
                    <br />
                    <strong>Recommended days:</strong> {estimatedTime.recommendedDays} days (at {Math.ceil(estimatedTime.studyTime / estimatedTime.recommendedDays)} minutes per day)
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Box>
        );
      
      case 1:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {loading ? (
              <>
                <CircularProgress size={60} sx={{ mb: 3 }} />
                <Typography variant="h6">Generating your personalized study plan...</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This may take a moment as our AI creates a tailored plan for you
                </Typography>
              </>
            ) : (
              <>
                {error ? (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                ) : (
                  <Alert severity="success" sx={{ mb: 3 }}>
                    Your study plan is ready!
                  </Alert>
                )}
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleBack}
                  sx={{ mr: 1 }}
                >
                  Back to Preferences
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGeneratePlan}
                  disabled={loading}
                >
                  View Plan
                </Button>
              </>
            )}
          </Box>
        );
      
      case 2:
        return (
          <Box>
            {studyPlan && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                    Your Personalized Study Plan
                  </Typography>
                  
                  <Tooltip title="Download Study Plan">
                    <IconButton onClick={handleDownloadPlan} color="primary">
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Card sx={{ mb: 3, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TipsAndUpdatesIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                      Overview
                    </Typography>
                    <Typography variant="body1">{studyPlan.overview}</Typography>
                  </CardContent>
                </Card>
                
                <Typography variant="h6" sx={{ mb: 2 }}>Study Schedule</Typography>
                
                <Box sx={{ mb: 4 }}>
                  {studyPlan.days.map((day, dayIndex) => (
                    <Card key={day.day} sx={{ mb: 2, borderRadius: 2 }}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: theme.palette.primary.main, 
                        color: 'white',
                        borderRadius: '8px 8px 0 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Day {day.day}
                        </Typography>
                        <Typography variant="body1">
                          {day.date}
                        </Typography>
                      </Box>
                      
                      <CardContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {day.sessions.map((session, index) => (
                            <Box key={index} sx={{ 
                              p: 2, 
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                              bgcolor: session.type === 'break' 
                                ? 'rgba(76, 175, 80, 0.1)' 
                                : session.type === 'review'
                                  ? 'rgba(33, 150, 243, 0.1)'
                                  : session.type === 'practice'
                                    ? 'rgba(156, 39, 176, 0.1)'
                                    : 'rgba(255, 152, 0, 0.1)'
                            }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                  {session.title}
                                </Typography>
                                
                                {/* Session timer control */}
                                {renderTimerControl(dayIndex, index, session)}
                              </Box>
                              
                              {session.topics && session.topics.length > 0 && (
                                <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {session.topics.map((topic, i) => (
                                    <Chip 
                                      key={i} 
                                      label={topic} 
                                      size="small" 
                                      variant="outlined"
                                      sx={{ bgcolor: 'background.paper' }}
                                    />
                                  ))}
                                </Box>
                              )}
                              
                              <Typography variant="body2">
                                {session.description}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
                
                <Card sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(33, 150, 243, 0.05)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <SchoolIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                      Study Tips
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      {studyPlan.tips.map((tip, index) => (
                        <Typography component="li" key={index} variant="body1" sx={{ mb: 1 }}>
                          {tip}
                        </Typography>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </>
            )}
          </Box>
        );
      
      default:
        return 'Unknown step';
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <EventNoteIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        Create Personalized Study Plan
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        <Step>
          <StepLabel>Set Preferences</StepLabel>
        </Step>
        <Step>
          <StepLabel>Generate Plan</StepLabel>
        </Step>
        <Step>
          <StepLabel>View Plan</StepLabel>
        </Step>
      </Stepper>
      
      {getStepContent(activeStep)}
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        {activeStep !== 1 && (
          <>
            {activeStep !== 0 && (
              <Button onClick={handleBack} sx={{ mr: 1 }}>
                Back
              </Button>
            )}
            
            {activeStep === 0 && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleGeneratePlan}
                disabled={loading}
              >
                Generate Study Plan
              </Button>
            )}
            
            {activeStep === 2 && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleSavePlan}
                  disabled={savingPlan || saveSuccess}
                  startIcon={savingPlan ? <CircularProgress size={20} /> : null}
                >
                  {savingPlan ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Plan'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onClose}
                >
                  Done
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
};

export default StudyPlanGenerator;
