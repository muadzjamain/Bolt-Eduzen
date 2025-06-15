import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  TextField,
  CircularProgress,
  Divider,
  IconButton,
  Chip,
  Grid
} from '@mui/material';
import FlipIcon from '@mui/icons-material/Flip';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AIChatbot from './AIChatbot';
import { getGeminiResponse } from '../services/gemini';

const InteractiveStudyTools = ({ studyPlan }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [chatbotPrompt, setChatbotPrompt] = useState('');
  const [userQuestion, setUserQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    // Extract flashcards and quiz questions from the study plan
    extractFlashcards();
    extractQuizQuestions();
    generateChatbotPrompt();
  }, [studyPlan]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Extract flashcards from the study plan
  const extractFlashcards = () => {
    try {
      setLoading(true);
      // Simple extraction logic - look for key terms and definitions
      const keyTermsSection = studyPlan.match(/key terms[\s\S]*?(?=\n\n[A-Z]|$)/i);
      
      if (keyTermsSection) {
        const keyTermsText = keyTermsSection[0];
        // Look for patterns like "Term: Definition" or "Term - Definition"
        const termMatches = keyTermsText.match(/([^:\n-]+)[:|-]([^\n]+)/g);
        
        if (termMatches && termMatches.length > 0) {
          const cards = termMatches.map(match => {
            const [term, definition] = match.split(/[:|-]/);
            return {
              front: term.trim(),
              back: definition.trim()
            };
          });
          setFlashcards(cards);
        } else {
          // Fallback: create some basic flashcards from the study plan
          const sentences = studyPlan.split(/[.!?]/).filter(s => s.trim().length > 20);
          const cards = sentences.slice(0, 10).map(sentence => ({
            front: `What is the meaning of: "${sentence.trim().substring(0, 50)}..."?`,
            back: sentence.trim()
          }));
          setFlashcards(cards);
        }
      } else {
        // Fallback: create some basic flashcards from the study plan
        const sentences = studyPlan.split(/[.!?]/).filter(s => s.trim().length > 20);
        const cards = sentences.slice(0, 10).map(sentence => ({
          front: `What is the meaning of: "${sentence.trim().substring(0, 50)}..."?`,
          back: sentence.trim()
        }));
        setFlashcards(cards);
      }
    } catch (error) {
      console.error('Error extracting flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract quiz questions from the study plan
  const extractQuizQuestions = () => {
    try {
      setLoading(true);
      // Simple extraction logic - look for practice questions
      const questionsSection = studyPlan.match(/practice questions[\s\S]*?(?=\n\n[A-Z]|$)/i);
      
      if (questionsSection) {
        const questionsText = questionsSection[0];
        // Look for patterns like "1. Question" followed by "Answer: ..."
        const questionMatches = questionsText.match(/\d+\.\s+([^\n]+)[\s\S]*?Answer:\s+([^\n]+)/g);
        
        if (questionMatches && questionMatches.length > 0) {
          const questions = questionMatches.map((match, index) => {
            const questionText = match.match(/\d+\.\s+([^\n]+)/)[1];
            const answerText = match.match(/Answer:\s+([^\n]+)/)[1];
            
            // Generate fake options with one correct answer
            const options = [
              answerText,
              `Incorrect option 1 for question ${index + 1}`,
              `Incorrect option 2 for question ${index + 1}`,
              `Incorrect option 3 for question ${index + 1}`
            ];
            
            // Shuffle options
            for (let i = options.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [options[i], options[j]] = [options[j], options[i]];
            }
            
            const correctIndex = options.indexOf(answerText);
            
            return {
              question: questionText,
              options: options,
              correctAnswer: correctIndex,
              explanation: `The correct answer is: ${answerText}`
            };
          });
          
          setQuizQuestions(questions);
        } else {
          // Fallback: create some basic questions from the study plan
          createBasicQuestions();
        }
      } else {
        // Fallback: create some basic questions from the study plan
        createBasicQuestions();
      }
    } catch (error) {
      console.error('Error extracting quiz questions:', error);
      createBasicQuestions();
    } finally {
      setLoading(false);
    }
  };

  const createBasicQuestions = () => {
    // Create simple true/false questions from the study plan
    const sentences = studyPlan.split(/[.!?]/).filter(s => s.trim().length > 20);
    const questions = sentences.slice(0, 5).map((sentence, index) => ({
      question: `True or False: ${sentence.trim()}`,
      options: ['True', 'False', 'Cannot determine', 'Partially true'],
      correctAnswer: 0, // Assume true for simplicity
      explanation: `This statement is taken directly from the study materials.`
    }));
    setQuizQuestions(questions);
  };

  const generateChatbotPrompt = () => {
    // Create a prompt for the AI chatbot based on the study plan
    const prompt = `
    You are an AI study assistant helping a student prepare for an exam on the following topics:
    
    ${studyPlan.substring(0, 500)}...
    
    Your role is to:
    1. Answer questions about the content
    2. Explain concepts in simple terms
    3. Provide additional examples
    4. Help the student test their knowledge
    
    Be concise, helpful, and encouraging.
    `;
    
    setChatbotPrompt(prompt);
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
  };

  const handlePreviousCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prevIndex) => (prevIndex - 1 + flashcards.length) % flashcards.length);
  };

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: optionIndex
    });
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((prevIndex) => (prevIndex + 1) % quizQuestions.length);
  };

  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex((prevIndex) => (prevIndex - 1 + quizQuestions.length) % quizQuestions.length);
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setShowResults(false);
    setCurrentQuestionIndex(0);
  };

  const calculateScore = () => {
    let correct = 0;
    Object.keys(selectedAnswers).forEach(questionIndex => {
      if (selectedAnswers[questionIndex] === quizQuestions[questionIndex].correctAnswer) {
        correct++;
      }
    });
    
    return {
      correct,
      total: quizQuestions.length,
      percentage: Math.round((correct / quizQuestions.length) * 100)
    };
  };

  const handleSendQuestion = async () => {
    if (!userQuestion.trim()) return;
    
    try {
      setChatLoading(true);
      
      // Add user question to chat history
      const userMessage = {
        id: Date.now(),
        text: userQuestion,
        sender: 'user'
      };
      
      setChatHistory(prev => [...prev, userMessage]);
      
      // Get AI response
      const fullPrompt = `${chatbotPrompt}\n\nStudent question: ${userQuestion}`;
      const response = await getGeminiResponse(fullPrompt);
      
      // Add AI response to chat history
      const aiMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'ai'
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
      setUserQuestion('');
    } catch (error) {
      console.error('Error getting response:', error);
      
      // Add error message to chat history
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai'
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  // Render flashcards
  const renderFlashcards = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (flashcards.length === 0) {
      return (
        <Typography variant="body1" sx={{ p: 4, textAlign: 'center' }}>
          No flashcards available. Try refreshing or generating new ones.
        </Typography>
      );
    }

    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1">
            Card {currentCardIndex + 1} of {flashcards.length}
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<FlipIcon />}
            onClick={handleFlipCard}
          >
            Flip Card
          </Button>
        </Box>
        
        <Card 
          sx={{ 
            height: 300, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.6s',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative',
            mb: 3
          }}
          onClick={handleFlipCard}
        >
          <CardContent 
            sx={{ 
              backfaceVisibility: 'hidden',
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              textAlign: 'center',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              opacity: isFlipped ? 0 : 1
            }}
          >
            <Typography variant="h5">
              {flashcards[currentCardIndex]?.front || 'No content'}
            </Typography>
          </CardContent>
          
          <CardContent 
            sx={{ 
              backfaceVisibility: 'hidden',
              position: 'absolute',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              textAlign: 'center',
              transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
              opacity: isFlipped ? 1 : 0
            }}
          >
            <Typography variant="body1">
              {flashcards[currentCardIndex]?.back || 'No content'}
            </Typography>
          </CardContent>
        </Card>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<NavigateBeforeIcon />}
            onClick={handlePreviousCard}
          >
            Previous
          </Button>
          <Button 
            variant="contained" 
            endIcon={<NavigateNextIcon />}
            onClick={handleNextCard}
          >
            Next
          </Button>
        </Box>
      </Box>
    );
  };

  // Render quiz
  const renderQuiz = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (quizQuestions.length === 0) {
      return (
        <Typography variant="body1" sx={{ p: 4, textAlign: 'center' }}>
          No quiz questions available. Try refreshing or generating new ones.
        </Typography>
      );
    }

    if (showResults) {
      const score = calculateScore();
      
      return (
        <Box sx={{ p: 3 }}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              mb: 3, 
              bgcolor: score.percentage >= 70 ? 'success.light' : 'error.light',
              color: 'white'
            }}
          >
            <Typography variant="h5" gutterBottom>Quiz Results</Typography>
            <Typography variant="h3" gutterBottom>{score.percentage}%</Typography>
            <Typography variant="body1">
              You got {score.correct} out of {score.total} questions correct.
            </Typography>
          </Paper>
          
          <Typography variant="h6" gutterBottom>Review Questions</Typography>
          
          {quizQuestions.map((question, index) => (
            <Paper key={index} elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Question {index + 1}: {question.question}
              </Typography>
              
              {question.options.map((option, optIndex) => {
                const isSelected = selectedAnswers[index] === optIndex;
                const isCorrect = question.correctAnswer === optIndex;
                
                let color = 'default';
                if (isSelected && isCorrect) color = 'success';
                else if (isSelected && !isCorrect) color = 'error';
                else if (!isSelected && isCorrect) color = 'success';
                
                return (
                  <Box 
                    key={optIndex} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      mb: 1,
                      color: isSelected && !isCorrect ? 'error.main' : 
                             (isCorrect ? 'success.main' : 'text.primary')
                    }}
                  >
                    {isSelected && isCorrect && <CheckCircleIcon color="success" sx={{ mr: 1 }} />}
                    {isSelected && !isCorrect && <RadioButtonUncheckedIcon color="error" sx={{ mr: 1 }} />}
                    {!isSelected && isCorrect && <CheckCircleIcon color="success" sx={{ mr: 1 }} />}
                    {!isSelected && !isCorrect && <RadioButtonUncheckedIcon color="disabled" sx={{ mr: 1 }} />}
                    <Typography variant="body2">
                      {option}
                    </Typography>
                  </Box>
                );
              })}
              
              {selectedAnswers[index] !== undefined && (
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  {question.explanation}
                </Typography>
              )}
            </Paper>
          ))}
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleResetQuiz}
            sx={{ mt: 2 }}
          >
            Retake Quiz
          </Button>
        </Box>
      );
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isAnswered = selectedAnswers[currentQuestionIndex] !== undefined;
    
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1">
            Question {currentQuestionIndex + 1} of {quizQuestions.length}
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSubmitQuiz}
            disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
          >
            Submit Quiz
          </Button>
        </Box>
        
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {currentQuestion?.question || 'No question available'}
          </Typography>
          
          {currentQuestion?.options.map((option, index) => (
            <Button
              key={index}
              variant={selectedAnswers[currentQuestionIndex] === index ? 'contained' : 'outlined'}
              color={selectedAnswers[currentQuestionIndex] === index ? 'primary' : 'inherit'}
              fullWidth
              sx={{ mb: 1, justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => handleAnswerSelect(currentQuestionIndex, index)}
            >
              {option}
            </Button>
          ))}
        </Paper>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            variant="outlined" 
            startIcon={<NavigateBeforeIcon />}
            onClick={handlePreviousQuestion}
          >
            Previous
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {quizQuestions.map((_, index) => (
              <Chip 
                key={index}
                label={index + 1}
                color={selectedAnswers[index] !== undefined ? 'primary' : 'default'}
                variant={currentQuestionIndex === index ? 'filled' : 'outlined'}
                onClick={() => setCurrentQuestionIndex(index)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
          
          <Button 
            variant="outlined" 
            endIcon={<NavigateNextIcon />}
            onClick={handleNextQuestion}
          >
            Next
          </Button>
        </Box>
      </Box>
    );
  };

  // Render chatbot
  const renderChatbot = () => {
    return (
      <Box sx={{ p: 3, height: '500px', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Study Assistant
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ask questions about your study materials and get instant help
        </Typography>
        
        <Box 
          sx={{ 
            flex: 1, 
            bgcolor: 'background.paper', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            mb: 2,
            overflow: 'auto',
            p: 2
          }}
        >
          {chatHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 10 }}>
              Ask a question to get started
            </Typography>
          ) : (
            chatHistory.map(message => (
              <Box 
                key={message.id}
                sx={{ 
                  display: 'flex', 
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2
                }}
              >
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 2, 
                    maxWidth: '80%',
                    bgcolor: message.sender === 'user' ? 'primary.light' : 'background.default',
                    color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary'
                  }}
                >
                  <Typography variant="body2">
                    {message.text}
                  </Typography>
                </Paper>
              </Box>
            ))
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Ask a question about your study materials..."
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendQuestion()}
            disabled={chatLoading}
          />
          <Button
            variant="contained"
            onClick={handleSendQuestion}
            disabled={!userQuestion.trim() || chatLoading}
          >
            {chatLoading ? <CircularProgress size={24} /> : 'Send'}
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Flashcards" />
          <Tab label="Quiz" />
        </Tabs>
      </Paper>
      
      {activeTab === 0 && renderFlashcards()}
      {activeTab === 1 && renderQuiz()}
    </Box>
  );
};

export default InteractiveStudyTools;
