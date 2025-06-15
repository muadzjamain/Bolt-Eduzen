import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { addMinutes, format } from 'date-fns';
import { scheduleStudySession, scheduleBreak } from '../services/google';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TimerIcon from '@mui/icons-material/Timer';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

const BreakScheduler = () => {
  const [studyStartTime, setStudyStartTime] = useState(new Date());
  const [studyDate, setStudyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [studyTime, setStudyTime] = useState(format(new Date(), 'HH:mm'));
  const [studyDuration, setStudyDuration] = useState(60); // minutes
  const [breakFrequency, setBreakFrequency] = useState(25); // minutes
  const [breakDuration, setBreakDuration] = useState(5); // minutes
  const [breakType, setBreakType] = useState('rest');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const breakTypes = [
    { value: 'rest', label: 'Rest Break', icon: <SelfImprovementIcon /> },
    { value: 'coffee', label: 'Coffee Break', icon: <LocalCafeIcon /> },
    { value: 'walk', label: 'Walking Break', icon: <DirectionsWalkIcon /> },
    { value: 'music', label: 'Music Break', icon: <MusicNoteIcon /> }
  ];

  // Update the studyStartTime when date or time changes
  const updateStudyStartTime = () => {
    try {
      const parsedDate = new Date(`${studyDate}T${studyTime}`);
      setStudyStartTime(parsedDate);
    } catch (error) {
      console.error('Error parsing date:', error);
    }
  };

  // Handle date change
  const handleDateChange = (e) => {
    setStudyDate(e.target.value);
    updateStudyStartTime();
  };

  // Handle time change
  const handleTimeChange = (e) => {
    setStudyTime(e.target.value);
    updateStudyStartTime();
  };

  const getBreakActivities = (type) => {
    switch (type) {
      case 'rest':
        return 'Take a moment to close your eyes, practice deep breathing, or do a quick meditation.';
      case 'coffee':
        return 'Grab a cup of coffee or tea and hydrate yourself.';
      case 'walk':
        return 'Take a short walk to stretch your legs and get some fresh air.';
      case 'music':
        return 'Listen to a song or two to refresh your mind.';
      default:
        return 'Take a short break to refresh your mind.';
    }
  };

  const handleSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      // Update study start time before scheduling
      updateStudyStartTime();
      
      const studyEndTime = addMinutes(studyStartTime, studyDuration);
      
      // Schedule the main study session
      await scheduleStudySession(
        'Study Session', 
        studyStartTime, 
        studyEndTime,
        'Focused study time'
      );

      // Calculate break times
      let currentTime = addMinutes(studyStartTime, breakFrequency);
      const breaks = [];

      while (currentTime < studyEndTime) {
        const breakEndTime = addMinutes(currentTime, breakDuration);
        
        // Don't schedule breaks that would extend beyond the study session
        if (breakEndTime <= studyEndTime) {
          breaks.push({
            startTime: currentTime,
            endTime: breakEndTime
          });
        }
        
        currentTime = addMinutes(breakEndTime, breakFrequency);
      }

      // Schedule all breaks
      for (let i = 0; i < breaks.length; i++) {
        const breakNumber = i + 1;
        await scheduleBreak(
          `Break #${breakNumber} - ${breakTypes.find(b => b.value === breakType).label}`,
          breaks[i].startTime,
          breaks[i].endTime,
          getBreakActivities(breakType)
        );
      }

      setSuccess(true);
      setShowSnackbar(true);
    } catch (error) {
      console.error('Error scheduling study plan:', error);
      setError('Failed to schedule study plan. Please make sure you are signed in to your Google account.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  return (
    <Card sx={{ 
      borderRadius: 2, 
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)', 
      overflow: 'visible',
      mb: 4
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <EventNoteIcon sx={{ color: 'primary.main', mr: 1, fontSize: 28 }} />
          <Typography variant="h5" color="primary.main">
            Schedule Study Plan with Breaks
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Study Date"
              type="date"
              value={studyDate}
              onChange={handleDateChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Study Time"
              type="time"
              value={studyTime}
              onChange={handleTimeChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <Typography gutterBottom>
                Study Duration: {studyDuration} minutes
              </Typography>
              <Slider
                value={studyDuration}
                onChange={(e, newValue) => setStudyDuration(newValue)}
                min={30}
                max={240}
                step={15}
                marks={[
                  { value: 30, label: '30m' },
                  { value: 60, label: '1h' },
                  { value: 120, label: '2h' },
                  { value: 180, label: '3h' },
                  { value: 240, label: '4h' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <Typography gutterBottom>
                Study Time Before Break: {breakFrequency} minutes
              </Typography>
              <Slider
                value={breakFrequency}
                onChange={(e, newValue) => setBreakFrequency(newValue)}
                min={15}
                max={60}
                step={5}
                marks={[
                  { value: 15, label: '15m' },
                  { value: 25, label: '25m' },
                  { value: 40, label: '40m' },
                  { value: 60, label: '1h' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <Typography gutterBottom>
                Break Duration: {breakDuration} minutes
              </Typography>
              <Slider
                value={breakDuration}
                onChange={(e, newValue) => setBreakDuration(newValue)}
                min={5}
                max={30}
                step={5}
                marks={[
                  { value: 5, label: '5m' },
                  { value: 10, label: '10m' },
                  { value: 15, label: '15m' },
                  { value: 30, label: '30m' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Break Type</InputLabel>
              <Select
                value={breakType}
                onChange={(e) => setBreakType(e.target.value)}
                label="Break Type"
              >
                {breakTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {type.icon}
                      <Typography sx={{ ml: 1 }}>{type.label}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Your Study Plan Summary
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <TimerIcon sx={{ color: 'primary.main', mr: 1 }} />
            <Typography>
              Study Session: {format(studyStartTime, 'h:mm a')} - {format(addMinutes(studyStartTime, studyDuration), 'h:mm a')}
            </Typography>
          </Box>
          
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              You'll study for {Math.floor(studyDuration / 60)} hour(s) and {studyDuration % 60} minutes
              with {Math.floor((studyDuration - breakFrequency) / (breakFrequency + breakDuration))} breaks.
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            {breakTypes.find(b => b.value === breakType).icon}
            <Typography sx={{ ml: 1 }}>
              {breakFrequency}-minute study sessions with {breakDuration}-minute {breakTypes.find(b => b.value === breakType).label.toLowerCase()}s
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSchedule}
            disabled={loading}
            sx={{ 
              py: 1.2, 
              px: 4,
              borderRadius: '20px',
              minWidth: '200px'
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Schedule in Google Calendar'}
          </Button>
        </Box>
      </CardContent>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          Study plan with breaks successfully scheduled in your Google Calendar!
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default BreakScheduler;
