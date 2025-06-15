import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Button, 
  Box, 
  Card, 
  CardContent, 
  CardActions,
  useTheme,
  useMediaQuery,
  Fade,
  Paper,
  Modal,
  Backdrop,
  Avatar
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import SpaIcon from '@mui/icons-material/Spa';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { isAuthenticated, getCurrentUser, logoutUser } from '../services/auth';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [authStatus, setAuthStatus] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState('welcome'); // 'welcome', 'login', or 'register'
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  
  // Check URL parameters for auth=open
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authParam = params.get('auth');
    
    if (authParam === 'open') {
      setShowLoginModal(true);
      // Remove the auth parameter from URL without refreshing
      navigate('/', { replace: true });
    }
  }, [location.search, navigate]);
  
  useEffect(() => {
    // Check authentication status with Firebase
    const checkAuth = async () => {
      const authResult = await isAuthenticated();
      setAuthStatus(authResult);
      
      if (authResult) {
        const user = await getCurrentUser();
        setCurrentUser(user);
        setShowLoginModal(false); // Don't show login modal if already authenticated
      } else {
        // Show login modal when user is not authenticated
        setShowLoginModal(true);
        setAuthMode('welcome');
      }
    };
    
    checkAuth();
  }, []);

  const handleNavigateToStudy = () => {
    navigate('/study-companion');
  };

  const handleNavigateToWellbeing = () => {
    navigate('/well-being-assistant');
  };

  const handleLoginClick = () => {
    console.log('Login clicked');
    setAuthMode('login');
  };

  const handleSignUpClick = () => {
    console.log('Sign up clicked');
    setAuthMode('register');
  };

  const handleStayLoggedOut = () => {
    console.log('Stay logged out clicked');
    setShowLoginModal(false);
    setAuthMode('welcome'); // Reset to welcome screen for next time
  };
  
  const handleSwitchAuthMode = (mode) => {
    setAuthMode(mode);
  };
  
  const handleCloseModal = async () => {
    // Check if user is authenticated after login/registration attempt
    const authResult = await isAuthenticated();
    setAuthStatus(authResult);
    
    if (authResult) {
      const user = await getCurrentUser();
      setCurrentUser(user);
    }
    
    setShowLoginModal(false);
  };
  
  const handleLogoutClick = () => {
    setShowLogoutConfirmation(true);
  };

  const handleConfirmLogout = async () => {
    await logoutUser();
    setAuthStatus(false);
    setCurrentUser(null);
    // Show login modal again when user logs out
    setShowLoginModal(true);
    setAuthMode('welcome');
    setShowLogoutConfirmation(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirmation(false);
  };

  return (
    <Fade in={true} timeout={800}>
      <Container maxWidth="lg" sx={{ mt: { xs: 3, md: 6 }, mb: 8 }}>
        {/* Login/Signup Modal */}
        <Modal
          open={showLoginModal}
          aria-labelledby="login-modal-title"
          aria-describedby="login-modal-description"
          closeAfterTransition
          disableAutoFocus
          disableEnforceFocus
          disableRestoreFocus
          BackdropComponent={Backdrop}
          BackdropProps={{
            timeout: 500,
            sx: {
              backgroundColor: 'rgba(21 21 21 / 60%)'
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400
          }}
        >
          <Fade in={showLoginModal}>
            <Paper
              elevation={24}
              sx={{
                width: { xs: '90%', sm: authMode === 'welcome' ? '400px' : '450px' },
                p: 4,
                borderRadius: 2,
                textAlign: 'center',
                backgroundColor: 'white',
                color: '#333',
                position: 'relative',
                zIndex: 1500,
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '2px solid',
                borderColor: '#1976d2',
                boxShadow: '0 8px 30px rgba(25, 118, 210, 0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {authMode === 'welcome' && (
                <>
                  <Typography variant="h5" component="h2" gutterBottom align="left" sx={{ color: '#1976d2' }}>
                    Welcome back
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3, textAlign: 'left' }}>
                    Log in or sign up to get smarter responses, upload files and images, and more.
                  </Typography>
                  
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ 
                      mb: 2, 
                      py: 1.5, 
                      backgroundColor: '#1976d2', 
                      color: 'white',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: '#1565c0'
                      },
                      zIndex: 1600
                    }}
                    onClick={handleLoginClick}
                  >
                    Log in
                  </Button>
                  
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ 
                      mb: 2, 
                      py: 1.5, 
                      backgroundColor: '#1976d2', 
                      color: 'white',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: '#1565c0'
                      },
                      zIndex: 1600
                    }}
                    onClick={handleSignUpClick}
                  >
                    Sign up
                  </Button>
                  
                  <Button
                    variant="outlined"
                    sx={{ 
                      color: '#1976d2',
                      borderColor: '#1976d2',
                      textAlign: 'left',
                      '&:hover': {
                        color: '#1565c0',
                        borderColor: '#1565c0',
                        backgroundColor: 'rgba(25, 118, 210, 0.04)'
                      },
                      zIndex: 1600
                    }}
                    onClick={handleStayLoggedOut}
                  >
                    Stay logged out
                  </Button>
                </>
              )}
              
              {authMode === 'login' && (
                <Login onSwitch={handleSwitchAuthMode} onClose={handleCloseModal} />
              )}
              
              {authMode === 'register' && (
                <Register onSwitch={handleSwitchAuthMode} onClose={handleCloseModal} />
              )}
            </Paper>
          </Fade>
        </Modal>

        {/* Logout Confirmation Modal */}
        <Modal
          open={showLogoutConfirmation}
          onClose={handleCancelLogout}
          aria-labelledby="logout-confirmation-modal"
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{
            timeout: 500,
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)'
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400
          }}
        >
          <Fade in={showLogoutConfirmation}>
            <Paper
              elevation={24}
              sx={{
                width: { xs: '90%', sm: '400px' },
                p: 4,
                borderRadius: 2,
                textAlign: 'center',
                backgroundColor: '#333',
                color: 'white',
                position: 'relative',
                zIndex: 1500
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Typography variant="h6" component="h2" gutterBottom>
                Sign Out Confirmation
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Are you sure you want to sign out?
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button
                  variant="outlined"
                  sx={{ 
                    borderColor: 'rgba(255, 255, 255, 0.5)', 
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white'
                    },
                    width: '48%'
                  }}
                  onClick={handleCancelLogout}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="contained"
                  sx={{ 
                    backgroundColor: 'white', 
                    color: 'black',
                    '&:hover': {
                      backgroundColor: '#f0f0f0'
                    },
                    width: '48%'
                  }}
                  onClick={handleConfirmLogout}
                >
                  Sign Out
                </Button>
              </Box>
            </Paper>
          </Fade>
        </Modal>
        <Box 
          textAlign="center" 
          mb={{ xs: 4, md: 8 }}
          sx={{
            maxWidth: '800px',
            mx: 'auto',
            px: 2
          }}
        >
          <Typography 
            variant={isMobile ? "h3" : "h2"} 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              color: 'primary.main',
              mb: 2
            }}
          >
            Welcome to EduZen
          </Typography>
          <Typography 
            variant="h5" 
            color="text.secondary" 
            paragraph
            sx={{ mb: 4 }}
          >
            Your AI-powered study assistant and well-being companion
          </Typography>
          
          {authStatus && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'rgba(66, 133, 244, 0.1)', 
                p: 2, 
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'primary.light',
                maxWidth: '600px',
                mx: 'auto',
                mb: 4
              }}
            >
              <Avatar 
                src={currentUser?.photoURL} 
                alt={currentUser?.username || 'User'}
                sx={{ mr: 2 }}
              >
                {!currentUser?.photoURL && <AccountCircleIcon />}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Welcome back, {currentUser?.username || 'User'}!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentUser?.email}
                </Typography>
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleLogoutClick}
                sx={{ ml: 2 }}
              >
                Sign out
              </Button>
            </Box>
          )}
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                boxShadow: '0 8px 40px rgba(0, 0, 0, 0.12)',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: '0 16px 70px rgba(0, 0, 0, 0.15)' 
                }
              }}
            >
              <CardContent sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexGrow: 1
              }}>
                <Box 
                  sx={{ 
                    bgcolor: 'rgba(66, 133, 244, 0.1)', 
                    borderRadius: '50%',
                    p: 2,
                    mb: 3
                  }}
                >
                  <SchoolIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                </Box>
                <Typography 
                  variant="h4" 
                  gutterBottom
                  sx={{ fontWeight: 'medium', mb: 2 }}
                >
                  Study Assistant
                </Typography>
                <Typography 
                  color="text.secondary" 
                  paragraph 
                  align="center"
                  sx={{ mb: 3 }}
                >
                  Upload your notes for AI-generated summaries, quizzes and personalized study plans to enhance your learning experience.
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                boxShadow: '0 8px 40px rgba(0, 0, 0, 0.12)',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': { 
                  transform: 'translateY(-8px)', 
                  boxShadow: '0 16px 70px rgba(0, 0, 0, 0.15)' 
                }
              }}
            >
              <CardContent sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexGrow: 1
              }}>
                <Box 
                  sx={{ 
                    bgcolor: 'rgba(52, 168, 83, 0.1)', 
                    borderRadius: '50%',
                    p: 2,
                    mb: 3
                  }}
                >
                  <SpaIcon sx={{ fontSize: 60, color: '#34A853' }} />
                </Box>
                <Typography 
                  variant="h4" 
                  gutterBottom
                  sx={{ fontWeight: 'medium', mb: 2 }}
                >
                  Well-Being Companion
                </Typography>
                <Typography 
                  color="text.secondary" 
                  paragraph 
                  align="center"
                  sx={{ mb: 3 }}
                >
                  Stay focused and balanced with the AI chatbot that offer personalized support to help manage stress and improve concentration during your studies.
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            EduZen uses Google services for the AI Chatbot and Document nagement.
          </Typography>
        </Box>
      </Container>
    </Fade>
  );
};

export default Home;
