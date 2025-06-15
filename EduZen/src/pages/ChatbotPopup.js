import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Typography, 
  Paper, 
  CircularProgress,
  Avatar,
  Button,
  Chip,
  Container,
  Fade
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { v4 as uuidv4 } from 'uuid';
import { getGeminiVisionResponse } from '../services/gemini';

// Styled components for chat UI
const ChatMessages = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  backgroundColor: theme.palette.background.default
}));

const MessageBubble = styled(Box)(({ theme, isUser }) => ({
  maxWidth: '80%',
  padding: '10px 16px',
  borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
  backgroundColor: isUser ? theme.palette.primary.main : theme.palette.background.paper,
  color: isUser ? 'white' : theme.palette.text.primary,
  marginBottom: '8px',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  border: isUser ? 'none' : `1px solid ${theme.palette.divider}`
}));

const ChatInputArea = styled(Box)(({ theme }) => ({
  padding: '12px',
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center'
}));

const ChatbotPopup = () => {
  // State for chat
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [apiKey] = useState(process.env.REACT_APP_GOOGLE_GEMINI_API_KEY);
  
  // Refs
  const chatEndRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Reference to parent window
  const parentWindow = window.opener;
  
  // Handle messages from parent window
  const handleMessageFromParent = useCallback((event) => {
    if (event.source !== parentWindow) return;
    
    const data = event.data;
    
    if (data.type === 'NEW_SCREENSHOT') {
      // Parent window has sent a new screenshot
      setCurrentScreenshot(data.screenshot);
      setIsSharing(true);
      
      // If this is the first screenshot, add a message
      if (!isSharing) {
        setChatHistory(prev => [
          ...prev,
          {
            id: uuidv4(),
            sender: 'ai',
            text: "I can now see your screen! Ask me anything about what you're viewing.",
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } else if (data.type === 'SCREEN_SHARING_STOPPED') {
      // Add message to chat that screen sharing has stopped
      setIsSharing(false);
      setChatHistory(prev => [
        ...prev,
        {
          id: uuidv4(),
          sender: 'ai',
          text: "Screen sharing has stopped. You can restart sharing or continue chatting about the last screenshot.",
          timestamp: new Date().toISOString()
        }
      ]);
    } else if (data.type === 'ANALYSIS_RESULT') {
      // Receive analysis response from parent window
      if (data.result) {
        const aiMessage = {
          id: uuidv4(),
          sender: 'ai',
          text: data.result,
          timestamp: new Date().toISOString()
        };
        
        setChatHistory(prev => prev.filter(msg => !msg.temporary).concat([aiMessage]));
        setChatLoading(false);
      }
    }
  }, [parentWindow, isSharing, setChatHistory, setChatLoading]);
  
  useEffect(() => {
    // Add welcome message
    setChatHistory([{
      id: uuidv4(),
      sender: 'ai',
      text: "Welcome to Gemini Screen Analysis! Ask me anything about what you're viewing on your shared screen.",
      timestamp: new Date().toISOString()
    }]);
    
    // Set up message listener to receive screenshots from parent window
    window.addEventListener('message', handleMessageFromParent);
    
    // Notify parent window that popup is ready
    if (parentWindow) {
      parentWindow.postMessage({ type: 'POPUP_READY' }, '*');
    }
    
    // Create hidden canvas for screenshots
    const canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    canvasRef.current = canvas;
    
    return () => {
      window.removeEventListener('message', handleMessageFromParent);
      if (canvasRef.current) {
        document.body.removeChild(canvasRef.current);
      }
    };
  }, [handleMessageFromParent, parentWindow]);
  
  // Scroll to bottom of chat when history changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);
  

  
  // Capture screenshot from video element
  const captureScreenshot = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Clear the canvas first
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the current video frame on the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL (base64) with higher quality
      const screenshot = canvas.toDataURL('image/jpeg', 0.9);
      
      setCurrentScreenshot(screenshot);
      return screenshot;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  };
  
  // Start screen sharing
  const startScreenSharing = async () => {
    try {
      const constraints = {
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        }
      };
      
      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          // Take initial screenshot after a short delay
          setTimeout(() => {
            const screenshot = captureScreenshot();
            if (screenshot) {
              setIsSharing(true);
              setChatHistory(prev => [
                ...prev,
                {
                  id: uuidv4(),
                  sender: 'ai',
                  text: "I can now see your screen! Ask me anything about what you're viewing.",
                  timestamp: new Date().toISOString()
                }
              ]);
            }
          }, 1000);
        };
      }
      
      // Listen for the end of the stream
      stream.getVideoTracks()[0].onended = () => {
        stopScreenSharing();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
      setChatHistory(prev => [
        ...prev,
        {
          id: uuidv4(),
          sender: 'ai',
          text: `Failed to start screen sharing: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  };
  
  // Stop screen sharing
  const stopScreenSharing = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsSharing(false);
    
    setChatHistory(prev => [
      ...prev,
      {
        id: uuidv4(),
        sender: 'ai',
        text: "Screen sharing has stopped. You can restart sharing or continue chatting about the last screenshot.",
        timestamp: new Date().toISOString()
      }
    ]);
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Add user message to chat
    const userMessage = {
      id: uuidv4(),
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setChatLoading(true);
    
    try {
      // Add a temporary message
      setChatHistory(prev => [
        ...prev,
        {
          id: 'temp-analyzing',
          sender: 'ai',
          text: "Analyzing your screen...",
          timestamp: new Date().toISOString(),
          temporary: true
        }
      ]);
      
      let response;
      
      // If we have a screenshot, analyze it directly
      if (currentScreenshot && apiKey) {
        // Take a fresh screenshot if we're sharing
        const screenshot = isSharing ? captureScreenshot() : currentScreenshot;
        
        if (screenshot) {
          // Format the message to include plain text formatting instruction
          const formattedMessage = `${message}\n\n4. Format your responses as plain text only - do not use markdown formatting like **bold**, *italics*, or code blocks`;
          
          // Use Gemini Vision API to analyze the screenshot
          response = await getGeminiVisionResponse(
            formattedMessage,
            screenshot,
            [], // Don't send chat history to vision API
            apiKey
          );
          
          // Add AI response to chat
          const aiMessage = {
            id: uuidv4(),
            sender: 'ai',
            text: response,
            timestamp: new Date().toISOString()
          };
          
          setChatHistory(prev => prev.filter(msg => !msg.temporary).concat([aiMessage]));
        }
      } else if (parentWindow) {
        // Format the message with plain text instruction
        const formattedMessage = `${message}\n\n4. Format your responses as plain text only - do not use markdown formatting like **bold**, *italics*, or code blocks`;
        
        // Request analysis from parent window
        parentWindow.postMessage({ 
          type: 'ANALYZE_SCREENSHOT', 
          query: formattedMessage 
        }, '*');
        // The response will come back via the message event handler
      } else {
        // No screenshot and no parent window
        setChatHistory(prev => [
          ...prev.filter(msg => !msg.temporary),
          {
            id: uuidv4(),
            sender: 'ai',
            text: "I don't have access to your screen. Please start screen sharing first.",
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error analyzing screen:', error);
      
      // Add error message to chat
      setChatHistory(prev => [
        ...prev.filter(msg => !msg.temporary),
        {
          id: uuidv4(),
          sender: 'ai',
          text: `Sorry, I encountered an error: ${error.message}. Please try again.`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };
  
  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <Container maxWidth="md" sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      pt: 2,
      pb: 2
    }}>
      {/* Hidden video element for screen sharing */}
      <video 
        ref={videoRef} 
        style={{ display: 'none' }} 
        autoPlay 
        playsInline 
      />
      
      {/* Screen sharing status */}
      {isSharing && (
        <Fade in={isSharing}>
          <Chip 
            label="Screen sharing active"
            color="primary"
            size="small"
            sx={{ alignSelf: 'center', mb: 2 }}
          />
        </Fade>
      )}
      
      {/* Main Paper container */}
      <Paper 
        elevation={3}
        sx={{ 
          flexGrow: 1, 
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 2
        }}
      >
      {/* Chat Messages */}
      <ChatMessages>
        {chatHistory.map((chat) => (
          <Box
            key={chat.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: chat.sender === 'user' ? 'flex-end' : 'flex-start',
              mb: 2
            }}
          >
            <MessageBubble isUser={chat.sender === 'user'}>
              <Typography variant="body2">
                {chat.text}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block', 
                  mt: 0.5, 
                  textAlign: chat.sender === 'user' ? 'right' : 'left',
                  opacity: 0.7
                }}
              >
                {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </MessageBubble>
          </Box>
        ))}
        
        {chatLoading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              mb: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                Analyzing...
              </Typography>
            </Box>
          </Box>
        )}
        
        <div ref={chatEndRef} />
      </ChatMessages>
      
        {/* Message Input and Controls */}
        <ChatInputArea>
          {/* Screen sharing controls */}
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={isSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              onClick={isSharing ? stopScreenSharing : startScreenSharing}
              sx={{ mr: 1 }}
              size="small"
            >
              {isSharing ? 'Stop sharing' : 'Share Screen'}
            </Button>
          </Box>
          
          {/* Message input */}
          <TextField
            fullWidth
            size="small"
            placeholder="Ask about your screen..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={chatLoading}
            variant="outlined"
            sx={{ mr: 1 }}
          />
          <IconButton 
            color="primary" 
            onClick={handleSendMessage}
            disabled={!message.trim() || chatLoading}
          >
            {chatLoading ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </ChatInputArea>
      </Paper>
      
      {!isSharing && !currentScreenshot && (
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ mt: 1, display: 'block', textAlign: 'center' }}
        >
          Start screen sharing to enable Gemini to analyze your screen
        </Typography>
      )}
    </Container>
  );
};

export default ChatbotPopup;