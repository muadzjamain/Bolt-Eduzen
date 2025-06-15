import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  IconButton
} from '@mui/material';
import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import { getCurrentUser } from '../services/auth';

const ShareScreen = () => {
  // State for popup window
  const [popupWindow, setPopupWindow] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Get current user on component mount
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
    
    return () => {
      // Clean up on unmount
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
    };
  }, [popupWindow]);
  
  // Open chatbot directly without screen sharing
  
  // Open chatbot in a popup window
  const openChatbotPopup = () => {
    // Close any existing popup
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close();
    }
    
    // Calculate position for center of screen
    const width = 400;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    // Open the popup
    const popup = window.open(
      '/chatbot-popup',
      'EduZen AI Chatbot',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    if (popup) {
      setPopupWindow(popup);
      
      // Handle popup close
      popup.onbeforeunload = () => {
        setPopupWindow(null);
      };
    } else {
      // Popup was blocked
      console.error('Popup window was blocked. Please allow popups for this site.');
    }
  };
  
  // No screen sharing or screenshot functions needed
  
  return (
    <Container maxWidth="lg" sx={{ mt: 12, mb: 8 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton 
          component={Link} 
          to="/study-hub" 
          sx={{ mr: 2 }}
          aria-label="Back to Study Hub"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          AI Screen Assistant
        </Typography>
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" paragraph>
          Get real-time AI analysis of your screen content. The AI assistant will open in a separate window and help you analyze what you're viewing.
        </Typography>
      </Box>
      
      {/* Simplified Controls */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E9ECEF', borderRadius: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          AI Assistant Controls
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<ScreenShareIcon />}
            onClick={openChatbotPopup}
          >
            Share Screen
          </Button>
        </Box>
      </Paper>
      
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #E9ECEF', borderRadius: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          How It Works
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          When you click the button above, a new window will open with our AI assistant. You'll be prompted to share your screen, and then you can ask questions about what you're viewing.
        </Typography>
      </Paper>
    </Container>
  );
};

export default ShareScreen;
