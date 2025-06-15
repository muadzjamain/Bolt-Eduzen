import React from 'react';
import {
  Container,
  Typography,
  Box
} from '@mui/material';
import StudyPlanHistory from '../components/StudyPlanHistory';

const StudyPlanHistoryPage = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Study Plan History
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          View and manage your saved study plans
        </Typography>
      </Box>
      
      <StudyPlanHistory />
    </Container>
  );
};

export default StudyPlanHistoryPage;
