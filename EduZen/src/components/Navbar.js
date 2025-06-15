import React, { useState, useEffect, useRef } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton, 
  Divider, 
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fade,
  Paper,
  Container,
  Avatar,
  Menu,
  MenuItem,
  ListItemButton,
  Tooltip,
  ClickAwayListener
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { isAuthenticated, getCurrentUser, logoutUser } from '../services/auth';

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const anchorRef = useRef(null);
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Add scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await isAuthenticated();
      if (isAuth) {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    };
    
    checkAuth();
    
    // Set up an interval to periodically check authentication status
    // This helps ensure the UI stays in sync with the auth state
    const authCheckInterval = setInterval(checkAuth, 5000);
    
    return () => {
      clearInterval(authCheckInterval);
    };
  }, []);

  const toggleMobileMenu = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const handleProfileMenuOpen = () => {
    setProfileMenuOpen(true);
  };
  
  const handleProfileMenuClose = () => {
    setProfileMenuOpen(false);
  };
  
  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null); // Immediately update UI
      handleProfileMenuClose();
      // Force a re-check of authentication status
      const isAuth = await isAuthenticated();
      if (!isAuth) {
        console.log('Successfully logged out');
      } else {
        console.error('Logout appeared to succeed but user still authenticated');
      }
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const handleProfileClick = () => {
    handleProfileMenuClose();
    navigate('/profile');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Study Hub', icon: <SchoolIcon />, path: '/study-hub' }
  ];

  const renderMobileDrawer = () => (
    <>
      <IconButton 
        edge="start" 
        color="inherit" 
        aria-label="menu" 
        onClick={toggleMobileMenu}
        sx={{ 
          mr: 1,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            color: 'primary.main'
          }
        }}
      >
        <MenuIcon />
      </IconButton>
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={toggleMobileMenu}
        PaperProps={{
          sx: {
            borderRadius: '0 16px 16px 0',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
          }
        }}
        sx={{
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(4px)',
          }
        }}
      >
        <Box
          sx={{ 
            width: 280,
            height: '100%',
            background: 'linear-gradient(to bottom, #ffffff, #f5f9ff)'
          }}
          role="presentation"
          onClick={toggleMobileMenu}
        >
          <Box sx={{ 
            p: 3, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 2
          }}>
            <LightbulbIcon sx={{ color: 'primary.main', mr: 1, fontSize: 28 }} />
            <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
              EduZen
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List sx={{ px: 2 }}>
            {navItems.map((item, index) => (
              <Fade in={true} style={{ transitionDelay: `${index * 100}ms` }} key={item.text}>
                <ListItem 
                  button 
                  component={Link} 
                  to={item.path}
                  selected={isActive(item.path)}
                  sx={{
                    py: 1.5,
                    mb: 1,
                    bgcolor: isActive(item.path) ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
                    '&:hover': {
                      bgcolor: 'rgba(66, 133, 244, 0.1)',
                    },
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateX(5px)',
                      bgcolor: 'rgba(66, 133, 244, 0.1)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                    minWidth: '40px'
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ 
                      color: isActive(item.path) ? 'primary.main' : 'text.primary',
                      fontWeight: isActive(item.path) ? 'medium' : 'regular',
                      fontSize: '1rem'
                    }} 
                  />
                </ListItem>
              </Fade>
            ))}
          </List>
          <Box sx={{ 
            position: 'absolute', 
            bottom: 20, 
            width: '100%', 
            textAlign: 'center',
            px: 3
          }}>
            <Paper elevation={0} sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: 'rgba(66, 133, 244, 0.08)',
              border: '1px solid rgba(66, 133, 244, 0.2)'
            }}>
              <Typography variant="body2" color="text.secondary">
                EduZen — Your AI-powered study companion
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Drawer>
    </>
  );

  return (
    <AppBar 
      position="sticky" 
      color="default" 
      elevation={scrolled ? 4 : 0}
      sx={{ 
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: scrolled ? 'none' : '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        py: scrolled ? 0.5 : 1
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ 
          justifyContent: 'space-between',
          px: { xs: 1, sm: 2 },
          minHeight: { xs: '64px', md: '70px' }
        }}>
          {isMobile ? renderMobileDrawer() : null}
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LightbulbIcon sx={{ 
              color: 'primary.main', 
              mr: 1, 
              fontSize: 28,
              display: { xs: isMobile ? 'none' : 'block', md: 'block' }
            }} />
            <Typography 
              variant="h6" 
              component={Link} 
              to="/" 
              sx={{ 
                color: 'primary.main', 
                textDecoration: 'none',
                fontWeight: 'bold',
                flexGrow: isMobile ? 1 : 0,
                textAlign: isMobile ? 'center' : 'left',
                fontSize: { xs: '1.2rem', md: '1.4rem' },
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                }
              }}
            >
              EduZen
            </Typography>
          </Box>

          {!isMobile && (
            <Box sx={{ 
              display: 'flex', 
              mx: 4, 
              flexGrow: 1,
              justifyContent: 'center'
            }}>
              {navItems.map((item) => (
                <Button
                  key={item.text}
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                  sx={{
                    mx: 1.5,
                    px: 2.5,
                    py: 1,
                    color: isActive(item.path) ? 'primary.main' : 'text.primary',
                    bgcolor: isActive(item.path) ? 'rgba(66, 133, 244, 0.08)' : 'transparent',
                    borderRadius: '50px',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(66, 133, 244, 0.12)',
                      transform: 'translateY(-2px)',
                      boxShadow: isActive(item.path) ? '0 4px 8px rgba(66, 133, 244, 0.2)' : 'none'
                    },
                    textTransform: 'none',
                    fontWeight: isActive(item.path) ? 'medium' : 'regular',
                    fontSize: '0.95rem',
                    boxShadow: isActive(item.path) ? '0 2px 5px rgba(66, 133, 244, 0.2)' : 'none'
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}
          
          {/* User Profile Section */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {currentUser ? (
              <Box sx={{ position: 'relative' }}>
                <Tooltip title="Account settings">
                  <IconButton
                    ref={anchorRef}
                    onClick={handleProfileMenuOpen}
                    size="small"
                    sx={{ 
                      ml: 2,
                      p: 0.5,
                      border: profileMenuOpen ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    aria-controls={profileMenuOpen ? 'profile-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={profileMenuOpen ? 'true' : undefined}
                  >
                    <Avatar 
                      sx={{ 
                        width: 36, 
                        height: 36,
                        bgcolor: theme.palette.primary.main,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: '0 0 0 2px rgba(66, 133, 244, 0.3)'
                        }
                      }}
                      alt={currentUser?.username || 'User'}
                      src={currentUser?.photoURL || ''}
                    >
                      {!currentUser?.photoURL && (currentUser?.username?.[0]?.toUpperCase() || 'U')}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                
                <Menu
                  id="profile-menu"
                  anchorEl={anchorRef.current}
                  open={profileMenuOpen}
                  onClose={handleProfileMenuClose}
                  MenuListProps={{
                    'aria-labelledby': 'profile-button',
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  PaperProps={{
                    elevation: 3,
                    sx: {
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                      mt: 1.5,
                      borderRadius: 2,
                      minWidth: 220,
                      '&:before': {
                        content: '""',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: 'background.paper',
                        transform: 'translateY(-50%) rotate(45deg)',
                        zIndex: 0,
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      {currentUser?.username || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                      {currentUser?.email || ''}
                    </Typography>
                  </Box>
                  
                  <Divider />
                  
                  <MenuItem onClick={handleProfileClick} sx={{ py: 1.5 }}>
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Profile" />
                  </MenuItem>
                  
                  <Divider />
                  
                  <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Sign out" />
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Button
                component={Link}
                to="/?auth=open"
                variant="outlined"
                startIcon={<AccountCircleIcon />}
                sx={{
                  borderRadius: 50,
                  px: 2,
                  py: 0.8,
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 'medium',
                  border: '1.5px solid',
                  borderColor: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    bgcolor: 'rgba(66, 133, 244, 0.04)'
                  }
                }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
