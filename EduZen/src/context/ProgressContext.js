import React, { createContext, useState, useContext, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Create the context
const ProgressContext = createContext();

// Create a provider component
export const ProgressProvider = ({ children }) => {
  const [studyPlanProgress, setStudyPlanProgress] = useState({});
  const [chatHistory, setChatHistory] = useState([]);
  const [overallProgress, setOverallProgress] = useState({
    studyPlansCompleted: 0,
    totalInteractions: 0,
    lastActive: null
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // If user logs out, clear the progress and chat history
      if (!currentUser) {
        // Clear all state
        setStudyPlanProgress({});
        setChatHistory([]);
        setOverallProgress({
          studyPlansCompleted: 0,
          totalInteractions: 0,
          lastActive: null
        });
        
        // Clear ALL localStorage data - including any user-specific keys
        // This ensures no data persists after logout
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('scholarai_')) {
            localStorage.removeItem(key);
          }
        });
        
        console.log('User logged out - cleared all progress data');
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Load cached progress from localStorage on initial load - only if user is logged in
  useEffect(() => {
    // Only load from localStorage if user is logged in
    if (user) {
      try {
        console.log('Loading cached progress for user:', user.uid);
        
        // Load study plan progress
        const cachedProgress = localStorage.getItem(`scholarai_study_progress_${user.uid}`);
        if (cachedProgress) {
          const parsedProgress = JSON.parse(cachedProgress);
          console.log('Loaded cached study progress:', parsedProgress);
          setStudyPlanProgress(parsedProgress);
        }
        
        // Load chat history
        const cachedChatHistory = localStorage.getItem(`scholarai_chat_history_${user.uid}`);
        if (cachedChatHistory) {
          const parsedHistory = JSON.parse(cachedChatHistory);
          console.log('Loaded cached chat history, count:', parsedHistory.length);
          setChatHistory(parsedHistory);
        }
        
        // Load overall progress
        const cachedOverallProgress = localStorage.getItem(`scholarai_overall_progress_${user.uid}`);
        if (cachedOverallProgress) {
          const parsedOverall = JSON.parse(cachedOverallProgress);
          console.log('Loaded cached overall progress:', parsedOverall);
          setOverallProgress(parsedOverall);
        }
      } catch (error) {
        console.error('Error loading cached data:', error);
      }
    }
  }, [user]);

  // Setup real-time listeners for user data when authenticated
  useEffect(() => {
    if (!user) return;
    
    try {
      console.log('Setting up global progress listeners for user:', user.uid);
      setLoading(true);
      
      // 1. Listen for study plans
      const studyPlansQuery = query(
        collection(db, 'studyPlans'),
        where('userId', '==', user.uid)
      );
      
      const studyPlansUnsubscribe = onSnapshot(studyPlansQuery, (snapshot) => {
        const progressData = {};
        let completedPlans = 0;
        
        snapshot.forEach((doc) => {
          try {
            const data = doc.data();
            if (data) {
              // Calculate progress if not already stored
              let progress = data.lastProgress;
              
              if (progress === undefined && data.days) {
                progress = calculateProgress(data.days);
              }
              
              // Count completed plans (90% or more progress)
              if (progress >= 90) {
                completedPlans++;
              }
              
              progressData[doc.id] = {
                id: doc.id,
                name: data.name || 'Unnamed Plan',
                progress: progress || 0,
                lastUpdated: data.lastUpdated || new Date()
              };
            }
          } catch (error) {
            console.error('Error processing study plan for progress:', error);
          }
        });
        
        setStudyPlanProgress(progressData);
        
        // Update overall progress with completed plans count
        setOverallProgress(prev => ({
          ...prev,
          studyPlansCompleted: completedPlans,
          lastActive: new Date()
        }));
        
        // Cache the progress in localStorage with user-specific key
        if (user) {
          try {
            localStorage.setItem(`scholarai_study_progress_${user.uid}`, JSON.stringify(progressData));
            console.log('Saved study progress to localStorage:', Object.keys(progressData).length, 'plans');
            
            // Also save overall progress
            const updatedOverall = {
              ...overallProgress,
              studyPlansCompleted: completedPlans,
              lastActive: new Date()
            };
            localStorage.setItem(`scholarai_overall_progress_${user.uid}`, JSON.stringify(updatedOverall));
          } catch (storageError) {
            console.error('Error caching progress:', storageError);
          }
        }
      }, (error) => {
        console.error('Error in study plans listener:', error);
      });
      
      // 2. Listen for chat history
      const chatHistoryQuery = query(
        collection(db, 'chatHistory'),
        where('userId', '==', user.uid)
      );
      
      const chatHistoryUnsubscribe = onSnapshot(chatHistoryQuery, (snapshot) => {
        try {
          const messages = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data) {
              messages.push({
                id: doc.id,
                ...data
              });
            }
          });
          
          // Sort by timestamp
          const sortedMessages = messages.sort((a, b) => {
            const timeA = a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate() : new Date(0);
            const timeB = b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate() : new Date(0);
            return timeA - timeB;
          });
          
          setChatHistory(sortedMessages);
          
          // Update overall progress with total interactions
          setOverallProgress(prev => ({
            ...prev,
            totalInteractions: sortedMessages.length,
            lastActive: new Date()
          }));
          
          // Cache in localStorage with user-specific key
          if (user) {
            localStorage.setItem(`scholarai_chat_history_${user.uid}`, JSON.stringify(sortedMessages));
          }
        } catch (error) {
          console.error('Error processing chat history:', error);
        }
      }, (error) => {
        console.error('Error in chat history listener:', error);
      });
      
      // 3. Get or create user progress document
      const setupUserProgress = async () => {
        try {
          const userProgressRef = doc(db, 'userProgress', user.uid);
          const userProgressDoc = await getDoc(userProgressRef);
          
          if (userProgressDoc.exists()) {
            // Update last active timestamp
            await setDoc(userProgressRef, {
              lastActive: serverTimestamp()
            }, { merge: true });
          } else {
            // Create new user progress document
            await setDoc(userProgressRef, {
              userId: user.uid,
              studyPlansCompleted: 0,
              totalInteractions: 0,
              lastActive: serverTimestamp(),
              createdAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error('Error setting up user progress:', error);
        }
      };
      
      setupUserProgress();
      setLoading(false);
      
      return () => {
        studyPlansUnsubscribe();
        chatHistoryUnsubscribe();
      };
    } catch (error) {
      console.error('Error setting up progress listeners:', error);
      setLoading(false);
    }
  }, [user]);

  // Helper function to calculate progress
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
  
  // Update study plan progress
  const updateStudyPlanProgress = (planId, newProgress) => {
    if (!user || !planId) return;
    
    // Create updated progress object
    const updatedProgress = {
      ...studyPlanProgress,
      [planId]: {
        ...studyPlanProgress[planId],
        progress: newProgress,
        lastUpdated: new Date()
      }
    };
    
    // Update local state
    setStudyPlanProgress(updatedProgress);
    
    // Save to localStorage immediately to ensure persistence on refresh
    if (user) {
      try {
        localStorage.setItem(`scholarai_study_progress_${user.uid}`, JSON.stringify(updatedProgress));
        console.log('Saved updated study progress to localStorage for plan:', planId);
      } catch (error) {
        console.error('Error updating cached progress:', error);
      }
    }
    
    // Update in Firestore if user is logged in
    if (user) {
      try {
        // Update the study plan document
        const planRef = doc(db, 'studyPlans', planId);
        setDoc(planRef, {
          lastProgress: newProgress,
          lastUpdated: serverTimestamp()
        }, { merge: true }).catch(error => {
          console.error('Error updating study plan in Firestore:', error);
        });
        
        // Update user progress document if plan is completed
        if (newProgress >= 90) {
          // Check if this plan wasn't already counted as completed
          const wasCompletedBefore = studyPlanProgress[planId]?.progress >= 90;
          
          if (!wasCompletedBefore) {
            // Create updated overall progress
            const updatedOverall = {
              ...overallProgress,
              studyPlansCompleted: overallProgress.studyPlansCompleted + 1,
              lastActive: new Date()
            };
            
            // Update local state
            setOverallProgress(updatedOverall);
            
            // Save to localStorage
            localStorage.setItem(`scholarai_overall_progress_${user.uid}`, JSON.stringify(updatedOverall));
            
            // Update in Firestore
            const userProgressRef = doc(db, 'userProgress', user.uid);
            setDoc(userProgressRef, {
              studyPlansCompleted: updatedOverall.studyPlansCompleted,
              lastActive: serverTimestamp()
            }, { merge: true }).catch(error => {
              console.error('Error updating user progress in Firestore:', error);
            });
          }
        }
      } catch (error) {
        console.error('Error updating study plan progress in Firestore:', error);
      }
    }
  };

  // Function to add a chat message to history
  const addChatMessage = async (message, isUser = true) => {
    const newMessage = {
      id: Date.now().toString(),
      content: message,
      isUser,
      timestamp: new Date()
    };
    
    // Update local state
    setChatHistory(prev => [...prev, newMessage]);
    
    // Update localStorage with user-specific key
    if (user) {
      try {
        const updatedChatHistory = [...chatHistory, newMessage];
        localStorage.setItem(`scholarai_chat_history_${user.uid}`, JSON.stringify(updatedChatHistory));
        console.log('Saved chat message to localStorage');
        
        // Update overall progress
        const updatedOverall = {
          ...overallProgress,
          totalInteractions: overallProgress.totalInteractions + 1,
          lastActive: new Date()
        };
        
        setOverallProgress(updatedOverall);
        localStorage.setItem(`scholarai_overall_progress_${user.uid}`, JSON.stringify(updatedOverall));
      } catch (error) {
        console.error('Error updating cached chat history:', error);
      }
    }
    
    return newMessage;
  };

  // Function to get progress for a specific plan
  const getProgress = (planId) => {
    return studyPlanProgress[planId]?.progress || 0;
  };

  return (
    <ProgressContext.Provider 
      value={{ 
        studyPlanProgress,
        chatHistory,
        overallProgress, 
        loading, 
        updateStudyPlanProgress, 
        getProgress,
        calculateProgress,
        addChatMessage,
        user
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

// Custom hook to use the progress context
export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

export default ProgressContext;
