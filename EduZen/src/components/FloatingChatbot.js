import React, { useState, memo, lazy, Suspense } from 'react';
import { Fab, Paper, IconButton, Box, useMediaQuery, useTheme, CircularProgress } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';

// Lazy load the AIChatbot component to improve initial load time
const AIChatbot = lazy(() => import('./AIChatbot'));

/**
 * FloatingChatbot component that displays as a floating button on mobile
 * and expands to a full chatbot when clicked.
 * On desktop, it displays the regular AIChatbot without modifications.
 * Optimized for performance on mobile devices.
 */
const FloatingChatbot = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isOpen, setIsOpen] = useState(false);

  // For desktop, just render the normal AIChatbot with Suspense for better loading
  if (!isMobile) {
    return (
      <Suspense fallback={<CircularProgress />}>
        <AIChatbot />
      </Suspense>
    );
  }

  // For mobile, render either the floating button or expanded chatbot
  return (
    <div>
      {isOpen ? (
        // Expanded chatbot
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            width: 'calc(100% - 32px)',
            maxWidth: '400px',
            height: '70vh',
            zIndex: 1000,
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Close button */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1010
            }}
          >
            <IconButton
              size="small"
              onClick={() => setIsOpen(false)}
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.1)',
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.2)'
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          {/* Chatbot container with Suspense for lazy loading */}
          <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>}>
              <AIChatbot />
            </Suspense>
          </Box>
        </Paper>
      ) : (
        // Floating button
        <Fab
          color="primary"
          aria-label="AI Assistant"
          onClick={() => setIsOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
          }}
        >
          <SmartToyIcon />
        </Fab>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(FloatingChatbot);
