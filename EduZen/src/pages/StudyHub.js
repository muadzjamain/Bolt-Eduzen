import React from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Box,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import HistoryIcon from '@mui/icons-material/History';

const StudyHub = () => {
  const navigate = useNavigate();

  const studyTools = [
    {
      title: 'Study Companion',
      description: 'Upload study materials, get summaries, generate quizzes, and analyze content',
      icon: <CloudUploadIcon sx={{ fontSize: 40, color: '#4285F4' }} />,
      path: '/study-companion',
      bgColor: '#E8F0FE'
    },
    {
      title: 'Last-Minute Study',
      description: 'Upload multiple content types and get a focused study plan for your upcoming exam',
      icon: <AccessTimeIcon sx={{ fontSize: 40, color: '#EA4335' }} />,
      path: '/last-minute-study',
      bgColor: '#FEE8E8'
    },
    {
      title: 'Share Screen',
      description: "Share your screen and get real-time AI analysis and insights about what you're viewing",
      icon: <ScreenShareIcon sx={{ fontSize: 40, color: '#34A853' }} />,
      path: '/share-screen',
      bgColor: '#E6F4EA'
    },
    {
      title: 'Study Plan History',
      description: 'View and continue your saved study plans',
      icon: <HistoryIcon sx={{ fontSize: 40, color: '#FBBC04' }} />,
      path: '/study-plan-history',
      bgColor: '#FEF7E0'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 12, mb: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
        Welcome to EduZen Study Hub
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 6 }}>
        Your AI-powered study companion to help you learn more effectively and prepare for exams. Choose from our enhanced study tools below to get started.
      </Typography>

      <Typography variant="h6" sx={{ mb: 3 }}>
        Choose a Study Tool
      </Typography>

      <Grid container spacing={3}>
        {studyTools.map((tool) => (
          <Grid item xs={12} sm={6} key={tool.title}>
            <Card 
              onClick={() => navigate(tool.path)}
              sx={{
                cursor: 'pointer',
                height: '100%',
                position: 'relative',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    sx={{ 
                      p: 1.5, 
                      borderRadius: 2, 
                      backgroundColor: tool.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {tool.icon}
                  </Box>
                </Box>
                <Typography variant="h6" gutterBottom>
                  {tool.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tool.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default StudyHub;
