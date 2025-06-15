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
import { registerWithEmailAndPassword } from '../../services/auth';

const Register = ({ onSwitch, onClose }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !username || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Username validation
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }
    
    // Password validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    // Confirm password
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      // Call Firebase registration service
      const result = await registerWithEmailAndPassword(email, password, username);
      
      if (result.success) {
        console.log('Registration successful:', result.user);
        // Redirect to login page after successful registration
        onSwitch('login');
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Typography variant="h4" component="h1" gutterBottom align="left" sx={{ fontWeight: 600, mb: 4, color: '#1976d2' }}>
        Create your account
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
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
                borderColor: '#1976d2',
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
      
      <Box sx={{ mb: 3 }}>
        <InputLabel 
          htmlFor="username" 
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
          Username
        </InputLabel>
        <TextField
          required
          fullWidth
          id="username"
          name="username"
          autoComplete="username"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
                borderColor: '#1976d2',
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
      
      <Box sx={{ mb: 3 }}>
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
          autoComplete="new-password"
          placeholder="Create a password"
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
                borderColor: '#1976d2',
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
          htmlFor="confirmPassword" 
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
          Confirm Password
        </InputLabel>
        <TextField
          required
          fullWidth
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
                borderColor: '#1976d2',
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
        fullWidth
        variant="contained"
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
            <span style={{ visibility: 'hidden' }}>Sign up</span>
          </>
        ) : 'Sign up'}
      </Button>
      
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          Already have an account?{' '}
          <Link
            component="button"
            variant="body1"
            onClick={() => onSwitch('login')}
            sx={{ 
              color: '#4285F4',
              fontWeight: 500,
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Log in
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default Register;
