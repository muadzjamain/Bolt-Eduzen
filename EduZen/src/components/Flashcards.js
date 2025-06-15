import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  Chip,
  IconButton,
  LinearProgress,
  Card,
  CardContent,
  Tooltip,
  Fade,
  Zoom,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import FlipIcon from '@mui/icons-material/Flip';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import TimerIcon from '@mui/icons-material/Timer';
import SettingsIcon from '@mui/icons-material/Settings';

const Flashcards = ({ cards = [], onPreferencesClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for flashcards
  const [flashcards, setFlashcards] = useState(cards);
  const [cardStates, setCardStates] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyStats, setStudyStats] = useState({
    mastered: 0,
    learning: 0,
    unseen: cards.length,
    streak: 0
  });
  const [animation, setAnimation] = useState('');
  
  // Refs
  const cardRef = useRef(null);
  
  // Initialize card states
  useEffect(() => {
    if (cards.length > 0) {
      setFlashcards(cards);
      setCardStates(cards.map(() => ({ 
        flipped: false, 
        mastered: false,
        starred: false,
        lastSeen: null
      })));
    }
  }, [cards]);
  
  // Update stats when card states change
  useEffect(() => {
    if (cardStates.length > 0) {
      const mastered = cardStates.filter(state => state.mastered).length;
      setStudyStats({
        mastered,
        learning: cardStates.length - mastered,
        unseen: 0,
        streak: calculateStreak()
      });
    }
  }, [cardStates]);
  
  // Calculate study streak
  const calculateStreak = () => {
    // This would normally use localStorage to track daily study habits
    // For now, we'll return a placeholder value
    return Math.floor(Math.random() * 5) + 1;
  };
  
  // Handle card flip
  const handleFlip = (index) => {
    if (viewMode === 'grid') {
      const newStates = [...cardStates];
      newStates[index] = { ...newStates[index], flipped: !newStates[index].flipped };
      setCardStates(newStates);
    } else {
      setIsFlipped(!isFlipped);
    }
  };
  
  // Handle marking a card as mastered
  const handleMastered = (index, e) => {
    if (e) e.stopPropagation();
    
    const targetIndex = viewMode === 'grid' ? index : currentIndex;
    const newStates = [...cardStates];
    newStates[targetIndex] = { 
      ...newStates[targetIndex], 
      flipped: false, 
      mastered: true,
      lastSeen: new Date()
    };
    setCardStates(newStates);
    
    if (viewMode === 'single') {
      setIsFlipped(false);
      // Add a slight delay before moving to next card
      setTimeout(() => {
        handleNextCard();
      }, 300);
    }
  };
  
  // Handle marking a card as still learning
  const handleStillLearning = (index, e) => {
    if (e) e.stopPropagation();
    
    const targetIndex = viewMode === 'grid' ? index : currentIndex;
    const newStates = [...cardStates];
    newStates[targetIndex] = { 
      ...newStates[targetIndex], 
      flipped: false, 
      mastered: false,
      lastSeen: new Date()
    };
    setCardStates(newStates);
    
    if (viewMode === 'single') {
      setIsFlipped(false);
      // Add a slight delay before moving to next card
      setTimeout(() => {
        handleNextCard();
      }, 300);
    }
  };
  
  // Handle starring/unstarring a card
  const handleToggleStar = (index, e) => {
    if (e) e.stopPropagation();
    
    const targetIndex = viewMode === 'grid' ? index : currentIndex;
    const newStates = [...cardStates];
    newStates[targetIndex] = { 
      ...newStates[targetIndex], 
      starred: !newStates[targetIndex].starred
    };
    setCardStates(newStates);
  };
  
  // Handle next card in single view mode
  const handleNextCard = () => {
    setAnimation('slide-left');
    setTimeout(() => {
      setIsFlipped(false);
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
      setAnimation('');
    }, 200);
  };
  
  // Handle previous card in single view mode
  const handlePrevCard = () => {
    setAnimation('slide-right');
    setTimeout(() => {
      setIsFlipped(false);
      setCurrentIndex((prev) => (prev === 0 ? flashcards.length - 1 : prev - 1));
      setAnimation('');
    }, 200);
  };
  
  // Shuffle cards
  const handleShuffle = () => {
    const shuffled = [...flashcards];
    const shuffledStates = [...cardStates];
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      [shuffledStates[i], shuffledStates[j]] = [shuffledStates[j], shuffledStates[i]];
    }
    
    setFlashcards(shuffled);
    setCardStates(shuffledStates);
    setCurrentIndex(0);
    setIsFlipped(false);
  };
  
  // Reset progress
  const handleResetProgress = () => {
    setCardStates(flashcards.map(() => ({ 
      flipped: false, 
      mastered: false,
      starred: false,
      lastSeen: null
    })));
    setCurrentIndex(0);
    setIsFlipped(false);
  };
  
  // Calculate progress percentage
  const progressPercentage = (studyStats.mastered / flashcards.length) * 100;
  
  return (
    <Box>
      {/* Header with stats and controls */}
      <Box sx={{ 
        mb: 3, 
        p: 2, 
        bgcolor: 'rgba(52, 168, 83, 0.05)', 
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="#34A853" sx={{ display: 'flex', alignItems: 'center' }}>
            <FlipIcon sx={{ mr: 1 }} /> Interactive Flashcards
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={onPreferencesClick}
            sx={{ borderRadius: '20px' }}
          >
            Edit Preferences
          </Button>
        </Box>
        
        <Typography variant="body1" sx={{ mb: 2 }}>
          Test your knowledge with these interactive flashcards. Click on a card to flip it and reveal the answer.
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip 
            icon={<ShuffleIcon />} 
            label="Shuffle Cards" 
            color="primary" 
            variant="outlined" 
            onClick={handleShuffle} 
            sx={{ borderRadius: '8px' }}
          />
          <Chip 
            icon={<RestartAltIcon />} 
            label="Reset Progress" 
            color="primary" 
            variant="outlined" 
            onClick={handleResetProgress} 
            sx={{ borderRadius: '8px' }}
          />
          <Chip 
            icon={viewMode === 'grid' ? <ViewCarouselIcon /> : <GridViewIcon />} 
            label={viewMode === 'grid' ? "Card View" : "Grid View"} 
            color="primary" 
            variant="outlined" 
            onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')} 
            sx={{ borderRadius: '8px' }}
          />
        </Box>
      </Box>
      
      {/* Progress bar and stats */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1">
            {studyStats.mastered} of {flashcards.length} mastered
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimerIcon sx={{ mr: 0.5, color: theme.palette.text.secondary, fontSize: '1rem' }} />
            <Typography variant="body2" color="text.secondary">
              {studyStats.streak} day streak
            </Typography>
          </Box>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progressPercentage} 
          sx={{ 
            height: 8, 
            borderRadius: 4,
            bgcolor: 'rgba(0,0,0,0.05)',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#34A853'
            }
          }} 
        />
      </Box>
      
      {/* Flashcards content */}
      {viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {flashcards.map((card, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper 
                elevation={cardStates[index]?.mastered ? 1 : 2} 
                sx={{ 
                  height: '200px',
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  transform: cardStates[index]?.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transformStyle: 'preserve-3d',
                  '&:hover': { boxShadow: 4 },
                  bgcolor: cardStates[index]?.mastered ? 'rgba(52, 168, 83, 0.05)' : 'white',
                  border: cardStates[index]?.mastered ? '1px solid rgba(52, 168, 83, 0.3)' : 'none'
                }}
                onClick={() => handleFlip(index)}
              >
                {/* Front of card */}
                <Box sx={{ 
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backfaceVisibility: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 2
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      {card.front}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleToggleStar(index, e)}
                      sx={{ color: cardStates[index]?.starred ? '#FBBC04' : 'rgba(0,0,0,0.3)' }}
                    >
                      {cardStates[index]?.starred ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Click to reveal answer
                  </Typography>
                  
                  {cardStates[index]?.mastered && (
                    <Chip 
                      label="Mastered" 
                      size="small" 
                      color="success" 
                      variant="outlined"
                      sx={{ alignSelf: 'flex-start', mb: 1 }}
                    />
                  )}
                  
                  <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center' }}>
                    <FlipIcon sx={{ color: 'rgba(0, 0, 0, 0.3)' }} />
                  </Box>
                </Box>
                
                {/* Back of card */}
                <Box sx={{ 
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 2,
                  bgcolor: 'rgba(66, 133, 244, 0.05)'
                }}>
                  <Typography variant="body1" sx={{ overflow: 'auto', mb: 2 }}>
                    {card.back}
                  </Typography>
                  
                  <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between' }}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={(e) => handleStillLearning(index, e)}
                    >
                      Still Learning
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={(e) => handleMastered(index, e)}
                    >
                      Mastered
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Single card view */}
          <Box sx={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
            <Paper 
              elevation={3} 
              sx={{ 
                width: '100%',
                height: '300px',
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
                animation: animation ? `${animation} 0.2s ease-out` : 'none',
                '@keyframes slide-left': {
                  '0%': { transform: isFlipped ? 'rotateY(180deg) translateX(0)' : 'rotateY(0deg) translateX(0)' },
                  '100%': { transform: isFlipped ? 'rotateY(180deg) translateX(-50px)' : 'rotateY(0deg) translateX(-50px)' }
                },
                '@keyframes slide-right': {
                  '0%': { transform: isFlipped ? 'rotateY(180deg) translateX(0)' : 'rotateY(0deg) translateX(0)' },
                  '100%': { transform: isFlipped ? 'rotateY(180deg) translateX(50px)' : 'rotateY(0deg) translateX(50px)' }
                }
              }}
              onClick={() => handleFlip(currentIndex)}
              ref={cardRef}
            >
              {/* Front of card */}
              <Box sx={{ 
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                p: 3
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 500 }}>
                    {flashcards[currentIndex]?.front}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleToggleStar(currentIndex, e)}
                    sx={{ color: cardStates[currentIndex]?.starred ? '#FBBC04' : 'rgba(0,0,0,0.3)' }}
                  >
                    {cardStates[currentIndex]?.starred ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                </Box>
                
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                  Click to reveal answer
                </Typography>
                
                {cardStates[currentIndex]?.mastered && (
                  <Chip 
                    label="Mastered" 
                    size="small" 
                    color="success" 
                    sx={{ alignSelf: 'center', mb: 2 }}
                  />
                )}
                
                <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center' }}>
                  <FlipIcon sx={{ fontSize: '2rem', color: 'rgba(0, 0, 0, 0.3)' }} />
                </Box>
              </Box>
              
              {/* Back of card */}
              <Box sx={{ 
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                display: 'flex',
                flexDirection: 'column',
                p: 3,
                bgcolor: 'rgba(66, 133, 244, 0.05)'
              }}>
                <Typography variant="body1" sx={{ overflow: 'auto', mb: 3, fontSize: '1.1rem' }}>
                  {flashcards[currentIndex]?.back}
                </Typography>
                
                <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined" 
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={(e) => handleStillLearning(currentIndex, e)}
                  >
                    Still Learning
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={(e) => handleMastered(currentIndex, e)}
                  >
                    Mastered
                  </Button>
                </Box>
              </Box>
            </Paper>
            
            {/* Navigation controls */}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 2 }}>
              <IconButton 
                color="primary" 
                onClick={handlePrevCard}
                sx={{ bgcolor: 'rgba(66, 133, 244, 0.1)', '&:hover': { bgcolor: 'rgba(66, 133, 244, 0.2)' } }}
              >
                <NavigateBeforeIcon />
              </IconButton>
              
              <Typography variant="body1">
                {currentIndex + 1} / {flashcards.length}
              </Typography>
              
              <IconButton 
                color="primary" 
                onClick={handleNextCard}
                sx={{ bgcolor: 'rgba(66, 133, 244, 0.1)', '&:hover': { bgcolor: 'rgba(66, 133, 244, 0.2)' } }}
              >
                <NavigateNextIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Flashcards;
