import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import StudyCompanionPage from './pages/StudyCompanionPage';
import StudyPlanHistoryPage from './pages/StudyPlanHistoryPage';
import ProfilePage from './pages/ProfilePage';
import StudyHub from './pages/StudyHub';
import LastMinuteStudy from './pages/LastMinuteStudy';
import ShareScreen from './pages/ShareScreen';
import ChatbotPopup from './pages/ChatbotPopup';
import theme from './theme/theme';
import { initializeGoogleServices } from './services/googleAuth';
import { ProgressProvider } from './context/ProgressContext';

function App() {
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initGoogle = async () => {
      try {
        setInitializing(true);
        await initializeGoogleServices();
      } catch (error) {
        console.error('Failed to initialize Google services:', error);
      } finally {
        setInitializing(false);
      }
    };

    initGoogle();
  }, []);

  if (initializing) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <CircularProgress color="primary" />
          <Box sx={{ color: 'text.secondary' }}>
            Initializing EduZen...
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ProgressProvider>
        <Router>
          {/* Use Routes to determine if we're on the ChatbotPopup page */}
          <Routes>
            <Route path="/chatbot-popup" element={<ChatbotPopup />} />
            <Route path="*" element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/study-hub" element={<StudyHub />} />
                  <Route path="/study-companion" element={<StudyCompanionPage />} />
                  <Route path="/study-plan-history" element={<StudyPlanHistoryPage />} />
                  <Route path="/last-minute-study" element={<LastMinuteStudy />} />
                  <Route path="/share-screen" element={<ShareScreen />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Routes>
              </>
            } />
          </Routes>
        </Router>
      </ProgressProvider>
    </ThemeProvider>
  );
}

export default App;
