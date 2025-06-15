import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Link,
  Alert,
  InputLabel,
  CircularProgress
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { loginWithEmailAndPassword, resetPassword } from '../../services/auth';

const Login = ({ onSwitch, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      // Call Firebase authentication service
      const result = await loginWithEmailAndPassword(email, password);
      
      if (result.success) {
        console.log('Login successful:', result.user);
        // Close the modal after successful login
        onClose();
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials and try again.');
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    // Validate email
    if (!email) {
      setError('Please enter your email address to reset your password');
      return;
    }
    
    setIsResettingPassword(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setSuccessMessage(result.message);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to send password reset email. Please try again.');
      console.error('Password reset error:', err);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Typography variant="h4" component="h1" gutterBottom align="left" sx={{ fontWeight: 500, mb: 4, color: '#1976d2' }}>
        Log in to EduZen
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <InputLabel 
          htmlFor="email" 
          sx={{ 
            color: '#1976d2', 
            mb: 1, 
            fontWeight: 500,
            textAlign: 'left',
            '&::after': {
              content: '" *"',
              color: '#d32f2f'
            }
          }}
        >
          Email Address
        </InputLabel>
        <TextField
          required
          fullWidth
          id="email"
          name="email"
          autoComplete="email"
          autoFocus
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          variant="outlined"
          InputProps={{
            sx: {
              backgroundColor: '#fff',
              color: '#333',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: '#fff'
              }
            }
          }}
          sx={{ 
            mb: 2,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#1976d2',
                borderWidth: '1px',
              },
              '&:hover fieldset': {
                borderColor: 'transparent',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
                borderWidth: 2
              }
            },
            '& .MuiInputBase-input': {
              py: 1.5,
              fontSize: '1rem'
            }
          }}
        />
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <InputLabel 
          htmlFor="password" 
          sx={{ 
            color: '#1976d2', 
            mb: 1, 
            fontWeight: 500,
            textAlign: 'left',
            '&::after': {
              content: '" *"',
              color: '#d32f2f'
            }
          }}
        >
          Password
        </InputLabel>
        <TextField
          required
          fullWidth
          name="password"
          type={showPassword ? 'text' : 'password'}
          id="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          variant="outlined"
          InputProps={{
            sx: {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: '#fff'
              }
            },
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  sx={{ color: '#555' }}
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ 
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'transparent',
              },
              '&:hover fieldset': {
                borderColor: 'transparent',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
                borderWidth: 2
              }
            },
            '& .MuiInputBase-input': {
              py: 1.5,
              fontSize: '1rem'
            }
          }}
        />
      </Box>
      
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={isSubmitting}
        sx={{ 
          mt: 2, 
          mb: 2,
          py: 1.5,
          bgcolor: '#1976d2',
          color: 'white',
          fontWeight: 'bold',
          '&:hover': {
            bgcolor: '#1565c0'
          },
          boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
          position: 'relative'
        }}
      >
        {isSubmitting ? (
          <>
            <CircularProgress 
              size={24} 
              sx={{ 
                color: '#4285F4',
                position: 'absolute',
                left: 'calc(50% - 12px)'
              }} 
            />
            <span style={{ visibility: 'hidden' }}>Log in</span>
          </>
        ) : 'Log in'}
      </Button>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={handleForgotPassword}
          sx={{ 
            color: '#4285F4',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline'
            }
          }}
          disabled={isResettingPassword}
        >
          {isResettingPassword ? 'Sending reset email...' : 'Forgot password?'}
        </Link>
      </Box>
      
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          Don't have an account?{' '}
          <Link
            component="button"
            variant="body1"
            onClick={() => onSwitch('register')}
            sx={{ 
              color: '#4285F4',
              fontWeight: 500,
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Sign up
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Login;
