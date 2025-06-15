import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  TextField,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Snackbar,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Tooltip,
  useMediaQuery,
  useTheme,
  Select,
  MenuItem,
  Collapse
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SchoolIcon from '@mui/icons-material/School';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SummarizeIcon from '@mui/icons-material/Summarize';
import QuizIcon from '@mui/icons-material/Quiz';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EditIcon from '@mui/icons-material/Edit';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import StyleIcon from '@mui/icons-material/Style';
import VideocamIcon from '@mui/icons-material/Videocam';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FlipIcon from '@mui/icons-material/Flip';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Chip from '@mui/material/Chip';
import { storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { getCurrentUser } from '../services/auth';
import AIChatbot from '../components/AIChatbot';
import { 
  analyzeImageWithGemini, 
  summarizeText, 
  generateQuiz, 
  formatText, 
  summarizePDFWithGemini, 
  generatePDFQuiz,
  analyzePDFWithGemini,
  generatePDFStudyPlan,
  getGeminiResponse,
  analyzeMultipleFilesWithGemini,
  analyzeVideoWithGemini,
  analyzeAudioWithGemini
} from '../services/gemini';
import { extractTextFromPDF, getPDFMetadata } from '../services/pdfExtractor';
import { checkGoogleAuthStatus } from '../services/googleAuth';
import StudyPlanGenerator from '../components/StudyPlanGenerator';
import StudyPlanHistory from '../components/StudyPlanHistory';
import MindMap from '../components/MindMap';
import Flashcards from '../components/Flashcards';
// TestFirestore component removed

const StudyCompanion = () => {
  const theme = useTheme();
  // User state
  const [currentUser, setCurrentUser] = useState(null);
  
  // Main state for the workflow
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [isEditingQuiz, setIsEditingQuiz] = useState(false);
  const [editableQuiz, setEditableQuiz] = useState([]);
  const [isRegeneratingQuestion, setIsRegeneratingQuestion] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  
  // Content upload states
  const [uploadType, setUploadType] = useState('image'); // 'image', 'camera', 'pdf', 'audio', 'video', 'recordedAudio'
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const [showAllFiles, setShowAllFiles] = useState(true);
  
  // Flashcards states
  const [flashcardStates, setFlashcardStates] = useState([]);
  const [flashcardView, setFlashcardView] = useState('grid');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [currentCardFlipped, setCurrentCardFlipped] = useState(false);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioRecordingDialogOpen, setAudioRecordingDialogOpen] = useState(false);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  // Content analysis states
  const [extractedText, setExtractedText] = useState('');
  
  // Study plan states
  const [planSaved, setPlanSaved] = useState(false);
  const [studyPlanText, setStudyPlanText] = useState('');
  const [summary, setSummary] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // State for summary preferences dialog
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryPreference, setSummaryPreference] = useState('');
  
  // Get current user
  useEffect(() => {
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
  
  // Quiz states
  const [quiz, setQuiz] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  
  // Note type states
  const [noteType, setNoteType] = useState('summary');
  const [chapterNotes, setChapterNotes] = useState('');
  const [mindMapUrl, setMindMapUrl] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  
  // Refs
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaPlayerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const previewAudioRef = useRef(null);
  
  // Helper function to format text with line breaks
  const formatText = (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '<br />').replace(/<br \/>/g, '\n');
  };
  
  // Function to handle answer selection in quiz
  const handleAnswerSelect = (questionIndex, option) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: option
    }));
  };

  // Function to reset quiz state
  const resetQuiz = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  // Function to regenerate a specific question
  const regenerateQuestion = async (index) => {
    try {
      setIsRegeneratingQuestion(true);
      setRegeneratingIndex(index);
      
      // Get the current question
      const currentQuestion = quiz[index];
      
      // Use Gemini to generate a new question
      const prompt = `Generate a new multiple-choice question about the same topic as this question: "${currentQuestion.question}". The question should have 4 options with only one correct answer. Format the response as a JSON object with the following structure:
{
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option text",
  "explanation": "Brief explanation of why this is the correct answer"
}`;
      
      const response = await getGeminiResponse(prompt);
      
      // Parse the response to get the new question
      let newQuestion = {};
      try {
        // Find JSON object in the response
        const jsonMatch = response.match(/{\s*"question".*}/s);
        if (jsonMatch) {
          newQuestion = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse new question from response');
        }
      } catch (parseError) {
        console.error('Error parsing new question:', parseError);
        throw new Error('Failed to parse new question');
      }
      
      // Update the quiz with the new question
      const updatedQuiz = [...quiz];
      updatedQuiz[index] = newQuestion;
      setQuiz(updatedQuiz);
      
      // Remove the selected answer for this question
      const updatedSelectedAnswers = { ...selectedAnswers };
      delete updatedSelectedAnswers[index];
      setSelectedAnswers(updatedSelectedAnswers);
      
      setIsRegeneratingQuestion(false);
      setRegeneratingIndex(null);
      
      // Show success message
      setSuccess('Question regenerated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error regenerating question:', error);
      setError('Failed to regenerate question. Please try again.');
      setIsRegeneratingQuestion(false);
      setRegeneratingIndex(null);
    }
  };

  // Function to handle question editing in editable quiz mode
  const handleQuestionEdit = (index, field, value) => {
    const updatedQuiz = [...editableQuiz];
    
    if (field === 'options') {
      // Parse the option index from the field (e.g., 'options-0')
      const optionIndex = parseInt(field.split('-')[1]);
      updatedQuiz[index].options[optionIndex] = value;
    } else {
      updatedQuiz[index][field] = value;
    }
    
    setEditableQuiz(updatedQuiz);
  };

  // Function to handle quiz submission and calculate score
  const handleQuizSubmit = () => {
    if (Object.keys(selectedAnswers).length === 0) {
      setError('Please answer at least one question before submitting.');
      return;
    }
    
    // Calculate score
    let correctCount = 0;
    const totalQuestions = quiz.length;
    
    quiz.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correctCount++;
      }
    });
    
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    setQuizScore(score);
    setQuizSubmitted(true);
    
    // Show success message
    setSuccess(`Quiz submitted! Your score: ${score}%`);
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };
  
  // Helper function to generate quiz questions based on content
  const generateNewQuiz = async (content, numQuestions = 5) => {
    try {
      setLoading(true);
      setStatusMessage('Generating quiz questions...');
      
      // Use Gemini to generate quiz questions
      const prompt = `Based on the following content, generate a quiz with ${numQuestions} multiple-choice questions. Each question should have 4 options with only one correct answer. Format the response as a JSON array of objects, where each object has the following structure:
{
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "The correct option text",
  "explanation": "Brief explanation of why this is the correct answer"
}

Content: ${content}`;
      
      const response = await getGeminiResponse(prompt);
      
      // Parse the response to get quiz questions
      let quizQuestions = [];
      try {
        // Find JSON array in the response
        const jsonMatch = response.match(/\[\s*{.*}\s*\]/s);
        if (jsonMatch) {
          quizQuestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse quiz questions from response');
        }
      } catch (parseError) {
        console.error('Error parsing quiz questions:', parseError);
        // Fallback to a simple quiz if parsing fails
        quizQuestions = [
          {
            question: 'What is the main topic of this content?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A',
            explanation: 'This is a fallback question due to parsing error.'
          }
        ];
      }
      
      setQuiz(quizQuestions);
      setSelectedAnswers({});
      setQuizSubmitted(false);
      setQuizScore(null);
      setLoading(false);
      setStatusMessage('');
      
      return quizQuestions;
    } catch (error) {
      console.error('Error generating quiz:', error);
      setError('Failed to generate quiz questions. Please try again.');
      setLoading(false);
      setStatusMessage('');
      return [];
    }
  };
  
  // Helper function to generate chapter sections from notes
  const generateChapterSections = (notes) => {
    if (!notes) return [];
    
    // Try to identify sections in the notes
    const sections = [];
    
    // Simple parsing logic - look for headings (lines ending with : or all caps lines)
    const lines = notes.split('\n');
    let currentSection = null;
    let currentContent = [];
    let currentKeyPoints = [];
    let collectingKeyPoints = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a new section heading
      if (line.match(/^[A-Z][^a-z]*:$/) || line.match(/^[A-Z][^a-z]*$/) || 
          line.match(/^[\d\.]+\s+[A-Z]/) || line.match(/^Chapter [\d]+/) || 
          line.match(/^Section [\d]+/) || (line.length > 0 && line === line.toUpperCase() && line.length > 10)) {
        
        // Save the previous section if it exists
        if (currentSection) {
          sections.push({
            title: currentSection,
            content: currentContent.join('\n'),
            keyPoints: currentKeyPoints.length > 0 ? currentKeyPoints : null
          });
        }
        
        // Start a new section
        currentSection = line;
        currentContent = [];
        currentKeyPoints = [];
        collectingKeyPoints = false;
      } 
      // Check if we're starting key points
      else if (line.match(/^Key Points:/) || line.match(/^Important Points:/) || line.match(/^Key Takeaways:/)) {
        collectingKeyPoints = true;
      }
      // Add content to the current section
      else if (line.length > 0) {
        if (collectingKeyPoints) {
          // If the line starts with a bullet or number, it's a key point
          if (line.match(/^[\*\-•]/) || line.match(/^[\d\.]+/)) {
            currentKeyPoints.push(line.replace(/^[\*\-•]\s*/, '').replace(/^[\d\.]+\s*/, ''));
          } else {
            // If it doesn't look like a bullet point, add it to regular content
            currentContent.push(line);
          }
        } else {
          currentContent.push(line);
        }
      }
      // Preserve empty lines in content
      else if (!collectingKeyPoints) {
        currentContent.push('');
      }
    }
    
    // Add the last section
    if (currentSection) {
      sections.push({
        title: currentSection,
        content: currentContent.join('\n'),
        keyPoints: currentKeyPoints.length > 0 ? currentKeyPoints : null
      });
    }
    
    // If no sections were found, create a default one
    if (sections.length === 0) {
      sections.push({
        title: 'Chapter Overview',
        content: notes,
        keyPoints: null
      });
    }
    
    return sections;
  };

  // Initialize Google API
  useEffect(() => {
    const initializeGoogleApi = async () => {
      try {
        // await initGoogleApi();
        // setIsGoogleApiReady(true);
        
        // Check if user is signed in
        const signedIn = await checkGoogleAuthStatus();
        // setIsGoogleSignedIn(signedIn);
      } catch (error) {
        console.error('Error initializing Google API:', error);
        // Don't block the app if Google API fails
        setError('Google API initialization failed. Some features may be limited.');
      }
    };
    
    // Try to initialize Google API but don't block the app functionality
    initializeGoogleApi().catch(err => {
      console.error('Failed to initialize Google API:', err);
      // We'll still allow the app to function without Google API
    });
  }, []);
  
  // Removed localStorage persistence code

  // Clean up camera resources when component unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      // Clean up any audio resources
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
      }
    };
  }, []);
  
  // Handle audio player state changes
  useEffect(() => {
    // Initialize audio player when preview URL changes
    if (previewAudioRef.current && previewAudioUrl) {
      previewAudioRef.current.volume = 1.0;
      console.log('Audio player initialized with new source');
    }
    
    return () => {
      // Cleanup function to ensure audio is stopped when dialog closes
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, [previewAudioUrl]);

  // Tab handling
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    // Tab change logic without localStorage persistence
  };

  // File upload handlers
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    
    // Check if all files are valid images
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError(`Please upload valid image files only. ${invalidFiles.map(f => f.name).join(', ')} ${invalidFiles.length > 1 ? 'are' : 'is'} not valid.`);
      return;
    }
    
    // Create new file objects with URLs
    const newFiles = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: 'image',
      name: file.name
    }));
    
    // Add to existing files
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setUploadType('image');
    setSuccess(`${files.length} ${files.length === 1 ? 'image' : 'images'} uploaded successfully! Click "Analyze Content" to proceed.`);
    
    // Dispatch a custom event to notify AIChatbot about image upload
    window.dispatchEvent(new CustomEvent('scholarai:fileUploaded', {
      detail: {
        fileType: 'image',
        fileCount: files.length
      }
    }));
  };
  
  const handlePdfUpload = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    
    // Check if all files are valid PDFs
    const invalidFiles = files.filter(file => file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      setError(`Please upload valid PDF files only. ${invalidFiles.map(f => f.name).join(', ')} ${invalidFiles.length > 1 ? 'are' : 'is'} not valid.`);
      return;
    }
    
    // Create new file objects with URLs
    const newFiles = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: 'pdf',
      name: file.name
    }));
    
    // Add to existing files
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setUploadType('pdf');
    setSuccess(`${files.length} ${files.length === 1 ? 'PDF' : 'PDFs'} uploaded successfully! Click "Analyze Content" to proceed.`);
    
    // Dispatch a custom event to notify AIChatbot about PDF upload
    window.dispatchEvent(new CustomEvent('scholarai:fileUploaded', {
      detail: {
        fileType: 'pdf',
        fileCount: files.length
      }
    }));
  };
  
  const handleAudioUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    
    // Check if all files are valid audio files
    const invalidFiles = files.filter(file => !file.type.startsWith('audio/'));
    if (invalidFiles.length > 0) {
      setError(`Please upload valid audio files only. ${invalidFiles.map(f => f.name).join(', ')} ${invalidFiles.length > 1 ? 'are' : 'is'} not valid.`);
      return;
    }
    
    // Create new file objects with URLs for each audio file
    const newFiles = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: 'audio',
      name: file.name
    }));
    
    // Add to existing files
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setUploadType('audio');
    setSuccess(`${files.length} audio ${files.length === 1 ? 'file' : 'files'} uploaded successfully! Click "Analyze Content" to proceed.`);
    
    // Dispatch a custom event to notify AIChatbot about file upload
    window.dispatchEvent(new CustomEvent('eduzen:fileUploaded', {
      detail: {
        fileType: 'audio',
        fileName: files.map(f => f.name).join(', ')
      }
    }));
  };
  
  const handleVideoFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    
    // Check if all files are valid videos
    const invalidFiles = files.filter(file => !file.type.startsWith('video/'));
    if (invalidFiles.length > 0) {
      setError(`Please upload valid video files only. ${invalidFiles.map(f => f.name).join(', ')} ${invalidFiles.length > 1 ? 'are' : 'is'} not valid.`);
      return;
    }
    
    // Create new file objects with URLs
    const newFiles = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: 'video',
      name: file.name
    }));
    
    // Add to existing files
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setUploadType('video');
    setSuccess(`${files.length} ${files.length === 1 ? 'video' : 'videos'} uploaded successfully! Click "Analyze Content" to proceed.`);
    
    // Dispatch a custom event to notify AIChatbot about video upload
    window.dispatchEvent(new CustomEvent('scholarai:fileUploaded', {
      detail: {
        fileType: 'video',
        fileCount: files.length
      }
    }));
  };
  
  const togglePlayPause = () => {
    if (mediaPlayerRef.current) {
      if (isPlaying) {
        mediaPlayerRef.current.pause();
      } else {
        mediaPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleOpenAudioRecording = async () => {
    setAudioRecordingDialogOpen(true);
    audioChunksRef.current = [];
    setRecordingTime(0);
    setShowPreview(false);
    setPreviewAudioUrl(null);
    setRecordedBlob(null);
  };
  
  const handleCloseAudioRecording = () => {
    // Stop recording if it's in progress
    if (isRecording) {
      stopRecording();
    }
    
    // Clean up resources
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    // Stop any audio playback
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
      setPreviewAudioUrl(null);
    }
    
    setIsAudioPlaying(false);
    setAudioRecordingDialogOpen(false);
  };
  
  const startRecording = async () => {
    try {
      // Clear any existing chunks
      audioChunksRef.current = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Store the stream for later cleanup
      audioStreamRef.current = stream;
      
      // Let the browser choose the best supported format instead of forcing MP3
      // This is much more efficient and prevents browser freezing
      let options = {};
      
      // Only specify MIME type if WebM is available (widely supported and efficient)
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
        console.log('Using WebM format for recording');
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
        console.log('Using MP4 format for recording');
      } else {
        console.log('Using browser default audio format');
      }
      
      // Create the media recorder with browser-supported options
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      console.log(`Created MediaRecorder with MIME type: ${mediaRecorderRef.current.mimeType}`);
      
      // Set up data collection - use a more efficient approach
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log(`Recording stopped. Collected ${audioChunksRef.current.length} chunks.`);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
        
        if (audioChunksRef.current.length === 0) {
          console.error('No audio data was collected during recording');
          setError('No audio data was recorded. Please try again.');
          return;
        }
        
        try {
          // Use the actual mime type from the recorder instead of forcing conversion
          const actualMimeType = mediaRecorderRef.current.mimeType;
          
          // Create the audio blob with the actual MIME type that was used
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
          console.log(`Created audio blob of size: ${audioBlob.size} bytes with type ${actualMimeType}`);
          
          if (audioBlob.size === 0) {
            console.error('Created an empty audio blob');
            setError('Recording resulted in empty audio. Please try again.');
            return;
          }
          
          // Store the blob for later use
          setRecordedBlob(audioBlob);
          
          // Create a preview URL - no need to validate with fetch
          const audioUrl = URL.createObjectURL(audioBlob);
          setPreviewAudioUrl(audioUrl);
          setShowPreview(true);
          
          // Removed unnecessary AudioContext creation that was causing resource problems
        } catch (error) {
          console.error('Error creating audio blob:', error);
          setError('Error processing the recording. Please try again.');
        }
      };
      
      // Handle errors during recording
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Error during recording. Please try again.');
        stopRecording();
      };
      
      // Start recording with smaller time slices for more frequent chunks
      mediaRecorderRef.current.start(500);
      console.log('Started audio recording');
      setIsRecording(true);
      
      // Start timer
      const interval = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
      setRecordingInterval(interval);
      
    } catch (error) {
      console.error('Error starting audio recording:', error);
      setError('Failed to access microphone. Please check permissions.');
      // Clean up any partially initialized resources
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
    }
  };
  
  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        console.log('Stopping recording...');
        
        // Check the state of the MediaRecorder
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          console.log('MediaRecorder stopped');
        } else {
          console.warn(`MediaRecorder is in ${mediaRecorderRef.current.state} state, not stopping`);
        }
        
        // Clear timer
        if (recordingInterval) {
          clearInterval(recordingInterval);
          setRecordingInterval(null);
        }
        
        setIsRecording(false);
      } else {
        console.warn('Attempted to stop recording but no active MediaRecorder found');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setError('Error stopping recording. Please try again.');
      
      // Clean up anyway
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (trackError) {
            console.error('Error stopping audio track:', trackError);
          }
        });
        audioStreamRef.current = null;
      }
      
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      setIsRecording(false);
    }
  };
  
  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const handleCameraCapture = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Failed to access camera. Please check permissions.');
      setCameraOpen(false);
    }
  };
  
  const takePicture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      try {
        // Create a file from the blob
        const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        // Create a new file object
        const newFile = {
          file,
          url: URL.createObjectURL(file),
          type: 'image',
          name: file.name
        };
        
        // Add to existing files
        setUploadedFiles(prev => [...prev, newFile]);
        setUploadType('image');
        setSuccess('Image captured successfully! Click "Analyze Content" to proceed.');
        
        // Dispatch a custom event to notify AIChatbot about image capture
        window.dispatchEvent(new CustomEvent('scholarai:fileUploaded', {
          detail: {
            fileType: 'image',
            fileName: file.name
          }
        }));
        
        // Close camera dialog
        closeCameraDialog();
      } catch (error) {
        console.error('Error processing camera image:', error);
        setError('Failed to process camera image. Please try again.');
      }
    }, 'image/jpeg', 0.95);
  };
  
  const closeCameraDialog = () => {
    setCameraOpen(false);
    // Stop camera stream
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  // Speech-to-text transcription function
  const transcribeAudio = async (audioBlob) => {
    return new Promise((resolve, reject) => {
      setStatusMessage('Transcribing audio to text...');
      
      // Check if the Web Speech API is available
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Speech recognition not supported in this browser');
        reject('Speech recognition is not supported in your browser. Please try using Chrome or Edge.');
        return;
      }
      
      try {
        // Create audio element to play the audio for transcription
        const audio = new Audio();
        audio.src = URL.createObjectURL(audioBlob);
        
        // Use the Web Speech API for transcription
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Configure recognition settings
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        let transcription = '';
        
        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcription += event.results[i][0].transcript + ' ';
            }
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          audio.pause();
          audio.currentTime = 0; // Reset audio position
          recognition.stop();
          
          // If we have partial transcription, use it
          if (transcription.trim().length > 0) {
            resolve(transcription);
          } else {
            reject(`Speech recognition error: ${event.error}`);
          }
        };
        
        recognition.onend = () => {
          audio.pause();
          audio.currentTime = 0; // Reset audio position
          
          if (transcription.trim().length > 0) {
            console.log('Transcription completed:', transcription);
            resolve(transcription);
          } else {
            // If no transcription was generated, try alternative method
            resolve('Audio transcription could not be generated. Please try recording again with clearer audio.');
          }
        };
        
        // Start recognition when audio starts playing
        audio.onplay = () => {
          recognition.start();
        };
        
        // Handle audio end
        audio.onended = () => {
          recognition.stop();
        };
        
        // Start playing the audio
        audio.play().catch(error => {
          console.error('Error playing audio for transcription:', error);
          reject('Error playing audio for transcription. Please try again.');
        });
      } catch (error) {
        console.error('Error during transcription:', error);
        reject('Error during transcription: ' + error.message);
      }
    });
  };
  
  // Content analysis
  const analyzeContent = async (customPreference = '') => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one file first.');
      return;
    }
    
    // If multiple files are uploaded, we'll analyze them together
    const filesToAnalyze = uploadedFiles.length > 1 ? uploadedFiles : [
      // Use the selected file or the first file if none is selected
      selectedFileIndex !== null ? uploadedFiles[selectedFileIndex] : uploadedFiles[0]
    ];
      
    if (selectedFileIndex === null) {
      setSelectedFileIndex(0);
    }
    
    try {
      setLoading(true);
      setIsAnalyzing(true);
      setError(null);
      
      // Determine file types for event dispatch
      const fileTypes = new Set(filesToAnalyze.map(file => file.type));
      const fileTypeForEvent = filesToAnalyze[0].type;
      const fileNames = filesToAnalyze.map(file => file.name).join(', ');
      
      // Dispatch a custom event to notify AIChatbot that files were uploaded
      window.dispatchEvent(new CustomEvent('eduzen:fileUploaded', {
        detail: {
          fileType: fileTypes.size > 1 ? 'multiple' : fileTypeForEvent,
          fileName: fileNames
        }
      }));
      
      // Dispatch a custom event to notify AIChatbot that content analysis has started
      window.dispatchEvent(new CustomEvent('eduzen:analyzeContent', {
        detail: {
          fileType: fileTypes.size > 1 ? 'multiple' : fileTypeForEvent,
          fileName: fileNames
        }
      }));
      
      // Process files based on their types
      setStatusMessage('Processing files...');
      
      // Prepare files for multimodal analysis
      const processedFiles = [];
      
      // Process each file to extract text content where applicable
      for (const file of filesToAnalyze) {
        // Add the file to Firebase Storage (optional)
        try {
          const storageRef = ref(storage, `study_materials/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file.file);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          console.log(`Uploaded ${file.name} to Firebase Storage:`, downloadUrl);
          // Add the download URL to the file object
          file.downloadUrl = downloadUrl;
        } catch (error) {
          console.error(`Error uploading ${file.name} to Firebase Storage:`, error);
          // Continue with local file handling if Firebase upload fails
        }
        
        // Process file based on type
        if (file.type === 'pdf') {
          try {
            // Extract text from PDF
            setStatusMessage(`Extracting text from PDF: ${file.name}...`);
            const pdfText = await extractTextFromPDF(file.file);
            file.text = pdfText;
            
            // Get PDF metadata for additional context
            const metadata = await getPDFMetadata(file.file);
            file.metadata = metadata;
            console.log(`PDF Metadata for ${file.name}:`, metadata);
            console.log(`Extracted ${pdfText.length} characters from ${file.name}`);
            
            // If the text extraction failed or returned very little text, log a warning
            if (!pdfText || pdfText.length < 100) {
              console.warn(`Warning: Extracted very little text from ${file.name}. The PDF might be scanned or contain images.`);
            }
          } catch (error) {
            console.error(`Error extracting text from PDF ${file.name}:`, error);
            // Even if text extraction fails, we'll still include the PDF in the analysis
            // The multimodal API will try to process it as an image
          }
        }
        // No need to pre-process audio or video files anymore as we'll send them directly to Gemini API
        
        processedFiles.push(file);
      }
      
      // Log information about all files being analyzed
      console.log(`Analyzing ${processedFiles.length} files:`, processedFiles.map(f => f.name).join(', '));
      
      // Use multimodal analysis if we have multiple files or if we have a combination of different file types
      let text = '';
      
      if (filesToAnalyze.length > 1 || fileTypes.size > 1) {
        // Use multimodal analysis for multiple files
        setStatusMessage('Analyzing multiple files together...');
        text = await analyzeMultipleFilesWithGemini(processedFiles);
      } else {
        // Single file analysis based on file type
        const fileToAnalyze = filesToAnalyze[0];
        
        if (fileToAnalyze.type === 'image') {
          // Analyze image with Gemini
          setStatusMessage('Analyzing image content...');
          text = await analyzeImageWithGemini(fileToAnalyze.file);
        } else if (fileToAnalyze.type === 'pdf') {
          try {
            // Use Gemini Vision API to analyze the PDF directly
            setStatusMessage('Analyzing PDF with Gemini Vision API...');
            text = await analyzePDFWithGemini(fileToAnalyze.file);
            
            if (text.trim().length === 0) {
              text = 'The PDF analysis did not return any content. The file might be empty, corrupted, or contain only images that could not be processed.';
            }
          } catch (error) {
            console.error('Error analyzing PDF with Gemini:', error);
            text = 'Failed to analyze the PDF with Gemini Vision API. The file might be too large, corrupted, or in an unsupported format.';
          }
        } else if (fileToAnalyze.type === 'audio' || fileToAnalyze.type === 'recordedAudio') {
          try {
            // Use the specialized audio analysis function
            setStatusMessage('Analyzing audio content with Gemini multimodal API...');
            text = await analyzeAudioWithGemini(fileToAnalyze.file);
            
            if (text.trim().length === 0) {
              text = 'The audio analysis did not return any content. Please try a different audio file.';
            }
          } catch (error) {
            console.error('Error analyzing audio with Gemini:', error);
            text = 'Failed to analyze the audio file. The file might be too large, corrupted, or in an unsupported format.';
          }
        } else if (fileToAnalyze.type === 'video') {
          try {
            // Use the specialized video analysis function
            setStatusMessage('Analyzing video content with Gemini multimodal API...');
            text = await analyzeVideoWithGemini(fileToAnalyze.file);
            
            if (text.trim().length === 0) {
              text = 'The video analysis did not return any content. Please try a different video file.';
            }
          } catch (error) {
            console.error('Error analyzing video with Gemini:', error);
            text = 'Failed to analyze the video file. The file might be too large, corrupted, or in an unsupported format.';
          }
        }
      }
      
      // Format text to remove ** markers
      text = formatText(text);
      setExtractedText(text);
      
      // Determine the primary file type for processing
      let primaryFileType = filesToAnalyze.length > 1 ? 'multiple' : filesToAnalyze[0].type;
      
      // Generate summary
      let generatedSummary = '';
      try {
        setStatusMessage('Generating summary...');
        if (primaryFileType === 'pdf') {
          // For PDFs, the analyzePDFWithGemini already provides a summary
          if (customPreference) {
            // If user has provided custom preferences, use them
            generatedSummary = await getGeminiResponse(`Based on this PDF content: "${text}", please generate a summary with these specific preferences: ${customPreference}`);
          } else {
            generatedSummary = text;
          }
        } else {
          if (customPreference) {
            // If user has provided custom preferences, use them
            generatedSummary = await getGeminiResponse(`Based on this content: "${text}", please generate a summary with these specific preferences: ${customPreference}`);
          } else {
            generatedSummary = await summarizeText(text);
          }
        }
        generatedSummary = formatText(generatedSummary);
      } catch (error) {
        console.error('Error generating summary:', error);
        generatedSummary = 'Failed to generate summary. Please try again.';
      }
      setSummary(generatedSummary);
      
      // Generate quiz questions
      let quizQuestions = [];
      try {
        setStatusMessage('Generating quiz questions...');
        if (primaryFileType === 'pdf') {
          quizQuestions = await generatePDFQuiz(text, numQuestions);
        } else {
          quizQuestions = await generateQuiz(text, numQuestions);
        }
        setQuiz(quizQuestions);
      } catch (quizError) {
        console.error('Error generating quiz:', quizError);
        // Continue even if quiz generation fails
      }
      
      // Generate study plan
      try {
        setStatusMessage('Creating study plan...');
        let studyPlan = '';
        if (primaryFileType === 'pdf') {
          studyPlan = await generatePDFStudyPlan(text);
        } else {
          // Use a custom prompt for study plan generation
          const studyPlanPrompt = `Based on the following content, create a comprehensive study plan that would help a student master this material. Include recommended study sessions, practice exercises, and milestones. Content: ${text.substring(0, 3000)}`;
          studyPlan = await getGeminiResponse(studyPlanPrompt);
        }
        setStudyPlanText(studyPlan);
      } catch (studyPlanError) {
        console.error('Error generating study plan:', studyPlanError);
        // Continue even if study plan generation fails
      }
      
      // Generate chapter notes
      try {
        setStatusMessage('Generating chapter notes...');
        const chapterNotesPrompt = `Based on the following content, create detailed chapter notes with clear headings, subheadings, and bullet points for key concepts. Format it in a structured way that's easy to navigate and understand. Content: ${text.substring(0, 3000)}`;
        const generatedChapterNotes = await getGeminiResponse(chapterNotesPrompt);
        setChapterNotes(generatedChapterNotes);
      } catch (chapterNotesError) {
        console.error('Error generating chapter notes:', chapterNotesError);
        // Continue even if chapter notes generation fails
      }
      
      // Generate flashcards
      try {
        setStatusMessage('Creating flashcards...');
        const flashcardsPrompt = `Based on the following content, create a set of 10 flashcards with key terms/concepts on the front and definitions/explanations on the back. Format the response as a JSON array of objects, where each object has the following structure:
{
  "front": "Term or concept",
  "back": "Definition or explanation"
}

Content: ${text.substring(0, 3000)}`;
        
        const flashcardsResponse = await getGeminiResponse(flashcardsPrompt);
        
        // Parse the response to get flashcards
        let parsedFlashcards = [];
        try {
          // Find JSON array in the response
          const jsonMatch = flashcardsResponse.match(/\[\s*{.*}\s*\]/s);
          if (jsonMatch) {
            parsedFlashcards = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Could not parse flashcards from response');
          }
        } catch (parseError) {
          console.error('Error parsing flashcards:', parseError);
          // Create a simple fallback if parsing fails
          parsedFlashcards = [
            { front: 'Key Concept 1', back: 'Definition 1' },
            { front: 'Key Concept 2', back: 'Definition 2' }
          ];
        }
        
        // Initialize flashcard states
        const initialStates = parsedFlashcards.map(() => ({ flipped: false }));
        
        setFlashcards(parsedFlashcards);
        setFlashcardStates(initialStates);
      } catch (flashcardsError) {
        console.error('Error generating flashcards:', flashcardsError);
        // Continue even if flashcards generation fails
      }
      
      // Generate mind map structure
      try {
        setStatusMessage('Creating mind map visualization...');
        // We'll use the summary to create a structured mind map
        // The MindMap component will use this data to render the visualization
        
        // No need to make an additional API call since the MindMap component
        // will process the summary text directly when it's rendered
        
        // Just ensure the summary is properly formatted and ready for the mind map
        if (generatedSummary && generatedSummary.length > 0) {
          // Pre-process the summary to make it more suitable for mind map visualization
          // by adding some structure if it doesn't already have it
          if (!generatedSummary.includes('\n')) {
            // If the summary doesn't have line breaks, try to add some structure
            const structuredSummaryPrompt = `Take this summary and restructure it with clear main topics, subtopics, and bullet points to make it suitable for a mind map visualization. Use line breaks, headings, and bullet points for structure. Summary: ${generatedSummary.substring(0, 2000)}`;
            try {
              const structuredSummary = await getGeminiResponse(structuredSummaryPrompt);
              // Only update if we got a good response
              if (structuredSummary && structuredSummary.length > 100) {
                setSummary(structuredSummary);
              }
            } catch (structureError) {
              console.error('Error structuring summary for mind map:', structureError);
              // Continue with original summary if restructuring fails
            }
          }
        }
      } catch (mindMapError) {
        console.error('Error preparing mind map data:', mindMapError);
        // Continue even if mind map preparation fails
      }
      
      // Save analysis to Firestore if user is logged in
      if (currentUser) {
        try {
          // Get the primary file for metadata
          const primaryFile = filesToAnalyze[0];
          const fileUrl = primaryFile.downloadUrl || '';
          
          const analysisData = {
            userId: currentUser.uid,
            timestamp: new Date(),
            fileType: primaryFileType,
            fileName: filesToAnalyze.map(file => file.name).join(', '),
            summary: generatedSummary,
            fileUrl: fileUrl,
            extractedText: text
          };
          
          const docRef = await addDoc(collection(db, 'analyses'), analysisData);
          console.log('Analysis saved to Firestore with ID:', docRef.id);
        } catch (firestoreError) {
          console.error('Error saving to Firestore:', firestoreError);
          // Continue even if Firestore save fails
        }
      }
      
      // Show success message and navigate to summary tab
      setSuccess('Content analyzed successfully!');
      setActiveTab(1);
      
      // Tab navigation without localStorage persistence
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error analyzing content:', error);
      setError('Failed to analyze content. Please try again.');
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };
  
  // ... rest of the code remains the same ...
  
  // Render the main UI
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ 
        p: 4, 
        borderRadius: 2, 
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 'bold', 
          color: '#4285F4', 
          textAlign: 'center',
          mb: 3
        }}>
          Enhanced Study Assistant
        </Typography>
        
        <Typography variant="body1" paragraph align="center" sx={{ mb: 4 }}>
          Upload your study materials in multiple formats (PDF, images, audio, video) to generate personalized notes, quizzes, and study plans.
        </Typography>
        
        {/* Error and success messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        
        {statusMessage && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {statusMessage}
          </Alert>
        )}
        
        {/* Main tabs */}
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            mb: 3,
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              minWidth: 'auto',
              px: 2
            }
          }}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CloudUploadIcon sx={{ mr: 1 }} />
                <span>Upload Content</span>
              </Box>
            } 
            id="tab-0" 
            aria-controls="tabpanel-0" 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SummarizeIcon sx={{ mr: 1 }} />
                <span>Notes</span>
              </Box>
            } 
            id="tab-1" 
            aria-controls="tabpanel-1" 
            disabled={!extractedText}
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <QuizIcon sx={{ mr: 1 }} />
                <span>Quiz</span>
              </Box>
            } 
            id="tab-2" 
            aria-controls="tabpanel-2" 
            disabled={!extractedText}
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarMonthIcon sx={{ mr: 1 }} />
                <span>Study Plan</span>
              </Box>
            } 
            id="tab-3" 
            aria-controls="tabpanel-3" 
            disabled={!extractedText}
          />
        </Tabs>
        
        {/* Tab panels */}
        <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-0" aria-labelledby="tab-0">
          {activeTab === 0 && (
            <Box>
              <Grid container spacing={4} justifyContent="center">
                {/* Upload options - Row 1 (3 boxes) */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)'
                      },
                      border: uploadType === 'image' ? '2px solid #4285F4' : 'none',
                      borderRadius: '12px'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Box 
                        sx={{ 
                          backgroundColor: 'rgba(66, 133, 244, 0.1)', 
                          borderRadius: '50%', 
                          width: 80, 
                          height: 80, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          margin: '0 auto 16px'
                        }}
                      >
                        <ImageIcon sx={{ fontSize: 40, color: '#4285F4' }} />
                      </Box>
                      <Typography variant="h6" component="div" gutterBottom>
                        Upload Image
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Upload an image of your notes, textbook, or other study materials
                      </Typography>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)'
                      },
                      borderRadius: '12px'
                    }}
                    onClick={handleCameraCapture}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Box 
                        sx={{ 
                          backgroundColor: 'rgba(52, 168, 83, 0.1)', 
                          borderRadius: '50%', 
                          width: 80, 
                          height: 80, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          margin: '0 auto 16px'
                        }}
                      >
                        <CameraAltIcon sx={{ fontSize: 40, color: '#34A853' }} />
                      </Box>
                      <Typography variant="h6" component="div" gutterBottom>
                        Capture Image
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Take a photo of your notes or textbook using your camera
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)'
                      },
                      border: uploadType === 'pdf' ? '2px solid #4285F4' : 'none',
                      borderRadius: '12px'
                    }}
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Box 
                        sx={{ 
                          backgroundColor: 'rgba(234, 67, 53, 0.1)', 
                          borderRadius: '50%', 
                          width: 80, 
                          height: 80, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          margin: '0 auto 16px'
                        }}
                      >
                        <PictureAsPdfIcon sx={{ fontSize: 40, color: '#EA4335' }} />
                      </Box>
                      <Typography variant="h6" component="div" gutterBottom>
                        Upload PDF
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Upload a PDF document of your study materials
                      </Typography>
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept="application/pdf"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handlePdfUpload}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Upload options - Row 2 (3 boxes) */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)'
                      },
                      border: uploadType === 'audio' ? '2px solid #4285F4' : 'none',
                      borderRadius: '12px'
                    }}
                    onClick={() => audioInputRef.current?.click()}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Box 
                        sx={{ 
                          backgroundColor: 'rgba(251, 188, 4, 0.1)', 
                          borderRadius: '50%', 
                          width: 80, 
                          height: 80, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          margin: '0 auto 16px'
                        }}
                      >
                        <AudioFileIcon sx={{ fontSize: 40, color: '#FBBC04' }} />
                      </Box>
                      <Typography variant="h6" component="div" gutterBottom>
                        Upload Audio
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Upload audio recordings of lectures or study notes
                      </Typography>
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleAudioUpload}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)'
                      },
                      border: uploadType === 'recordedAudio' ? '2px solid #4285F4' : 'none',
                      borderRadius: '12px'
                    }}
                    onClick={handleOpenAudioRecording}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Box 
                        sx={{ 
                          backgroundColor: 'rgba(234, 67, 53, 0.1)', 
                          borderRadius: '50%', 
                          width: 80, 
                          height: 80, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          margin: '0 auto 16px'
                        }}
                      >
                        <MicIcon sx={{ fontSize: 40, color: '#EA4335' }} />
                      </Box>
                      <Typography variant="h6" component="div" gutterBottom>
                        Record Audio
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Record audio directly using your microphone
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Add Video Upload Option */}
                <Grid item xs={12} sm={6} md={4}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)'
                      },
                      border: uploadType === 'video' ? '2px solid #4285F4' : 'none',
                      borderRadius: '12px'
                    }}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Box 
                        sx={{ 
                          backgroundColor: 'rgba(66, 133, 244, 0.1)', 
                          borderRadius: '50%', 
                          width: 80, 
                          height: 80, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          margin: '0 auto 16px'
                        }}
                      >
                        <VideocamIcon sx={{ fontSize: 40, color: '#4285F4' }} />
                      </Box>
                      <Typography variant="h6" component="div" gutterBottom>
                        Upload Video
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Upload video recordings of lectures or study sessions
                      </Typography>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleVideoFileUpload}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              {/* Preview and analyze section */}
              {uploadedFiles.length > 0 && (
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                    Uploaded Content ({uploadedFiles.length} {uploadedFiles.length === 1 ? 'file' : 'files'})
                  </Typography>
                  
                  {/* File list/grid */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {uploadedFiles.map((file, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Paper 
                          elevation={2} 
                          sx={{ 
                            p: 2, 
                            position: 'relative',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            cursor: 'pointer',
                            border: selectedFileIndex === index ? '2px solid #4285F4' : 'none',
                            '&:hover': {
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                            }
                          }}
                          onClick={() => setSelectedFileIndex(index)}
                        >
                          <IconButton
                            size="small"
                            sx={{ 
                              position: 'absolute', 
                              top: 4, 
                              right: 4, 
                              bgcolor: 'rgba(0,0,0,0.1)',
                              '&:hover': {
                                bgcolor: 'rgba(0,0,0,0.2)'
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                              if (selectedFileIndex === index) {
                                setSelectedFileIndex(null);
                              }
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                          
                          {file.type === 'image' && (
                            <Box sx={{ textAlign: 'center', mb: 1, flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img 
                                src={file.url} 
                                alt={file.name} 
                                style={{ 
                                  maxWidth: '100%', 
                                  maxHeight: '120px',
                                  borderRadius: '8px'
                                }} 
                              />
                            </Box>
                          )}
                          
                          {file.type === 'pdf' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, flexGrow: 1 }}>
                              <PictureAsPdfIcon sx={{ fontSize: 40, color: '#EA4335' }} />
                            </Box>
                          )}
                          
                          {(file.type === 'audio' || file.type === 'recordedAudio') && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, flexGrow: 1 }}>
                              <AudioFileIcon sx={{ fontSize: 40, color: '#FBBC04' }} />
                            </Box>
                          )}
                          
                          {file.type === 'video' && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, flexGrow: 1 }}>
                              <VideocamIcon sx={{ fontSize: 40, color: '#4285F4' }} />
                            </Box>
                          )}
                          
                          <Typography variant="body2" noWrap title={file.name}>
                            {file.name}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  
                  {/* File preview section removed as requested */}
                  
                  {/* Audio/Video player section removed as requested */}
                  
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={analyzeContent}
                    disabled={loading || uploadedFiles.length === 0}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SummarizeIcon />}
                    sx={{ 
                      mt: 2, 
                      borderRadius: '20px',
                      px: 4,
                      py: 1.5,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    {loading ? 'Analyzing...' : 'Analyze Content'}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
        
        {/* Notes Tab */}
        <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-1" aria-labelledby="tab-1">
          {activeTab === 1 && (
            <Box>
              {isAnalyzing ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                  <CircularProgress size={60} sx={{ mb: 3 }} />
                  <Typography variant="h6">Generating summary...</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    This may take a moment as our AI analyzes your content
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Note Type Selector */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>Note Type</Typography>
                    <FormControl fullWidth sx={{ borderRadius: '8px', overflow: 'hidden' }}>
                      <Select
                        value={noteType || 'summary'}
                        onChange={(e) => setNoteType(e.target.value)}
                        displayEmpty
                        sx={{
                          borderRadius: '8px',
                          '& .MuiSelect-select': {
                            display: 'flex',
                            alignItems: 'center',
                            p: 2
                          }
                        }}
                        renderValue={(selected) => {
                          const options = {
                            summary: { icon: <SummarizeIcon sx={{ mr: 1 }} />, label: 'Summary Notes', desc: 'Concise overview of key concepts' },
                            chapter: { icon: <FormatListBulletedIcon sx={{ mr: 1 }} />, label: 'Chapter Notes', desc: 'Detailed notes organized by chapter or section' },
                            mindmap: { icon: <AccountTreeIcon sx={{ mr: 1 }} />, label: 'Mind Map', desc: 'Visual representation of concepts and relationships' },
                            flashcard: { icon: <StyleIcon sx={{ mr: 1 }} />, label: 'Flashcards', desc: 'Key terms and definitions for quick review' }
                          };
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {options[selected].icon}
                              <Box>
                                <Typography variant="subtitle1">{options[selected].label}</Typography>
                                <Typography variant="body2" color="text.secondary">{options[selected].desc}</Typography>
                              </Box>
                            </Box>
                          );
                        }}
                      >
                        <MenuItem value="summary">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <SummarizeIcon sx={{ mr: 1 }} />
                            <Box>
                              <Typography variant="subtitle1">Summary Notes</Typography>
                              <Typography variant="body2" color="text.secondary">Concise overview of key concepts</Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                        <MenuItem value="chapter">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <FormatListBulletedIcon sx={{ mr: 1 }} />
                            <Box>
                              <Typography variant="subtitle1">Chapter Notes</Typography>
                              <Typography variant="body2" color="text.secondary">Detailed notes organized by chapter or section</Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                        <MenuItem value="mindmap">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccountTreeIcon sx={{ mr: 1 }} />
                            <Box>
                              <Typography variant="subtitle1">Mind Map</Typography>
                              <Typography variant="body2" color="text.secondary">Visual representation of concepts and relationships</Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                        <MenuItem value="flashcard">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <StyleIcon sx={{ mr: 1 }} />
                            <Box>
                              <Typography variant="subtitle1">Flashcards</Typography>
                              <Typography variant="body2" color="text.secondary">Key terms and definitions for quick review</Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  {/* Notes content based on selected type */}
                  <Card 
                    elevation={2} 
                    sx={{ 
                      mb: 4, 
                      borderRadius: '20px',
                      overflow: 'hidden'
                    }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ 
                        bgcolor: 'rgba(66, 133, 244, 0.1)', 
                        p: 2, 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <Box display="flex" alignItems="center">
                          {noteType === 'summary' || !noteType ? (
                            <SummarizeIcon sx={{ color: '#4285F4', mr: 1 }} />
                          ) : noteType === 'chapter' ? (
                            <FormatListBulletedIcon sx={{ color: '#4285F4', mr: 1 }} />
                          ) : noteType === 'mindmap' ? (
                            <AccountTreeIcon sx={{ color: '#4285F4', mr: 1 }} />
                          ) : (
                            <StyleIcon sx={{ color: '#4285F4', mr: 1 }} />
                          )}
                          <Typography variant="h6" sx={{ fontWeight: 500, color: '#4285F4' }}>
                            {noteType === 'summary' || !noteType ? 'Summary Notes' : 
                             noteType === 'chapter' ? 'Chapter Notes' : 
                             noteType === 'mindmap' ? 'Mind Map' : 'Flashcards'}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => {
                            // Open dialog for user to enter note preferences
                            setSummaryDialogOpen(true);
                          }}
                          sx={{ borderRadius: '20px' }}
                        >
                          Edit Preferences
                        </Button>
                      </Box>
                      <Divider />
                      <Box sx={{ p: 3 }}>
                        {noteType === 'summary' || !noteType ? (
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {formatText(summary)}
                          </Typography>
                        ) : noteType === 'chapter' ? (
                          <Box sx={{ width: '100%' }}>
                            {chapterNotes ? (
                              <>
                                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(234, 67, 53, 0.05)', borderRadius: '12px' }}>
                                  <Typography variant="h6" color="#EA4335" gutterBottom>
                                    Key Concepts Overview
                                  </Typography>
                                  <Typography variant="body1" sx={{ mb: 2 }}>
                                    This interactive chapter note breaks down complex topics into digestible sections for better understanding.
                                  </Typography>
                                </Box>
                                
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, mb: 3 }}>
                                  <Box sx={{ width: { xs: '100%', md: '250px' }, flexShrink: 0, pr: { md: 2 }, mb: { xs: 2, md: 0 } }}>
                                    <Paper elevation={1} sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(66, 133, 244, 0.05)' }}>
                                      <Typography variant="subtitle1" color="#4285F4" gutterBottom sx={{ fontWeight: 500 }}>
                                        Chapter Navigation
                                      </Typography>
                                      <Divider sx={{ mb: 2 }} />
                                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        {generateChapterSections(chapterNotes).map((section, index) => (
                                          <Button 
                                            key={index}
                                            variant="text" 
                                            color="primary"
                                            size="small"
                                            startIcon={<ArrowRightIcon />}
                                            onClick={() => document.getElementById(`section-${index}`).scrollIntoView({ behavior: 'smooth' })}
                                            sx={{ 
                                              justifyContent: 'flex-start', 
                                              textAlign: 'left',
                                              mb: 1,
                                              borderRadius: '8px',
                                              '&:hover': { bgcolor: 'rgba(66, 133, 244, 0.1)' }
                                            }}
                                          >
                                            {section.title}
                                          </Button>
                                        ))}
                                      </Box>
                                    </Paper>
                                  </Box>
                                  
                                  <Box sx={{ flexGrow: 1 }}>
                                    {generateChapterSections(chapterNotes).map((section, index) => (
                                      <Paper 
                                        key={index} 
                                        elevation={1} 
                                        id={`section-${index}`}
                                        sx={{ 
                                          p: 3, 
                                          mb: 3, 
                                          borderRadius: '12px',
                                          scrollMarginTop: '100px',
                                          transition: 'transform 0.2s',
                                          '&:hover': { transform: 'translateY(-3px)', boxShadow: 3 }
                                        }}
                                      >
                                        <Typography variant="h6" color="primary" gutterBottom>
                                          {section.title}
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                          {section.content}
                                        </Typography>
                                        
                                        {section.keyPoints && section.keyPoints.length > 0 && (
                                          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(52, 168, 83, 0.05)', borderRadius: '8px' }}>
                                            <Typography variant="subtitle2" color="#34A853" gutterBottom>
                                              Key Points:
                                            </Typography>
                                            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                                              {section.keyPoints.map((point, i) => (
                                                <li key={i}>
                                                  <Typography variant="body2">{point}</Typography>
                                                </li>
                                              ))}
                                            </ul>
                                          </Box>
                                        )}
                                      </Paper>
                                    ))}
                                  </Box>
                                </Box>
                              </>
                            ) : (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                                <CircularProgress size={40} sx={{ mb: 2 }} />
                                <Typography variant="body1">Generating detailed chapter notes...</Typography>
                              </Box>
                            )}
                          </Box>
                        ) : noteType === 'mindmap' ? (
                          <Box sx={{ p: 2 }}>
                            <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(251, 188, 4, 0.05)', borderRadius: '12px' }}>
                              <Typography variant="h6" color="#FBBC04" gutterBottom>
                                Interactive Mind Map
                              </Typography>
                              <Typography variant="body1" sx={{ mb: 2 }}>
                                Visual representation of key concepts and their relationships. Click on nodes to explore connections.
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Chip 
                                  icon={<ZoomInIcon />} 
                                  label="Zoom In" 
                                  color="primary" 
                                  variant="outlined" 
                                  onClick={() => document.querySelector('.react-flow__controls-button:nth-child(3)').click()} 
                                  sx={{ borderRadius: '8px' }}
                                />
                                <Chip 
                                  icon={<ZoomOutIcon />} 
                                  label="Zoom Out" 
                                  color="primary" 
                                  variant="outlined" 
                                  onClick={() => document.querySelector('.react-flow__controls-button:nth-child(4)').click()} 
                                  sx={{ borderRadius: '8px' }}
                                />
                                <Chip 
                                  icon={<RefreshIcon />} 
                                  label="Reset View" 
                                  color="primary" 
                                  variant="outlined" 
                                  onClick={() => document.querySelector('.react-flow__controls-button:nth-child(1)').click()} 
                                  sx={{ borderRadius: '8px' }}
                                />
                                <Chip 
                                  icon={<OpenInNewIcon />} 
                                  label="Full Screen" 
                                  color="primary" 
                                  variant="outlined" 
                                  onClick={() => {
                                    const fullscreenButton = document.querySelector('.MuiIconButton-root:has(.MuiSvgIcon-root:has(path[d*="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"])');
                                    if (fullscreenButton) fullscreenButton.click();
                                  }} 
                                  sx={{ borderRadius: '8px' }}
                                />
                              </Box>
                            </Box>
                            
                            <Box sx={{ 
                              position: 'relative', 
                              width: '100%', 
                              height: '500px', 
                              overflow: 'hidden',
                              borderRadius: '12px',
                              boxShadow: 2,
                              '&:hover': { boxShadow: 4 },
                              backgroundColor: '#f9f9f9'
                            }}>
                              {/* Interactive Mind Map Component */}
                              <MindMap 
                                content={summary} 
                                width="100%" 
                                height="500px" 
                              />
                            </Box>
                            
                            <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(66, 133, 244, 0.05)', borderRadius: '12px' }}>
                              <Typography variant="subtitle1" color="#4285F4" gutterBottom sx={{ fontWeight: 500 }}>
                                Mind Map Legend
                              </Typography>
                              <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12} sm={6} md={4}>
                                  <Paper elevation={1} sx={{ p: 2, borderRadius: '8px', height: '100%' }}>
                                    <Typography variant="subtitle2" color="#EA4335" gutterBottom>
                                      Main Concepts
                                    </Typography>
                                    <Typography variant="body2">
                                      Central ideas and primary topics from the content.
                                    </Typography>
                                  </Paper>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                  <Paper elevation={1} sx={{ p: 2, borderRadius: '8px', height: '100%' }}>
                                    <Typography variant="subtitle2" color="#34A853" gutterBottom>
                                      Supporting Ideas
                                    </Typography>
                                    <Typography variant="body2">
                                      Details, examples, and explanations that support main concepts.
                                    </Typography>
                                  </Paper>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                  <Paper elevation={1} sx={{ p: 2, borderRadius: '8px', height: '100%' }}>
                                    <Typography variant="subtitle2" color="#4285F4" gutterBottom>
                                      Connections
                                    </Typography>
                                    <Typography variant="body2">
                                      Relationships between concepts showing how ideas relate to each other.
                                    </Typography>
                                  </Paper>
                                </Grid>
                              </Grid>
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{ p: 2 }}>
                            {flashcards && flashcards.length > 0 ? (
                              <Flashcards 
                                cards={flashcards.map(card => ({ 
                                  front: card.front || card.term, 
                                  back: card.back || card.definition 
                                }))} 
                                onPreferencesClick={() => setSummaryDialogOpen(true)}
                              />
                            ) : (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                                <CircularProgress size={40} sx={{ mb: 2 }} />
                                <Typography variant="body1">Generating flashcards...</Typography>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                  
                  {/* File Preview Section */}
                  {uploadedFiles.length > 0 && (
                    <Card 
                      elevation={2} 
                      sx={{ 
                        mb: 4, 
                        borderRadius: '20px',
                        overflow: 'hidden'
                      }}
                    >
                      <CardContent sx={{ p: 0 }}>
                        <Box sx={{ 
                          bgcolor: 'rgba(251, 188, 4, 0.1)', 
                          p: 2, 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <Box display="flex" alignItems="center">
                            <PermMediaIcon sx={{ color: '#FBBC04', mr: 1 }} />
                            <Typography variant="h6" sx={{ fontWeight: 500, color: '#FBBC04' }}>
                              Uploaded Files
                            </Typography>
                          </Box>
                          <Tooltip title="View all files">
                            <IconButton 
                              size="small" 
                              onClick={() => setShowAllFiles(!showAllFiles)}
                              sx={{ color: '#FBBC04' }}
                            >
                              {showAllFiles ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                        
                        <Collapse in={showAllFiles || true}>
                          <Box sx={{ p: 3 }}>
                            <Grid container spacing={3}>
                              {uploadedFiles.map((file, index) => (
                                <Grid item xs={12} sm={6} md={4} key={`file-preview-${index}`}>
                                  <Card 
                                    elevation={2} 
                                    sx={{ 
                                      height: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      borderRadius: '12px',
                                      overflow: 'hidden',
                                      transition: 'transform 0.2s',
                                      '&:hover': {
                                        transform: 'translateY(-5px)',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                                      }
                                    }}
                                  >
                                    <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                      {/* Image Preview */}
                                      {file.type === 'image' && (
                                        <Box sx={{ mb: 2, flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                          <img 
                                            src={file.url} 
                                            alt={file.name} 
                                            style={{ 
                                              maxWidth: '100%', 
                                              maxHeight: '160px',
                                              borderRadius: '8px',
                                              objectFit: 'contain'
                                            }} 
                                          />
                                        </Box>
                                      )}
                                      
                                      {/* PDF Preview */}
                                      {file.type === 'pdf' && (
                                        <Box sx={{ 
                                          mb: 2, 
                                          flexGrow: 1, 
                                          display: 'flex', 
                                          flexDirection: 'column',
                                          justifyContent: 'center', 
                                          alignItems: 'center',
                                          backgroundColor: 'rgba(234, 67, 53, 0.05)',
                                          borderRadius: '8px',
                                          p: 2
                                        }}>
                                          <PictureAsPdfIcon sx={{ fontSize: 60, color: '#EA4335', mb: 1 }} />
                                          <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 500 }}>
                                            PDF Document
                                          </Typography>
                                        </Box>
                                      )}
                                      
                                      {/* Audio Preview */}
                                      {file.type === 'audio' && (
                                        <Box sx={{ 
                                          mb: 2, 
                                          flexGrow: 1, 
                                          display: 'flex', 
                                          flexDirection: 'column',
                                          justifyContent: 'center', 
                                          alignItems: 'center'
                                        }}>
                                          <AudioFileIcon sx={{ fontSize: 40, color: '#FBBC04', mb: 1 }} />
                                          <audio 
                                            controls 
                                            src={file.url}
                                            style={{ width: '100%' }}
                                          />
                                        </Box>
                                      )}
                                      
                                      {/* Video Preview */}
                                      {file.type === 'video' && (
                                        <Box sx={{ 
                                          mb: 2, 
                                          flexGrow: 1, 
                                          display: 'flex', 
                                          flexDirection: 'column',
                                          justifyContent: 'center', 
                                          alignItems: 'center'
                                        }}>
                                          <video 
                                            controls 
                                            src={file.url}
                                            style={{ 
                                              width: '100%', 
                                              maxHeight: '160px',
                                              borderRadius: '8px'
                                            }}
                                          />
                                        </Box>
                                      )}
                                      
                                      <Typography variant="body2" sx={{ 
                                        fontWeight: 500, 
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap'
                                      }} title={file.name}>
                                        {file.name}
                                      </Typography>
                                      
                                      <Typography variant="caption" color="text.secondary">
                                        {file.file.size < 1024 * 1024 
                                          ? `${Math.round(file.file.size / 1024)} KB` 
                                          : `${(file.file.size / (1024 * 1024)).toFixed(1)} MB`}
                                      </Typography>
                                    </CardContent>
                                    
                                    <CardActions sx={{ p: 1, pt: 0 }}>
                                      {file.type === 'pdf' && (
                                        <Button 
                                          size="small" 
                                          startIcon={<OpenInNewIcon />}
                                          onClick={() => window.open(file.url, '_blank')}
                                          fullWidth
                                          variant="outlined"
                                        >
                                          Open PDF
                                        </Button>
                                      )}
                                      {file.type === 'image' && (
                                        <Button 
                                          size="small" 
                                          startIcon={<ZoomInIcon />}
                                          onClick={() => window.open(file.url, '_blank')}
                                          fullWidth
                                          variant="outlined"
                                        >
                                          View Full Size
                                        </Button>
                                      )}
                                    </CardActions>
                                  </Card>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        </Collapse>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Extracted text section - with toggle button */}
                  <Card 
                    elevation={2} 
                    sx={{ 
                      mb: 4, 
                      borderRadius: '20px',
                      overflow: 'hidden'
                    }}
                  >
                    <CardContent sx={{ p: 0 }}>
                      <Box sx={{ 
                        bgcolor: 'rgba(52, 168, 83, 0.1)', 
                        p: 2, 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <Box display="flex" alignItems="center">
                          <FormatListBulletedIcon sx={{ color: '#34A853', mr: 1 }} />
                          <Typography variant="h6" sx={{ fontWeight: 500, color: '#34A853' }}>
                            Extracted Text
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          color="success"
                          size="small"
                          onClick={() => setShowExtractedText(!showExtractedText)}
                          sx={{ borderRadius: '20px' }}
                        >
                          {showExtractedText ? 'Hide Text' : 'Show Text'}
                        </Button>
                      </Box>
                      <Divider />
                      {showExtractedText && (
                        <Box sx={{ p: 3, maxHeight: '300px', overflow: 'auto' }}>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                            {formatText(extractedText)}
                          </Typography>
                        </Box>
                      )}
                      {!showExtractedText && (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Click the "Show Text" button above to view the extracted text.
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Action buttons */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<QuizIcon />}
                      onClick={() => setActiveTab(2)}
                      sx={{ 
                        borderRadius: '20px',
                        px: 4,
                        py: 1.5,
                        textTransform: 'none',
                        fontSize: '1rem'
                      }}
                    >
                      Take Quiz
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CalendarMonthIcon />}
                      onClick={() => setActiveTab(3)}
                      sx={{ 
                        borderRadius: '20px',
                        px: 4,
                        py: 1.5,
                        textTransform: 'none',
                        fontSize: '1rem'
                      }}
                    >
                      Create Study Plan
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}
        </Box>
        
        {/* Quiz Tab */}
        <Box role="tabpanel" hidden={activeTab !== 2} id="tabpanel-2" aria-labelledby="tab-2">
          {activeTab === 2 && (
            <Box>
              {quiz.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                  <CircularProgress size={60} sx={{ mb: 3 }} />
                  <Typography variant="h6">Generating quiz questions...</Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 3
                    }}>
                      <Typography variant="h5" sx={{ 
                        color: '#4285F4', 
                        display: 'flex', 
                        alignItems: 'center'
                      }}>
                        <QuizIcon sx={{ mr: 1 }} />
                        Test Your Knowledge
                      </Typography>
                      
                      {/* Edit Questions button removed as requested */}
                    </Box>
                    
                    {quizSubmitted && (
                      <Card sx={{ 
                        mb: 4, 
                        p: 2, 
                        bgcolor: quizScore >= 70 ? 'rgba(52, 168, 83, 0.1)' : 'rgba(234, 67, 53, 0.1)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexDirection: 'row'
                      }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="h4" sx={{ 
                            color: quizScore >= 70 ? '#34A853' : '#EA4335',
                            fontWeight: 'bold',
                            mb: 1
                          }}>
                            {quizScore.toFixed(0)}%
                          </Typography>
                          <Typography variant="body1">
                            {quizScore >= 70 
                              ? 'Great job! You have a good understanding of the material.' 
                              : 'Keep studying! Review the summary to improve your score.'}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={resetQuiz}
                          sx={{ 
                            borderRadius: '20px',
                            px: 3,
                            py: 1,
                            textTransform: 'none'
                          }}
                        >
                          Try Again
                        </Button>
                      </Card>
                    )}
                    
                    {/* Number of questions selector */}
                    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body1">Number of questions:</Typography>
                      <TextField
                        type="number"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                        InputProps={{ inputProps: { min: 1, max: 20 } }}
                        size="small"
                        sx={{ width: '80px' }}
                        disabled={quizSubmitted || isEditingQuiz}
                      />
                      {!quizSubmitted && !isEditingQuiz && (
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={generateNewQuiz}
                          disabled={loading}
                          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                          sx={{ borderRadius: '20px' }}
                        >
                          {loading ? 'Generating...' : 'Generate New Quiz'}
                        </Button>
                      )}
                    </Box>
                    
                    {/* Quiz questions */}
                    <div id="quiz-container">
                    {(isEditingQuiz ? editableQuiz : quiz).map((question, qIndex) => (
                      <Card 
                        key={qIndex} 
                        sx={{ 
                          mb: 3, 
                          borderRadius: '20px',
                          overflow: 'hidden',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <CardContent sx={{ p: 0 }}>
                          <Box sx={{ 
                            bgcolor: 'rgba(66, 133, 244, 0.1)', 
                            p: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <Typography variant="h6" sx={{ fontWeight: 500 }}>
                              Question {qIndex + 1}
                            </Typography>
                            {!quizSubmitted && !isEditingQuiz && (
                              <Button
                                variant="outlined"
                                color="primary"
                                size="small"
                                onClick={() => regenerateQuestion(qIndex)}
                                disabled={isRegeneratingQuestion}
                                startIcon={regeneratingIndex === qIndex ? <CircularProgress size={16} /> : <RefreshIcon />}
                                sx={{ borderRadius: '20px', textTransform: 'none' }}
                              >
                                {regeneratingIndex === qIndex ? 'Regenerating...' : 'New Question'}
                              </Button>
                            )}
                          </Box>
                          <Box sx={{ p: 3 }}>
                            {isEditingQuiz ? (
                              <TextField
                                fullWidth
                                label="Question"
                                value={question.question}
                                onChange={(e) => handleQuestionEdit(qIndex, 'question', e.target.value)}
                                multiline
                                sx={{ mb: 3 }}
                              />
                            ) : (
                              <Typography variant="body1" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
                                {question.question}
                              </Typography>
                            )}
                            
                            <FormControl component="fieldset" sx={{ width: '100%' }}>
                              {isEditingQuiz ? (
                                <Box sx={{ mb: 2 }}>
                                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Options:</Typography>
                                  {question.options.map((option, oIndex) => (
                                    <Box key={oIndex} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                      <Radio 
                                        checked={question.correctAnswer === oIndex}
                                        onChange={() => handleQuestionEdit(qIndex, 'correctAnswer', oIndex)}
                                        sx={{ mr: 1 }}
                                      />
                                      <TextField
                                        fullWidth
                                        label={`Option ${oIndex + 1}${question.correctAnswer === oIndex ? ' (Correct)' : ''}`}
                                        value={option}
                                        onChange={(e) => handleQuestionEdit(qIndex, `option${oIndex}`, e.target.value)}
                                        size="small"
                                        sx={{
                                          ...(question.correctAnswer === oIndex && {
                                            '& .MuiOutlinedInput-root': {
                                              '& fieldset': {
                                                borderColor: '#34A853',
                                              },
                                              '&:hover fieldset': {
                                                borderColor: '#34A853',
                                              },
                                            },
                                          }),
                                        }}
                                      />
                                    </Box>
                                  ))}
                                  <Typography variant="caption" color="text.secondary">
                                    Select the radio button next to the correct answer
                                  </Typography>
                                </Box>
                              ) : (
                                <RadioGroup>
                                  {question.options.map((option, oIndex) => (
                                    <FormControlLabel
                                      key={oIndex}
                                      value={oIndex.toString()}
                                      control={
                                        <Radio 
                                          checked={selectedAnswers[qIndex] === oIndex}
                                          onChange={() => handleAnswerSelect(qIndex, oIndex)}
                                          disabled={quizSubmitted}
                                          sx={{
                                            '&.Mui-checked': {
                                              color: quizSubmitted 
                                                ? (oIndex === question.correctAnswer ? '#34A853' : '#EA4335')
                                                : '#4285F4'
                                            }
                                          }}
                                        />
                                      }
                                      label={
                                        <Typography 
                                          variant="body1" 
                                          sx={{
                                            ...(quizSubmitted && oIndex === question.correctAnswer && {
                                              color: '#34A853',
                                              fontWeight: 'bold',
                                            }),
                                            ...(quizSubmitted && 
                                              selectedAnswers[qIndex] === oIndex && 
                                              oIndex !== question.correctAnswer && {
                                                color: '#EA4335',
                                                fontWeight: 'bold',
                                              }),
                                          }}
                                        >
                                          {option}
                                        </Typography>
                                      }
                                      sx={{ 
                                        mb: 1,
                                        p: 1,
                                        borderRadius: '12px',
                                        ...(quizSubmitted && oIndex === question.correctAnswer && {
                                          bgcolor: 'rgba(52, 168, 83, 0.1)',
                                        }),
                                        ...(quizSubmitted && 
                                          selectedAnswers[qIndex] === oIndex && 
                                          oIndex !== question.correctAnswer && {
                                            bgcolor: 'rgba(234, 67, 53, 0.1)',
                                          }),
                                      }}
                                    />
                                  ))}
                                </RadioGroup>
                              )}
                            </FormControl>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                    
                    </div>
                    {/* Quiz action buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
                      {!quizSubmitted && (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<CheckCircleIcon />}
                          onClick={handleQuizSubmit}
                          disabled={Object.keys(selectedAnswers).length !== quiz.length}
                          sx={{ 
                            borderRadius: '20px',
                            px: 4,
                            py: 1.5,
                            textTransform: 'none',
                            fontSize: '1rem'
                          }}
                        >
                          Submit Answers
                        </Button>
                      )}
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          )}
        </Box>
        
        {/* Study Plan Tab */}
        <Box role="tabpanel" hidden={activeTab !== 3} id="tabpanel-3" aria-labelledby="tab-3">
          {activeTab === 3 && (
            <Box>
              <StudyPlanGenerator 
                content={extractedText} 
                onClose={() => setActiveTab(1)}
                onPlanSaved={() => setPlanSaved(prev => !prev)}
              />
              
              
              {/* Study Plan History moved to always be visible outside tabs */}
            </Box>
          )}
        </Box>
      </Paper>
      
      {/* Study Plan History - Always visible */}
      <Paper elevation={3} sx={{ 
        p: 4, 
        borderRadius: 2, 
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        mt: 4
      }}>
        <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', color: '#4285F4' }}>
          <CalendarMonthIcon sx={{ mr: 1 }} />
          Study Plan History
        </Typography>
        <StudyPlanHistory key={planSaved} refreshTrigger={planSaved} />
      </Paper>
      
      {/* Summary Preferences Dialog */}
      <Dialog
        open={summaryDialogOpen}
        onClose={() => setSummaryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Customize Your Summary
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please describe how you would like your summary to be generated. For example:
          </Typography>
          <Box sx={{ mb: 2, pl: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • "Make it more concise"
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • "Focus on key concepts only"
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • "Explain it like I'm a beginner"
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • "Include more examples"
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Summary Preferences"
            variant="outlined"
            value={summaryPreference}
            onChange={(e) => setSummaryPreference(e.target.value)}
            placeholder="Describe how you want your summary to be generated..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setSummaryDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: '20px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Close dialog
              setSummaryDialogOpen(false);
              
              // Set analyzing state
              setIsAnalyzing(true);
              
              // Generate new summary with user preferences
              setTimeout(() => {
                analyzeContent(summaryPreference);
              }, 500);
            }}
            variant="contained"
            color="primary"
            sx={{ borderRadius: '20px' }}
          >
            Generate Summary
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Summary Preferences Dialog */}
      <Dialog
        open={summaryDialogOpen}
        onClose={() => setSummaryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Customize Your Summary
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please describe how you would like your summary to be generated. For example:
          </Typography>
          <Box sx={{ mb: 2, pl: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • "Make it more concise"
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • "Focus on key concepts only"
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • "Explain it like I'm a beginner"
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • "Include more examples"
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Summary Preferences"
            variant="outlined"
            value={summaryPreference}
            onChange={(e) => setSummaryPreference(e.target.value)}
            placeholder="Describe how you want your summary to be generated..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setSummaryDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: '20px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              // Close dialog
              setSummaryDialogOpen(false);
              
              // Set analyzing state
              setIsAnalyzing(true);
              
              // Generate new summary with user preferences
              setTimeout(() => {
                analyzeContent(summaryPreference);
              }, 500);
            }}
            variant="contained"
            color="primary"
            sx={{ borderRadius: '20px' }}
          >
            Generate Summary
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Camera dialog */}
      <Dialog
        open={cameraOpen}
        onClose={closeCameraDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Capture Image</Typography>
            <IconButton onClick={closeCameraDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ position: 'relative', width: '100%', textAlign: 'center' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              style={{ 
                width: '100%', 
                maxHeight: '70vh',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }} 
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCameraDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={takePicture}
            startIcon={<CameraAltIcon />}
            sx={{ borderRadius: '20px' }}
          >
            Take Picture
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Audio Recording Dialog */}
      <Dialog
        open={audioRecordingDialogOpen}
        onClose={handleCloseAudioRecording}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Record Audio</Typography>
            <IconButton onClick={handleCloseAudioRecording} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {isRecording ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    bgcolor: 'rgba(234, 67, 53, 0.1)',
                    mb: 3,
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': {
                        boxShadow: '0 0 0 0 rgba(234, 67, 53, 0.4)'
                      },
                      '70%': {
                        boxShadow: '0 0 0 20px rgba(234, 67, 53, 0)'
                      },
                      '100%': {
                        boxShadow: '0 0 0 0 rgba(234, 67, 53, 0)'
                      }
                    }
                  }}
                >
                  <FiberManualRecordIcon sx={{ fontSize: 60, color: '#EA4335' }} />
                </Box>
                <Typography variant="h4" sx={{ mb: 2, fontFamily: 'monospace' }}>
                  {formatRecordingTime(recordingTime)}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Recording in progress...
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={stopRecording}
                  sx={{ borderRadius: '20px' }}
                >
                  Stop Recording
                </Button>
              </Box>
            ) : showPreview ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    bgcolor: 'rgba(66, 133, 244, 0.1)',
                    mb: 3
                  }}
                >
                  <AudioFileIcon sx={{ fontSize: 60, color: '#4285F4' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Preview Your Recording
                </Typography>
                
                {/* Audio Preview Player */}
                <Box sx={{ width: '100%', maxWidth: '400px', mb: 3 }}>
                  <audio 
                    ref={previewAudioRef}
                    src={previewAudioUrl} 
                    controls 
                    style={{ width: '100%' }}
                    preload="auto"
                    onPlay={() => {
                      console.log('Audio preview started playing');
                      setIsAudioPlaying(true);
                    }}
                    onPause={() => {
                      console.log('Audio preview paused');
                      setIsAudioPlaying(false);
                    }}
                    onEnded={() => {
                      console.log('Audio preview playback ended');
                      setIsAudioPlaying(false);
                    }}
                  />
                </Box>
                
                {/* Test audio output */}
                <Button 
                  variant="text" 
                  size="small" 
                  color="primary"
                  onClick={() => {
                    // Play a test sound to verify audio output
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
                    oscillator.connect(audioContext.destination);
                    oscillator.start();
                    setTimeout(() => oscillator.stop(), 500);
                  }}
                  sx={{ mb: 2 }}
                >
                  Test speakers
                </Button>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Listen to your recording. You can use it for analysis or record again.
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      setShowPreview(false);
                      setPreviewAudioUrl(null);
                    }}
                    sx={{ borderRadius: '20px' }}
                  >
                    Record Again
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      // Use the recorded blob to create a file and URL
                      if (recordedBlob && recordedBlob.size > 0) {
                        try {
                          // Use the actual MIME type from the recording for better transcription
                          const mimeType = recordedBlob.type || 'audio/webm';
                          const fileExt = mimeType.includes('webm') ? 'webm' : 
                                         mimeType.includes('mp4') ? 'mp4' : 
                                         mimeType.includes('mpeg') ? 'mp3' : 'audio';
                          
                          const fileName = `recorded_audio_${Date.now()}.${fileExt}`;
                          console.log(`Creating file with name: ${fileName} and type: ${mimeType}`);
                          
                          // Create a file with the original format for better transcription
                          const audioFile = new File([recordedBlob], fileName, { 
                            type: mimeType 
                          });
                          
                          // Create a URL for the file
                          const fileObjectUrl = URL.createObjectURL(audioFile);
                          console.log('Created file URL for analysis:', fileObjectUrl);
                          
                          // Create a new file object
                          const newFile = {
                            file: audioFile,
                            url: fileObjectUrl,
                            type: 'recordedAudio',
                            name: fileName
                          };
                          
                          // Add to existing files
                          setUploadedFiles(prev => [...prev, newFile]);
                          setUploadType('recordedAudio');
                          setSuccess('Audio recorded successfully! Click "Analyze Content" to proceed with transcription and analysis.');
                          
                          // Dispatch event to notify AI chatbot
                          window.dispatchEvent(new CustomEvent('scholarai:fileUploaded', {
                            detail: {
                              fileType: 'recordedAudio',
                              fileName: fileName
                            }
                          }));
                          
                          // Close the dialog
                          setAudioRecordingDialogOpen(false);
                        } catch (error) {
                          console.error('Error creating file from blob:', error);
                          setError('Error processing the recording. Please try again.');
                        }
                      } else {
                        console.error('No valid recording blob available');
                        setError('No recording available. Please try recording again.');
                      }
                    }}
                    sx={{ borderRadius: '20px' }}
                  >
                    Use This Recording
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    bgcolor: 'rgba(52, 168, 83, 0.1)',
                    mb: 3
                  }}
                >
                  <MicIcon sx={{ fontSize: 60, color: '#34A853' }} />
                </Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Ready to Record
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '400px', textAlign: 'center' }}>
                  Click the button below to start recording your lecture, notes, or any audio you want to analyze.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<MicIcon />}
                  onClick={startRecording}
                  sx={{ borderRadius: '20px' }}
                >
                  Start Recording
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default StudyCompanion;

