import React from 'react';
import {
  Container,
  Grid,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import StudyCompanion from './StudyCompanion';
import FloatingChatbot from '../components/FloatingChatbot';

const StudyCompanionPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Grid container spacing={3}>
        {/* Left Column - Study Companion Tools */}
        <Grid item xs={12} md={7}>
          <StudyCompanion />
        </Grid>
        
        {/* Right Column - AI Chatbot */}
        <Grid item xs={12} md={5}>
          <Box 
            sx={{ 
              height: isMobile ? 'auto' : 'calc(100vh - 100px)',
              position: 'sticky',
              top: 24,
              overflow: 'hidden'
            }}
          >
            <FloatingChatbot />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default StudyCompanionPage;
