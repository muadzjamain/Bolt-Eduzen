import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  LinearProgress,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Tabs,
  Tab,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  InputLabel,
  Slider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import SummarizeIcon from '@mui/icons-material/Summarize';
import QuizIcon from '@mui/icons-material/Quiz';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import SaveIcon from '@mui/icons-material/Save';
import TimerIcon from '@mui/icons-material/Timer';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { format } from 'date-fns';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useProgress } from '../context/ProgressContext';

const StudyPlanHistory = ({ refreshTrigger }) => {
  const [studyPlans, setStudyPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearHistoryDialogOpen, setClearHistoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [error, setError] = useState(null);
  
  // New state variables for tabs and quiz functionality
  const [activeTab, setActiveTab] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [hasSubmittedQuiz, setHasSubmittedQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [numQuizQuestions, setNumQuizQuestions] = useState(5);
  const [latestQuiz, setLatestQuiz] = useState(null);
  const [latestQuizAnswers, setLatestQuizAnswers] = useState({});
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const quizResultsRef = useRef(null);
  const [planSummary, setPlanSummary] = useState('');
  const [planQuiz, setPlanQuiz] = useState([]);
  
  // Timer functionality
  const [activeTimer, setActiveTimer] = useState(null); // { dayIndex, sessionIndex, timeLeft, duration }
  const [timerInterval, setTimerInterval] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Use the global progress context
  const { studyPlanProgress, updateStudyPlanProgress, calculateProgress: globalCalculateProgress } = useProgress();

  // Simple function to safely format dates
  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date';
    
    try {
      // Check if it's a Firestore timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        return format(timestamp.toDate(), 'dd/MM/yyyy');
      }
      
      // Check if it's a JavaScript Date
      if (timestamp instanceof Date) {
        return format(timestamp, 'dd/MM/yyyy');
      }
      
      // Default fallback
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  // Function to safely format time
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      let date;
      if (timestamp.toDate) {
        // Firestore Timestamp
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        // Firestore Timestamp in serialized form
        date = new Date(timestamp.seconds * 1000);
      } else {
        // JS Date object or timestamp
        date = new Date(timestamp);
      }
      
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };
  
  // Format total study time in hours and minutes
  const formatTotalTime = (milliseconds) => {
    if (!milliseconds || milliseconds <= 0) return '0 min';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes > 0 ? remainingMinutes + 'm' : ''}`;
    } else {
      return `${minutes} min`;
    }
  };
  
  // Calculate total time spent on a plan
  const getTotalTimeSpent = (plan) => {
    if (!plan || !plan.days || !Array.isArray(plan.days)) return 0;
    
    let totalTimeSpent = 0;
    
    plan.days.forEach(day => {
      if (day && day.sessions && Array.isArray(day.sessions)) {
        day.sessions.forEach(session => {
          // Debug session data
          console.log('Session time data:', {
            title: session.title,
            timeSpent: session.timeSpent,
            completed: session.completed
          });
          
          if (session && typeof session.timeSpent === 'number') {
            totalTimeSpent += session.timeSpent;
          } else if (session && session.completed) {
            // If the session is completed but has no timeSpent, estimate based on duration
            const estimatedTime = (session.duration || 30) * 60 * 1000;
            totalTimeSpent += estimatedTime;
          }
        });
      }
    });
    
    console.log('Total time spent on plan:', totalTimeSpent);
    return totalTimeSpent;
  };
  
  // Function to safely calculate progress
  // This function is used both for initial calculation and updates
  const calculateProgress = (days) => {
    try {
      if (!days || !Array.isArray(days)) return 0;
      
      let totalSessions = 0;
      let completedSessions = 0;
      
      days.forEach(day => {
        if (day && day.sessions && Array.isArray(day.sessions)) {
          day.sessions.forEach(session => {
            totalSessions++;
            if (session && session.completed) {
              completedSessions++;
            }
          });
        }
      });
      
      if (totalSessions === 0) return 0;
      return Math.round((completedSessions / totalSessions) * 100);
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  };
  
  // Check if we have cached progress data when component mounts
  useEffect(() => {
    try {
      const progressCache = JSON.parse(localStorage.getItem('scholarai_progress_cache') || '{}');
      // We'll use this cache as a fallback if Firestore is slow to respond
      console.log('Loaded progress cache:', progressCache);
    } catch (error) {
      console.error('Error loading progress cache:', error);
    }
  }, []);
  
  // Fetch study plans when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Auth state changed, user is logged in:', user.uid);
        fetchStudyPlans();
      } else {
        console.log('Auth state changed, no user logged in');
        setStudyPlans([]);
        setError('You must be logged in to view study plans');
      }
    });
    
    return () => unsubscribe();
  }, []); 
  
  // Fetch when refreshTrigger changes
  useEffect(() => {
    if (auth.currentUser) {
      fetchStudyPlans();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    fetchStudyPlans();
    // Load the latest quiz from localStorage
    loadLatestQuiz();
  }, [refreshTrigger]);
  
  // Function to load the latest quiz from localStorage
  const loadLatestQuiz = () => {
    const user = auth.currentUser;
    if (user) {
      // Try to get the quiz from StudyCompanion (new format)
      const savedLatestQuiz = localStorage.getItem(`scholarai_study_quiz_${user.uid}`);
      const savedLatestQuizAnswers = localStorage.getItem(`scholarai_latest_quiz_answers_${user.uid}`);
      
      // If we have a quiz from StudyCompanion
      if (savedLatestQuiz) {
        try {
          const parsedQuiz = JSON.parse(savedLatestQuiz);
          console.log('Loaded quiz from localStorage:', parsedQuiz);
          
          // Convert the quiz format if needed
          const formattedQuiz = parsedQuiz.map(q => ({
            question: q.question,
            options: q.options,
            answer: q.options[q.correctAnswer] // Convert index to actual answer text
          }));
          
          setLatestQuiz(formattedQuiz);
          
          // Load answers if available
          if (savedLatestQuizAnswers) {
            try {
              const parsedAnswers = JSON.parse(savedLatestQuizAnswers);
              setLatestQuizAnswers(parsedAnswers);
              console.log('Loaded quiz answers from localStorage:', parsedAnswers);
            } catch (error) {
              console.error('Error parsing latest quiz answers from localStorage:', error);
            }
          }
        } catch (error) {
          console.error('Error parsing latest quiz from localStorage:', error);
        }
      } else {
        // Try the direct format (our format)
        const directQuiz = localStorage.getItem(`scholarai_latest_quiz_${user.uid}`);
        const directAnswers = localStorage.getItem(`scholarai_latest_quiz_answers_${user.uid}`);
        
        if (directQuiz) {
          try {
            setLatestQuiz(JSON.parse(directQuiz));
            console.log('Loaded quiz directly from localStorage');
            
            if (directAnswers) {
              setLatestQuizAnswers(JSON.parse(directAnswers));
            }
          } catch (error) {
            console.error('Error parsing direct quiz from localStorage:', error);
          }
        }
      }
    }
  };

  // Check for latest summary when component mounts
  useEffect(() => {
    // If we have a latest summary, check if any selected plan needs it
    const latestSummary = getLatestSummary();
    if (latestSummary && selectedPlan && !selectedPlan.summary) {
      // Automatically save the summary to the selected plan
      handleSaveSummary(selectedPlan.id, latestSummary);
    }
  }, [selectedPlan]);
  
  // Setup real-time listener for study plans
  // This ensures progress persists when navigating between pages
  useEffect(() => {
    setError(null);
    const user = auth.currentUser;
    if (!user) {
      console.log('No user for real-time listener');
      setLoading(false);
      return;
    }
    
    // Set a flag in localStorage to indicate we're using real-time updates
    localStorage.setItem('scholarai_using_realtime', 'true');
    
    try {
      console.log('Setting up real-time listener for study plans');
      const q = query(
        collection(db, 'studyPlans'),
        where('userId', '==', user.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          console.log('Real-time update received, docs:', snapshot.size);
          const plans = [];
          
          snapshot.forEach((doc) => {
            try {
              const data = doc.data();
              // Ensure we have valid data
              if (data) {
                // Use progress from global context if available, otherwise use stored or calculate
                const globalProgress = studyPlanProgress[doc.id]?.progress;
                const storedProgress = data.lastProgress;
                const calculatedProgress = calculateProgress(data.days || []);
                
                // Priority: global context > stored in doc > calculated
                const progress = globalProgress !== undefined ? globalProgress : 
                                (storedProgress !== undefined ? storedProgress : calculatedProgress);
                
                plans.push({
                  id: doc.id,
                  ...data,
                  progress: progress
                });
              }
            } catch (docError) {
              console.error('Error processing document:', docError);
            }
          });
          
          // Sort plans by creation date if available
          const sortedPlans = plans.sort((a, b) => {
            try {
              // Use our safe date comparison logic
              const dateA = a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : null;
              const dateB = b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate() : null;
              
              if (dateA && dateB) return dateB - dateA;
              if (dateA) return -1;
              if (dateB) return 1;
              return 0;
            } catch (sortError) {
              console.error('Error sorting plans:', sortError);
              return 0;
            }
          });
          
          setStudyPlans(sortedPlans);
        } catch (snapshotError) {
          console.error('Error processing snapshot:', snapshotError);
          setError('Error loading study plans');
        } finally {
          setLoading(false);
        }
      }, (error) => {
        console.error('Error in real-time listener:', error);
        setError(`Firestore error: ${error.message}. Please check your Firebase rules.`);
        setLoading(false);
      });
      
      return () => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up listener:', error);
      setError(`Error setting up Firestore listener: ${error.message}`);
      setLoading(false);
    }
  }, [auth.currentUser?.uid]);

  const fetchStudyPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = auth.currentUser;
      
      console.log('Fetching study plans, user:', user ? user.uid : 'not logged in');
      
      if (!user) {
        console.log('No user logged in, clearing study plans');
        setStudyPlans([]);
        return;
      }
      
      // Query for this user's plans
      const q = query(
        collection(db, 'studyPlans'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('Study plans for current user:', querySnapshot.size);
      
      const plans = [];
      
      querySnapshot.forEach((doc) => {
        try {
          const data = doc.data();
          if (data) {
            console.log('Adding plan to list:', doc.id, data.name);
            plans.push({
              id: doc.id,
              ...data,
              progress: calculateProgress(data.days || [])
            });
          }
        } catch (docError) {
          console.error('Error processing document:', docError);
        }
      });
      
      // Sort plans safely
      const sortedPlans = plans.sort((a, b) => {
        try {
          // Use our safe date comparison logic
          const dateA = a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : null;
          const dateB = b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate() : null;
          
          if (dateA && dateB) return dateB - dateA;
          if (dateA) return -1;
          if (dateB) return 1;
          return 0;
        } catch (sortError) {
          console.error('Error sorting plans:', sortError);
          return 0;
        }
      });
      
      console.log('Setting study plans:', sortedPlans.length);
      setStudyPlans(sortedPlans);
    } catch (error) {
      console.error('Error fetching study plans:', error);
      setError(`Error fetching study plans: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSession = async (dayIndex, sessionIndex) => {
    if (!selectedPlan) return;
    
    // Create a deep copy of the selected plan
    const updatedPlan = JSON.parse(JSON.stringify(selectedPlan));
    
    // Toggle the completion status
    if (updatedPlan.days && updatedPlan.days[dayIndex] && updatedPlan.days[dayIndex].sessions) {
      const session = updatedPlan.days[dayIndex].sessions[sessionIndex];
      if (session) {
        session.completed = !session.completed;
        
        // If completing a session without time spent, add estimated time
        if (session.completed && (!session.timeSpent || session.timeSpent <= 0)) {
          // Estimate time spent based on session duration (convert minutes to ms)
          session.timeSpent = (session.duration || 30) * 60 * 1000;
        }
      }
    }
    
    // Calculate new progress
    const newProgress = calculateProgress(updatedPlan.days || []);
    updatedPlan.progress = newProgress;
    updatedPlan.lastProgress = newProgress;
    
    // Update Firestore
    try {
      const planRef = doc(db, 'studyPlans', selectedPlan.id);
      
      // Update the document
      updateDoc(planRef, {
        days: updatedPlan.days,
        progress: newProgress,
        lastProgress: newProgress,
        lastUpdated: new Date()
      });
      
      // Update the selected plan in the state
      setSelectedPlan(updatedPlan);
      
      // Also update the plan in the studyPlans array
      setStudyPlans(prevPlans => 
        prevPlans.map(plan => 
          plan.id === selectedPlan.id ? updatedPlan : plan
        )
      );
      
      // Update the global progress context
      updateStudyPlanProgress(selectedPlan.id, newProgress);
      
      // Also store in localStorage as a backup
      try {
        const progressCache = JSON.parse(localStorage.getItem('scholarai_progress_cache') || '{}');
        progressCache[selectedPlan.id] = {
          progress: newProgress,
          timestamp: Date.now()
        };
        localStorage.setItem('scholarai_progress_cache', JSON.stringify(progressCache));
      } catch (storageError) {
        console.error('Error updating localStorage cache:', storageError);
      }
      
      // Update in Firestore with the progress value
      // This ensures progress is maintained across page navigations
      // Do this after updating the UI to ensure responsiveness
      await updateDoc(doc(db, 'studyPlans', selectedPlan.id), {
        days: updatedPlan.days,
        lastProgress: newProgress,  // Store the progress value in Firestore
        progress: newProgress,      // Also store directly as progress for consistency
        lastUpdated: new Date()     // Track when it was last updated
      });
    } catch (error) {
      console.error('Error toggling session completion:', error);
    }
  };

  const handleDeletePlan = async () => {
    try {
      if (!planToDelete) return;
      
      await deleteDoc(doc(db, 'studyPlans', planToDelete.id));
      
      setStudyPlans(prevPlans => 
        prevPlans.filter(plan => plan.id !== planToDelete.id)
      );
      
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    } catch (error) {
      console.error('Error deleting study plan:', error);
    }
  };

  const handleEditName = async () => {
    try {
      if (!selectedPlan || !newPlanName.trim()) return;
      
      console.log('Updating plan name to:', newPlanName.trim());
      console.log('For plan ID:', selectedPlan.id);
      
      // Update in Firestore
      await updateDoc(doc(db, 'studyPlans', selectedPlan.id), {
        name: newPlanName.trim()
      });
      
      // Update in local state
      setStudyPlans(prevPlans => {
        const updatedPlans = prevPlans.map(plan => 
          plan.id === selectedPlan.id 
            ? { ...plan, name: newPlanName.trim() } 
            : plan
        );
        console.log('Updated plans:', updatedPlans);
        return updatedPlans;
      });
      
      // Update the selected plan if it's still selected
      if (selectedPlan) {
        setSelectedPlan(prev => ({
          ...prev,
          name: newPlanName.trim()
        }));
      }
      
      // Close the dialog
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating plan name:', error);
      setError('Failed to update plan name. Please try again.');
    }
  };
  
  // Function to handle saving the edited name with inline editing
  const handleSaveEditedName = async (planId) => {
    try {
      if (!newPlanName.trim()) return;
      
      console.log('Saving edited name:', newPlanName.trim());
      console.log('For plan ID:', planId);
      
      // Update in Firestore
      await updateDoc(doc(db, 'studyPlans', planId), {
        name: newPlanName.trim()
      });
      
      // Update in local state
      setStudyPlans(prevPlans => {
        const updatedPlans = prevPlans.map(plan => 
          plan.id === planId 
            ? { ...plan, name: newPlanName.trim() } 
            : plan
        );
        return updatedPlans;
      });
      
      // Update the selected plan if it's still selected
      if (selectedPlan && selectedPlan.id === planId) {
        setSelectedPlan(prev => ({
          ...prev,
          name: newPlanName.trim()
        }));
      }
      
      // Exit editing mode
      setEditingPlanId(null);
    } catch (error) {
      console.error('Error updating plan name:', error);
      setError('Failed to update plan name. Please try again.');
    }
  };

  const handleOpenClearHistoryDialog = () => {
    setClearHistoryDialogOpen(true);
  };

  const handleCloseClearHistoryDialog = () => {
    setClearHistoryDialogOpen(false);
  };

  const handleClearHistory = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const q = query(
        collection(db, 'studyPlans'),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      const deletePromises = [];
      querySnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, 'studyPlans', document.id)));
      });
      
      await Promise.all(deletePromises);
      setStudyPlans([]);
      setClearHistoryDialogOpen(false);
    } catch (error) {
      console.error('Error clearing study plan history:', error);
    }
  };

  // This function is used to save the AI-generated summary from document analysis
  const handleSaveSummary = async (planId, summary) => {
    try {
      if (!planId || !summary) return;
      
      setLoading(true);
      setError(null);
      
      // Update the document in Firestore
      await updateDoc(doc(db, 'studyPlans', planId), {
        summary: summary,
        lastUpdated: new Date()
      });
      
      // Update the local state
      setStudyPlans(prevPlans => 
        prevPlans.map(plan => 
          plan.id === planId 
            ? { ...plan, summary: summary, lastUpdated: new Date() } 
            : plan
        )
      );
      
      // Update the selected plan if it's the one being edited
      if (selectedPlan && selectedPlan.id === planId) {
        setSelectedPlan({
          ...selectedPlan,
          summary: summary,
          lastUpdated: new Date()
        });
      }
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error saving summary:', error);
      setError('Failed to save summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // This function automatically gets the latest summary from StudyCompanion
  const getLatestSummary = () => {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      
      // Get the summary from localStorage
      // Try both possible keys (eduzen_summary and scholarai_summary) for backwards compatibility
      const summary = localStorage.getItem(`eduzen_summary_${user.uid}`) || localStorage.getItem(`scholarai_summary_${user.uid}`);
      return summary || null;
    } catch (error) {
      console.error('Error getting latest summary:', error);
      return null;
    }
  };
  
  // This function is used to retrieve the AI-generated summary from StudyCompanion
  const handleImportSummary = async (planId) => {
    try {
      if (!planId) return;
      
      setLoading(true);
      setError(null);
      
      // Try to get the summary from localStorage (where StudyCompanion stores it)
      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in to import a summary');
        setLoading(false);
        return;
      }
      
      // Get the summary from localStorage
      // Try both possible keys (eduzen_summary and scholarai_summary) for backwards compatibility
      const summary = localStorage.getItem(`eduzen_summary_${user.uid}`) || localStorage.getItem(`scholarai_summary_${user.uid}`);
      
      if (!summary) {
        setError('No AI-generated summary found. Please analyze a document in Study Companion first.');
        setLoading(false);
        return;
      }
      
      // Save the summary to the study plan
      await handleSaveSummary(planId, summary);
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error importing summary:', error);
      setError('Failed to import summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handler for generating a new quiz
  const handleGenerateNewQuiz = async (planId, questionCount = 5) => {
    // Ensure questionCount is a valid number
    const numQuestions = parseInt(questionCount) || 5;
    console.log(`Generating quiz with ${numQuestions} questions for plan ${planId}`);
    
    try {
      if (!planId) return;
      
      setIsGeneratingQuiz(true);
      setError(null);
      
      // Find the plan to generate a quiz for
      const plan = studyPlans.find(p => p.id === planId);
      if (!plan) {
        setError('Could not find study plan');
        setIsGeneratingQuiz(false);
        return;
      }
      
      // Generate content for the quiz based on the plan content
      // This is a simplified example - in a real app, you might use an AI service
      // or have a more sophisticated quiz generation algorithm
      const quizContent = [];
      
      // Create sample questions based on the study plan content
      const topics = [];
      
      // Extract topics from days and sessions
      if (plan.days && Array.isArray(plan.days)) {
        plan.days.forEach(day => {
          if (day && day.sessions && Array.isArray(day.sessions)) {
            day.sessions.forEach(session => {
              if (session && session.title) {
                topics.push({
                  title: session.title,
                  description: session.description || ''
                });
              }
            });
          }
        });
      }
      
      // If we have a summary, use that as well
      if (plan.summary) {
        topics.push({
          title: 'Summary',
          description: plan.summary
        });
      }
      
      // Generate simple quiz questions
      // Make sure we generate exactly the requested number
      const requestedCount = numQuestions; // Use the validated count from above
      console.log(`Attempting to generate ${requestedCount} questions`);
      
      // Clear any existing quiz content
      quizContent.length = 0;
      
      for (let i = 0; i < requestedCount; i++) {
        // Pick a random topic
        const topic = topics[Math.floor(Math.random() * topics.length)];
        
        if (topic) {
          // Create options array
          const options = [
            `Understanding ${topic.title} concepts`,
            `Applying ${topic.title} in practice`,
            `Analyzing ${topic.title} components`,
            `Evaluating ${topic.title} effectiveness`
          ];
          
          // Randomly select the correct answer index (0-3)
          const correctAnswerIndex = Math.floor(Math.random() * 4);
          
          const question = {
            question: `What is the main focus of ${topic.title}?`,
            options: options,
            answer: options[correctAnswerIndex] // Set the randomly selected option as the answer
          };
          
          quizContent.push(question);
        } else {
          // Fallback question if no topics are available
          // Create options array
          const options = [
            'Understanding key concepts',
            'Practical application',
            'Critical analysis',
            'Evaluation of outcomes'
          ];
          
          // Randomly select the correct answer index (0-3)
          const correctAnswerIndex = Math.floor(Math.random() * 4);
          
          const question = {
            question: `Question ${i + 1}: What is the most important concept in this study plan?`,
            options: options,
            answer: options[correctAnswerIndex] // Set the randomly selected option as the answer
          };
          
          quizContent.push(question);
        }
      }
      
      console.log(`Generated ${quizContent.length} questions`);
      
      // Ensure we have exactly the requested number of questions
      if (quizContent.length !== requestedCount) {
        console.warn(`Warning: Generated ${quizContent.length} questions instead of the requested ${requestedCount}`);
      }
      
      // Limit to exactly the requested number if we somehow generated more
      if (quizContent.length > requestedCount) {
        quizContent.length = requestedCount;
        console.log(`Limited quiz to ${requestedCount} questions as requested`);
      }
      
      // Update the document in Firestore
      await updateDoc(doc(db, 'studyPlans', planId), {
        quiz: quizContent,
        lastUpdated: new Date()
      });
      
      // Update the local state
      setStudyPlans(prevPlans => 
        prevPlans.map(plan => 
          plan.id === planId 
            ? { ...plan, quiz: quizContent, lastUpdated: new Date() } 
            : plan
        )
      );
      
      // Update the selected plan if it's the one being edited
      if (selectedPlan && selectedPlan.id === planId) {
        setSelectedPlan({
          ...selectedPlan,
          quiz: quizContent,
          lastUpdated: new Date()
        });
      }
      
      // Reset quiz state
      setQuizAnswers({});
      setHasSubmittedQuiz(false);
      setQuizScore(null);
      setPlanQuiz(quizContent);
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error generating quiz:', error);
      setError('Failed to generate quiz. Please try again.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };
  
  // Handler for submitting quiz answers
  const handleSubmitQuiz = (questions) => {
    try {
      if (!questions || !Array.isArray(questions) || questions.length === 0) return;
      
      // Calculate the score
      let correctAnswers = 0;
      
      questions.forEach((question, index) => {
        if (quizAnswers[index] === question.answer) {
          correctAnswers++;
        }
      });
      
      const score = Math.round((correctAnswers / questions.length) * 100);
      setQuizScore(score);
      setHasSubmittedQuiz(true);
      
      // Save the latest quiz and answers to localStorage
      const user = auth.currentUser;
      if (user) {
        // Save the quiz questions and user's answers
        localStorage.setItem(`scholarai_latest_quiz_${user.uid}`, JSON.stringify(questions));
        localStorage.setItem(`scholarai_latest_quiz_answers_${user.uid}`, JSON.stringify(quizAnswers));
        
        // Update the state for immediate display
        setLatestQuiz(questions);
        setLatestQuizAnswers(quizAnswers);
      }
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz. Please try again.');
    }
  };
  
  // Function to refresh the quiz display
  const refreshQuizDisplay = () => {
    loadLatestQuiz();
    // Scroll to quiz results after a short delay to ensure they're loaded
    setTimeout(() => {
      if (quizResultsRef.current) {
        quizResultsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  };
  
  // Function to open the quiz dialog
  const openQuizDialog = () => {
    setQuizDialogOpen(true);
  };

  // Function to close the quiz dialog
  const closeQuizDialog = () => {
    setQuizDialogOpen(false);
  };

  // Function to clear the latest quiz and start a new one
  const handleTakeNewQuiz = () => {
    const questionCount = parseInt(quizQuestionCount) || 5;
    console.log(`Taking new quiz with ${questionCount} questions`);
    closeQuizDialog();
    
    const user = auth.currentUser;
    if (user) {
      // Clear the latest quiz from localStorage
      localStorage.removeItem(`scholarai_latest_quiz_${user.uid}`);
      localStorage.removeItem(`scholarai_latest_quiz_answers_${user.uid}`);
      
      // Clear the state
      setLatestQuiz(null);
      setLatestQuizAnswers({});
      
      // Reset the quiz state
      setQuizAnswers({});
      setHasSubmittedQuiz(false);
      setQuizScore(null);
      
      // If there's a selected plan with a quiz, use that, otherwise generate a new one
      if (selectedPlan && selectedPlan.quiz && selectedPlan.quiz.length > 0 && false) { // Disabled this path to always generate a new quiz
        // Switch to the existing quiz in the plan
        setActiveTab(2); // Ensure we're on the quiz tab
      } else if (selectedPlan) {
        // Generate a new quiz with the specified number of questions
        handleGenerateNewQuiz(selectedPlan.id, questionCount);
      }
    }
  };
  
  // Function to handle quiz question count change
  const handleQuizQuestionCountChange = (event, newValue) => {
    console.log(`Quiz question count changed to: ${newValue}`);
    setQuizQuestionCount(newValue);
  };
  
  // Function to handle quiz submission and scroll to results
  const handleQuizSubmission = () => {
    // Scroll to quiz results after a short delay to ensure they're loaded
    setTimeout(() => {
      if (quizResultsRef.current) {
        quizResultsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  };
  
  // Function to retake the current quiz
  const handleRetakeQuiz = () => {
    // Reset the quiz state to make it answerable again
    setLatestQuizAnswers({});
    setHasSubmittedQuiz(false);
    setQuizScore(null);
    
    // Scroll to the top of the quiz results
    setTimeout(() => {
      if (quizResultsRef.current) {
        quizResultsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  };

  const handleSubmitLatestQuiz = () => {
    // Mark the quiz as submitted
    setHasSubmittedQuiz(true);
    
    // Scroll to the top of the quiz results
    setTimeout(() => {
      if (quizResultsRef.current) {
        quizResultsRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  };
  
  // Timer functions
  const startTimer = (dayIndex, sessionIndex, duration) => {
    // Convert duration from minutes to seconds
    const durationInSeconds = duration * 60;
    
    // Set the active timer
    setActiveTimer({
      dayIndex,
      sessionIndex,
      timeLeft: durationInSeconds,
      duration: durationInSeconds
    });
    
    // Clear any existing interval
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    // Create new interval
    const interval = setInterval(() => {
      setActiveTimer(prev => {
        if (!prev || prev.timeLeft <= 0) {
          clearInterval(interval);
          return null;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    
    // Store the interval
    setTimerInterval(interval);
    setIsPaused(false);
  };
  
  const pauseTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsPaused(true);
  };
  
  const resumeTimer = () => {
    if (activeTimer) {
      // Create new interval
      const interval = setInterval(() => {
        setActiveTimer(prev => {
          if (!prev || prev.timeLeft <= 0) {
            clearInterval(interval);
            return null;
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
      
      // Store the interval
      setTimerInterval(interval);
      setIsPaused(false);
    }
  };
  
  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    // When stopped, mark the session as completed if the user wishes
    if (activeTimer) {
      // Only show confirmation if the timer didn't finish naturally
      if (activeTimer.timeLeft > 0) {
        const shouldComplete = window.confirm('Would you like to mark this session as completed?');
        
        if (shouldComplete) {
          handleToggleSession(activeTimer.dayIndex, activeTimer.sessionIndex);
        }
      } else {
        // Timer completed naturally, automatically mark as completed
        handleToggleSession(activeTimer.dayIndex, activeTimer.sessionIndex);
      }
    }
    
    setActiveTimer(null);
    setIsPaused(false);
  };
  
  // Clean up timer interval on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  return (
    <Box sx={{ mt: 6 }}>
      {/* Quiz Options Dialog */}
      <Dialog open={quizDialogOpen} onClose={closeQuizDialog}>
        <DialogTitle>Quiz Options</DialogTitle>
        <DialogContent>
          <DialogContentText>
            How many questions would you like in your quiz?
          </DialogContentText>
          <Box sx={{ mt: 3, px: 2 }}>
            <Slider
              value={quizQuestionCount}
              onChange={handleQuizQuestionCountChange}
              aria-labelledby="quiz-question-count-slider"
              valueLabelDisplay="auto"
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 15, label: '15' },
                { value: 20, label: '20' }
              ]}
              min={1}
              max={20}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2">1 Question</Typography>
              <Typography variant="body2">{quizQuestionCount} Questions</Typography>
              <Typography variant="body2">20 Questions</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeQuizDialog}>Cancel</Button>
          <Button onClick={handleTakeNewQuiz} variant="contained" color="primary">
            Generate Quiz
          </Button>
        </DialogActions>
      </Dialog>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h6" sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: '#4285F4'
        }}>
          <HistoryIcon sx={{ mr: 1 }} />
          Training Plan History
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {auth.currentUser ? (
            <Typography variant="caption" color="success.main" sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: 'rgba(52, 168, 83, 0.1)',
              px: 1,
              py: 0.5,
              borderRadius: '12px'
            }}>
              Logged in as {auth.currentUser.displayName || auth.currentUser.email}
            </Typography>
          ) : (
            <Typography variant="caption" color="error" sx={{ 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: 'rgba(234, 67, 53, 0.1)',
              px: 1,
              py: 0.5,
              borderRadius: '12px'
            }}>
              Not logged in
            </Typography>
          )}
          
          {studyPlans.length > 0 && (
            <Button 
              variant="outlined" 
              size="small"
              onClick={handleOpenClearHistoryDialog}
              sx={{ borderRadius: '20px' }}
            >
              Clear History
            </Button>
          )}
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : studyPlans.length === 0 ? (
        <Card sx={{ 
          borderRadius: '20px', 
          p: 3, 
          textAlign: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.02)'
        }}>
          <Typography color="text.secondary">
            No study plans saved yet. Create a study plan to see it here.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {studyPlans.map((plan) => (
            <Grid item xs={12} md={6} key={`${plan.id}-${plan.progress || 0}-${plan.lastUpdated ? plan.lastUpdated.toString() : 'no-date'}`}>
              <Card sx={{ 
                borderRadius: '20px',
                overflow: 'hidden',
                bgcolor: 'rgba(240, 247, 255, 0.5)',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
                }
              }}>
                <CardContent sx={{ p: 0 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    bgcolor: 'rgba(66, 133, 244, 0.1)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      {editingPlanId === plan.id ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <TextField
                            autoFocus
                            value={newPlanName}
                            onChange={(e) => setNewPlanName(e.target.value)}
                            size="small"
                            sx={{ mr: 1, flexGrow: 1 }}
                            InputProps={{
                              sx: { fontWeight: 500, fontSize: '1.25rem' }
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEditedName(plan.id);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()} // Prevent event bubbling
                          />
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent event bubbling
                              handleSaveEditedName(plan.id);
                            }} 
                            color="primary"
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent event bubbling
                              setEditingPlanId(null);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              cursor: 'pointer',
                              '&:hover': { 
                                bgcolor: 'rgba(66, 133, 244, 0.08)', 
                                borderRadius: '4px',
                                p: 0.5
                              },
                              pl: 0.5
                            }}
                            onClick={(e) => {
                              // Only start editing if not in editing mode
                              if (!editingPlanId) {
                                setNewPlanName(plan.name);
                                setEditingPlanId(plan.id);
                              }
                            }}
                          >
                            <Typography variant="h6" sx={{ fontWeight: 500 }}>
                              {plan.name}
                            </Typography>
                            <IconButton 
                              size="small" 
                              sx={{ ml: 1, opacity: 0.7 }}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent event bubbling
                                setSelectedPlan(plan);
                                setNewPlanName(plan.name);
                                setEditingPlanId(plan.id);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ 
                        display: 'inline-block',
                        bgcolor: 'rgba(66, 133, 244, 0.2)',
                        px: 1,
                        py: 0.5,
                        borderRadius: '12px',
                        fontWeight: 500
                      }}>
                        {formatDate(plan.createdAt)}
                      </Typography>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setActiveTab(0);
                        }}
                        sx={{ ml: 1, minWidth: 0, px: 1 }}
                      >
                        View
                      </Button>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setPlanToDelete(plan);
                          setDeleteDialogOpen(true);
                        }}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Progress
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={plan.progress || plan.lastProgress || 0} 
                        sx={{ 
                          flexGrow: 1, 
                          mr: 1,
                          height: 8,
                          borderRadius: 4
                        }} 
                      />
                      <Typography variant="body1" color="primary" fontWeight="bold">
                        {plan.progress || plan.lastProgress || 0}%
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" sx={{ 
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {plan.overview || 'No overview available'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {plan.timePerDay || 0} minutes/day
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {plan.days?.length || 0} days
                        </Typography>
                      </Box>
                      
                      {/* Time spent tracking is kept internally but not displayed */}
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Saved on {formatTime(plan.lastUpdated || plan.updatedAt || plan.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => setSelectedPlan(plan)}
                      sx={{ 
                        mt: 2,
                        borderRadius: '20px'
                      }}
                    >
                      View Details
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Plan Details Dialog */}
      {selectedPlan && (
        <Dialog
          open={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">{selectedPlan.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="primary" sx={{ mr: 2 }}>
                  Progress: {selectedPlan.progress || 0}%
                </Typography>
                <IconButton onClick={() => setSelectedPlan(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
          </DialogTitle>
          
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              aria-label="study plan tabs"
              variant="fullWidth"
            >
              <Tab 
                label="Study Plan" 
                icon={<PlaylistAddCheckIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="Summary" 
                icon={<SummarizeIcon />} 
                iconPosition="start"
              />
              <Tab 
                label="Quiz" 
                icon={<QuizIcon />} 
                iconPosition="start"
              />
            </Tabs>
          </Box>
          
          <DialogContent dividers>
            {/* Study Plan Tab */}
            {activeTab === 0 && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Progress: {selectedPlan.progress || selectedPlan.lastProgress || 0}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={selectedPlan.progress || selectedPlan.lastProgress || 0} 
                    sx={{ 
                      height: 10,
                      borderRadius: 5
                    }} 
                  />
                </Box>
                
                <List>
                  {selectedPlan.days && Array.isArray(selectedPlan.days) && 
                  selectedPlan.days.map((day, dayIndex) => (
                    <React.Fragment key={dayIndex}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500, mt: dayIndex > 0 ? 2 : 0 }}>
                        Day {day?.day || dayIndex + 1}: {day?.date || 'No date'}
                      </Typography>
                      
                      {day?.sessions && Array.isArray(day.sessions) && 
                      day.sessions.map((session, sessionIndex) => (
                        <ListItem key={sessionIndex} dense>
                          <ListItemIcon>
                            <Checkbox
                              edge="start"
                              checked={session?.completed || false}
                              onChange={() => handleToggleSession(dayIndex, sessionIndex)}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={session?.title || 'Untitled Session'}
                            secondary={
                              <Typography variant="body2" component="span">
                                {session?.description || 'No description'}
                              </Typography>
                            }
                            sx={{
                              '& .MuiListItemText-primary': {
                                textDecoration: session?.completed ? 'line-through' : 'none',
                                color: session?.completed ? 'text.disabled' : 'text.primary'
                              },
                              mr: 2
                            }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                            {activeTimer && activeTimer.dayIndex === dayIndex && activeTimer.sessionIndex === sessionIndex ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(66, 133, 244, 0.1)', p: 1, borderRadius: '12px' }}>
                                <Typography variant="body2" fontWeight="bold" fontFamily="monospace" sx={{ mr: 1 }}>
                                  {Math.floor(activeTimer.timeLeft / 60).toString().padStart(2, '0')}:{(activeTimer.timeLeft % 60).toString().padStart(2, '0')}
                                </Typography>
                                <Box>
                                  {isPaused ? (
                                    <IconButton size="small" onClick={() => resumeTimer()} color="primary">
                                      <PlayArrowIcon fontSize="small" />
                                    </IconButton>
                                  ) : (
                                    <IconButton size="small" onClick={() => pauseTimer()} color="primary">
                                      <PauseIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                  <IconButton size="small" onClick={() => stopTimer()} color="error">
                                    <StopIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Box>
                            ) : (
                              <Button 
                                variant="outlined" 
                                size="small" 
                                startIcon={<TimerIcon />}
                                onClick={() => startTimer(dayIndex, sessionIndex, session?.duration || 30)}
                                disabled={session?.completed || activeTimer !== null}
                                sx={{ borderRadius: '20px' }}
                              >
                                {session?.duration || 30} min
                              </Button>
                            )}
                          </Box>
                        </ListItem>
                      ))}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}
            
            {/* Summary Tab */}
            {activeTab === 1 && (
              <Box>
                {selectedPlan.summary ? (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2, color: '#4285F4' }}>
                      AI-Generated Summary
                    </Typography>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 3, 
                        mb: 3, 
                        bgcolor: 'rgba(66, 133, 244, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(66, 133, 244, 0.2)'
                      }}
                    >
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                        {selectedPlan.summary}
                      </Typography>
                    </Paper>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => handleImportSummary(selectedPlan.id)}
                        startIcon={<RefreshIcon />}
                      >
                        Import Latest Summary
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                      No AI-generated summary available for this study plan.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Import the summary from your latest document analysis in Study Companion.
                    </Typography>
                    <Button 
                      variant="contained" 
                      onClick={() => handleImportSummary(selectedPlan.id)}
                      startIcon={<SummarizeIcon />}
                    >
                      Import Summary
                    </Button>
                  </Box>
                )}
              </Box>
            )}
            
            {/* Quiz Tab */}
            {activeTab === 2 && (
              <Box>
                {/* Button for taking a new quiz */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={openQuizDialog}
                    startIcon={<RefreshIcon />}
                  >
                    Take New Quiz
                  </Button>
                </Box>
                
                {/* Display the latest quiz if available */}
                {latestQuiz && latestQuiz.length > 0 ? (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 3, color: '#4285F4' }} ref={quizResultsRef}>
                      Latest Quiz Results
                    </Typography>
                    
                    {/* Calculate and display quiz score */}
                    {(() => {
                      let correctCount = 0;
                      let totalQuestions = latestQuiz.length;
                      
                      console.log('Checking answers:', latestQuizAnswers);
                      console.log('Against questions:', latestQuiz);
                      
                      latestQuiz.forEach((question, idx) => {
                        const userAnswer = latestQuizAnswers[idx];
                        const correctAnswer = question.answer;
                        
                        console.log(`Question ${idx+1}: User answered "${userAnswer}", correct is "${correctAnswer}"`);
                        
                        if (userAnswer === correctAnswer) {
                          correctCount++;
                        }
                      });
                      
                      const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
                      
                      return (
                        <Alert 
                          severity={scorePercentage >= 70 ? "success" : "warning"} 
                          sx={{ mb: 3 }}
                        >
                          <Typography variant="h6">
                            Quiz Score: {scorePercentage}%
                          </Typography>
                          <Typography variant="body2">
                            {scorePercentage >= 70 
                              ? "Great job! You've mastered this material." 
                              : "Keep studying! You'll improve next time."}
                          </Typography>
                        </Alert>
                      );
                    })()} 
                    
                    {latestQuiz.map((question, index) => (
                      <Paper 
                        key={index} 
                        elevation={0} 
                        sx={{ 
                          p: 3, 
                          mb: 3, 
                          bgcolor: 'rgba(66, 133, 244, 0.05)',
                          borderRadius: '12px',
                          border: '1px solid rgba(66, 133, 244, 0.2)'
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
                          {index + 1}. {question.question}
                        </Typography>
                        
                        <Box sx={{ ml: 2 }}>
                          {question.options.map((option, optIndex) => (
                            <Box 
                              key={optIndex} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                mb: 1,
                                p: 1,
                                borderRadius: '8px',
                                bgcolor: hasSubmittedQuiz && latestQuizAnswers[index] === option ? 
                                  (option === question.answer ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)') : 
                                  latestQuizAnswers[index] === option ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
                                border: hasSubmittedQuiz && latestQuizAnswers[index] === option ? 
                                  (option === question.answer ? '1px solid rgba(76, 175, 80, 0.5)' : '1px solid rgba(244, 67, 54, 0.5)') : 
                                  latestQuizAnswers[index] === option ? '1px solid rgba(66, 133, 244, 0.5)' : '1px solid transparent'
                              }}
                            >
                              <Radio 
                                checked={latestQuizAnswers[index] === option}
                                disabled={hasSubmittedQuiz}
                                onChange={() => {
                                  if (!hasSubmittedQuiz) {
                                    setLatestQuizAnswers(prev => ({
                                      ...prev,
                                      [index]: option
                                    }));
                                  }
                                }}
                                size="small"
                              />
                              <Typography variant="body1">
                                {option}
                              </Typography>
                              {hasSubmittedQuiz && option === question.answer && (
                                <Typography 
                                  variant="body2" 
                                  color="success.main"
                                  sx={{ ml: 1, fontWeight: 'bold' }}
                                >
                                  (Correct Answer)
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                        
                        {hasSubmittedQuiz && latestQuizAnswers[index] && latestQuizAnswers[index] !== question.answer && (
                          <Box sx={{ mt: 2, ml: 2, p: 1, bgcolor: 'rgba(244, 67, 54, 0.05)', borderRadius: '8px' }}>
                            <Typography variant="body2" color="error.main">
                              Your answer was incorrect. The correct answer is: <strong>{question.answer}</strong>
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    ))}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                      {!hasSubmittedQuiz && (
                        <Button 
                          variant="contained" 
                          color="primary"
                          onClick={() => setHasSubmittedQuiz(true)}
                          startIcon={<CheckCircleIcon />}
                          disabled={Object.keys(latestQuizAnswers).length !== latestQuiz.length}
                        >
                          Submit Answers
                        </Button>
                      )}
                      <Button 
                        variant="outlined" 
                        onClick={handleRetakeQuiz}
                        startIcon={<RefreshIcon />}
                        sx={{ ml: 'auto' }}
                      >
                        {hasSubmittedQuiz ? 'Retake This Quiz' : 'Reset Answers'}
                      </Button>
                    </Box>
                  </Box>
                ) : selectedPlan.quiz && selectedPlan.quiz.length > 0 ? (
                  <Box>
                    {hasSubmittedQuiz && quizScore !== null ? (
                      <Box sx={{ mb: 3 }}>
                        <Alert severity={quizScore >= 70 ? "success" : "warning"} sx={{ mb: 2 }}>
                          <Typography variant="h6">
                            Quiz Score: {quizScore}%
                          </Typography>
                          <Typography variant="body2">
                            {quizScore >= 70 
                              ? "Great job! You've mastered this material." 
                              : "Keep studying! You'll improve next time."}
                          </Typography>
                        </Alert>
                        
                        <Button 
                          variant="outlined" 
                          startIcon={<RefreshIcon />}
                          onClick={() => {
                            setQuizAnswers({});
                            setHasSubmittedQuiz(false);
                            setQuizScore(null);
                          }}
                          sx={{ mr: 2 }}
                        >
                          Retake Quiz
                        </Button>
                        
                        <Button 
                          variant="outlined"
                          onClick={() => handleGenerateNewQuiz(selectedPlan.id)}
                          startIcon={<RefreshIcon />}
                        >
                          Generate New Quiz
                        </Button>
                      </Box>
                    ) : (
                      <Box>
                        {selectedPlan.quiz.map((question, index) => (
                          <Box key={index} sx={{ mb: 4 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                              {index + 1}. {question.question}
                            </Typography>
                            
                            <FormControl component="fieldset" sx={{ ml: 2 }}>
                              <RadioGroup
                                value={quizAnswers[index] || ''}
                                onChange={(e) => {
                                  setQuizAnswers(prev => ({
                                    ...prev,
                                    [index]: e.target.value
                                  }));
                                }}
                              >
                                {question.options.map((option, optIndex) => (
                                  <FormControlLabel 
                                    key={optIndex} 
                                    value={option} 
                                    control={<Radio />} 
                                    label={option} 
                                    disabled={hasSubmittedQuiz}
                                  />
                                ))}
                              </RadioGroup>
                            </FormControl>
                            
                            {hasSubmittedQuiz && (
                              <Box sx={{ mt: 1, ml: 2 }}>
                                <Typography 
                                  variant="body2" 
                                  color={quizAnswers[index] === question.answer ? "success.main" : "error.main"}
                                  fontWeight="bold"
                                >
                                  {quizAnswers[index] === question.answer 
                                    ? "✓ Correct!" 
                                    : `✗ Incorrect. The correct answer is: ${question.answer}`}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        ))}
                        
                        {!hasSubmittedQuiz && (
                          <Button 
                            variant="contained" 
                            color="primary"
                            onClick={() => handleSubmitQuiz(selectedPlan.quiz)}
                            disabled={Object.keys(quizAnswers).length < selectedPlan.quiz.length}
                            sx={{ mt: 2 }}
                          >
                            Submit Answers
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                      No quiz available for this study plan.
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <FormControl sx={{ minWidth: 120, mr: 2 }}>
                        <InputLabel id="quiz-questions-label">Questions</InputLabel>
                        <Select
                          labelId="quiz-questions-label"
                          value={numQuizQuestions}
                          label="Questions"
                          onChange={(e) => setNumQuizQuestions(e.target.value)}
                        >
                          <MenuItem value={3}>3 Questions</MenuItem>
                          <MenuItem value={5}>5 Questions</MenuItem>
                          <MenuItem value={10}>10 Questions</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <Button 
                        variant="contained" 
                        onClick={() => handleGenerateNewQuiz(selectedPlan.id)}
                        disabled={isGeneratingQuiz}
                      >
                        {isGeneratingQuiz ? (
                          <>
                            <CircularProgress size={24} sx={{ mr: 1 }} />
                            Generating...
                          </>
                        ) : (
                          'Generate Quiz'
                        )}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button 
              variant="contained" 
              onClick={() => {
                // Calculate the current progress before closing
                if (selectedPlan && selectedPlan.days) {
                  const newProgress = calculateProgress(selectedPlan.days);
                  console.log('Final progress on update:', newProgress);
                  

                  // Create a new plan object with updated progress
                  const updatedPlan = {
                    ...selectedPlan,
                    progress: newProgress,
                    lastProgress: newProgress,
                    lastUpdated: new Date()
                  };
                  
                  // Force a re-render by setting the selected plan to null first
                  setSelectedPlan(null);
                  
                  // Update the progress in the local state for immediate feedback
                  setStudyPlans(prevPlans => {
                    // Create a new array to ensure React detects the change
                    const newPlans = prevPlans.map(plan => 
                      plan.id === updatedPlan.id 

                        ? { 
                            ...plan, 
                            progress: newProgress, 
                            lastProgress: newProgress,
                            lastUpdated: new Date() 
                          } 
                        : plan

                    );
                    console.log('Updated study plans with new progress:', newPlans);
                    return newPlans;
                  });

                  
                  // Update the global progress context
                  updateStudyPlanProgress(selectedPlan.id, newProgress);
                  
                  // Update the progress in Firestore
                  updateDoc(doc(db, 'studyPlans', selectedPlan.id), {
                    lastProgress: newProgress,
                    progress: newProgress,
                    lastUpdated: new Date()
                  });

                  
                  // Force a refresh of the study plans list
                  setTimeout(() => {
                    fetchStudyPlans();
                  }, 100);
                } else {
                  // Close the dialog if no plan is selected
                  setSelectedPlan(null);
                }

              }}
              startIcon={<SaveIcon />}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Edit Name Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Plan Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Plan Name"
            type="text"
            fullWidth
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditName} color="primary">Save</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Study Plan</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this study plan? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeletePlan} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Clear History confirmation dialog */}
      <Dialog
        open={clearHistoryDialogOpen}
        onClose={handleCloseClearHistoryDialog}
        aria-labelledby="clear-history-dialog-title"
        PaperProps={{
          sx: { borderRadius: '20px' }
        }}
      >
        <DialogTitle id="clear-history-dialog-title">
          Clear All Study Plans
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete all your study plans? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClearHistoryDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleClearHistory} color="error" variant="contained">
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudyPlanHistory;
