import React, { useState, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  TextField, 
  MenuItem,
  IconButton,
  CircularProgress,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  Snackbar,
  Chip,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import { Link } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import SaveIcon from '@mui/icons-material/Save';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizIcon from '@mui/icons-material/Quiz';
import ChatIcon from '@mui/icons-material/Chat';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { generateLastMinuteStudyPlan } from '../services/gemini';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getCurrentUser } from '../services/auth';
import InteractiveStudyTools from '../components/InteractiveStudyTools';
import AIChatbot from '../components/AIChatbot';

const LastMinuteStudy = () => {
  // Form state
  const [examDate, setExamDate] = useState(null);
  const [hoursUntilExam, setHoursUntilExam] = useState('');
  const [examTopics, setExamTopics] = useState('');
  const [knowledgeLevel, setKnowledgeLevel] = useState('Intermediate');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Process state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [studyPlan, setStudyPlan] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [studyTabValue, setStudyTabValue] = useState(0);
  
  // Refs
  const fileInputRef = useRef(null);
  
  // Steps for the stepper
  const steps = ['Upload Materials', 'Enter Exam Details', 'Interactive Study Plan'];

  // Get current user on component mount
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    
    fetchUser();
  }, []);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      file,
      name: file.name,
      type: file.type,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB' // Convert to MB
    }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // Reset the file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };
  
  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    setActiveStep(prevStep => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate inputs
      if (selectedFiles.length === 0) {
        setError('Please upload at least one file');
        setLoading(false);
        return;
      }
      
      if (!examTopics) {
        setError('Please enter exam topics');
        setLoading(false);
        return;
      }
      
      if (!examDate && !hoursUntilExam) {
        setError('Please provide either exam date or hours until exam');
        setLoading(false);
        return;
      }
      
      // Generate study plan using Gemini
      const plan = await generateLastMinuteStudyPlan(
        selectedFiles.map(f => f.file),
        examDate,
        hoursUntilExam,
        examTopics,
        knowledgeLevel,
        additionalInstructions
      );
      
      setStudyPlan(plan);
      setSuccess('Study plan generated successfully!');
      handleNext();
    } catch (error) {
      console.error('Error generating study plan:', error);
      setError('Failed to generate study plan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveStudyPlan = async () => {
    try {
      if (!currentUser) {
        setError('Please sign in to save your study plan');
        return;
      }
      
      setLoading(true);
      
      // Upload files to Firebase Storage and get download URLs
      const fileUrls = [];
      for (const fileObj of selectedFiles) {
        const file = fileObj.file;
        const storageRef = ref(storage, `study_materials/${currentUser.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        fileUrls.push({
          name: file.name,
          url: downloadUrl,
          type: file.type
        });
      }
      
      // Save study plan to Firestore
      const studyPlanData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        examDate: examDate ? examDate.toISOString() : null,
        hoursUntilExam: hoursUntilExam || null,
        examTopics,
        knowledgeLevel,
        additionalInstructions,
        studyPlan,
        files: fileUrls,
        createdAt: serverTimestamp(),
        type: 'last-minute'
      };
      
      await addDoc(collection(db, 'studyPlans'), studyPlanData);
      
      setPlanSaved(true);
      setSuccess('Study plan saved successfully!');
    } catch (error) {
      console.error('Error saving study plan:', error);
      setError('Failed to save study plan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 12, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          component={Link}
          to="/study-hub"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Back to Study Hub
        </Button>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box 
            component="span" 
            sx={{ 
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              p: 1,
              borderRadius: 1,
              bgcolor: '#FEE8E8'
            }}
          >
            <CloudUploadIcon sx={{ color: '#EA4335' }} />
          </Box>
          <Typography variant="h5" component="h1">
            Last-Minute Study Mode
          </Typography>
        </Box>
        
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ 
            bgcolor: '#F8F9FA',
            p: 2,
            borderRadius: 1,
            border: '1px solid #E9ECEF'
          }}
        >
          Upload multiple study materials and specify your exam details to create a focused last-minute study plan.
        </Typography>
      </Box>
      
      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {/* Step content */}
      {activeStep === 0 && (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #E9ECEF', borderRadius: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Upload Study Materials
          </Typography>
          
          <Box 
            sx={{ 
              p: 3, 
              border: '2px dashed #E9ECEF',
              borderRadius: 2,
              mb: 3,
              textAlign: 'center'
            }}
          >
            <input
              accept="application/pdf,image/*,audio/*,video/*"
              style={{ display: 'none' }}
              id="upload-files"
              multiple
              type="file"
              onChange={handleFileUpload}
              ref={fileInputRef}
            />
            <label htmlFor="upload-files">
              <Button
                variant="contained"
                component="span"
                startIcon={<CloudUploadIcon />}
                sx={{ mb: 2 }}
              >
                Upload Files
              </Button>
            </label>
            <Typography variant="body2" color="text.secondary">
              Supports PDF, images, audio, and video files
            </Typography>
          </Box>
          
          {selectedFiles.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Selected files ({selectedFiles.length}):
              </Typography>
              {selectedFiles.map((file, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 1,
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: '#F8F9FA'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DescriptionIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2">{file.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{file.size}</Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => handleRemoveFile(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={selectedFiles.length === 0}
            >
              Next
            </Button>
          </Box>
        </Paper>
      )}
      
      {activeStep === 1 && (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #E9ECEF', borderRadius: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Enter Exam Details
          </Typography>
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <DateTimePicker
                label="Exam Date & Time"
                value={examDate}
                onChange={(newValue) => setExamDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
              <Typography variant="body2" sx={{ alignSelf: 'center', mx: 1 }}>OR</Typography>
              <TextField
                label="Hours Until Exam"
                type="number"
                value={hoursUntilExam}
                onChange={(e) => setHoursUntilExam(e.target.value)}
                fullWidth
              />
            </Box>
          </LocalizationProvider>

          <TextField
            fullWidth
            label="Exam Topics (comma separated)"
            value={examTopics}
            onChange={(e) => setExamTopics(e.target.value)}
            sx={{ mb: 3 }}
            required
          />
          
          <TextField
            select
            label="Knowledge Level"
            value={knowledgeLevel}
            onChange={(e) => setKnowledgeLevel(e.target.value)}
            sx={{ mb: 3 }}
            fullWidth
          >
            <MenuItem value="Beginner">Beginner</MenuItem>
            <MenuItem value="Intermediate">Intermediate</MenuItem>
            <MenuItem value="Advanced">Advanced</MenuItem>
          </TextField>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Additional Instructions (optional)"
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            sx={{ mb: 3 }}
            placeholder="E.g., Focus on specific subtopics, include formulas, etc."
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button onClick={handleBack}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || (!examDate && !hoursUntilExam) || !examTopics}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate Study Plan'}
            </Button>
          </Box>
        </Paper>
      )}
      
      {activeStep === 2 && (
        <Grid container spacing={3}>
          {/* Left Column - Study Plan */}
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E9ECEF', borderRadius: 2, mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Your Last-Minute Study Plan
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveStudyPlan}
                  disabled={loading || planSaved}
                  color={planSaved ? "success" : "primary"}
                >
                  {planSaved ? 'Saved' : 'Save Plan'}
                </Button>
              </Box>
              
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Exam Details
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {examDate && (
                        <Chip 
                          label={`Exam: ${examDate.toLocaleString()}`} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      )}
                      {hoursUntilExam && (
                        <Chip 
                          label={`${hoursUntilExam} hours until exam`} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      )}
                      <Chip 
                        label={`Level: ${knowledgeLevel}`} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Topics
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {examTopics.split(',').map((topic, index) => (
                      <Chip 
                        key={index} 
                        label={topic.trim()} 
                        size="small" 
                        color="primary" 
                      />
                    ))}
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Study Materials
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedFiles.map((file, index) => (
                      <Chip 
                        key={index} 
                        label={file.name} 
                        size="small" 
                        icon={<DescriptionIcon />} 
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
              
              <Tabs
                value={studyTabValue}
                onChange={(e, newValue) => setStudyTabValue(newValue)}
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab icon={<MenuBookIcon />} label="Study Plan" />
                <Tab icon={<QuizIcon />} label="Interactive Tools" />
              </Tabs>
              
              {studyTabValue === 0 ? (
                <Box sx={{ 
                  p: 3, 
                  bgcolor: '#F8F9FA', 
                  borderRadius: 2,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                  maxHeight: '500px',
                  overflow: 'auto'
                }}>
                  {studyPlan ? (
                    <Typography variant="body1">{studyPlan}</Typography>
                  ) : (
                    <CircularProgress />
                  )}
                </Box>
              ) : (
                <Box sx={{ mt: 2 }}>
                  {studyPlan ? (
                    <InteractiveStudyTools studyPlan={studyPlan} />
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  )}
                </Box>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button onClick={handleBack}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  component={Link}
                  to="/study-hub"
                >
                  Return to Study Hub
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Right Column - AI Study Assistant */}
          <Grid item xs={12} md={5}>
            <Box 
              sx={{ 
                height: { xs: 'auto', md: 'calc(100vh - 100px)' },
                position: { xs: 'static', md: 'sticky' },
                top: 24,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                border: '1px solid #E9ECEF',
                bgcolor: 'background.paper'
              }}
            >
              <Box sx={{ 
                p: 2, 
                bgcolor: '#f0f7ff',
                borderBottom: '1px solid #E9ECEF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}>
                {/* Header content removed */}
              </Box>
              
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <AIChatbot initialPrompt={`I'm your Well Being Companion for your upcoming exam on ${examTopics}. I'll help you understand the material and prepare effectively. How can I help you today?`} />
              </Box>
            </Box>
          </Grid>
        </Grid>
      )}
      
      {/* Error and success alerts */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar open={!!success} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default LastMinuteStudy;
