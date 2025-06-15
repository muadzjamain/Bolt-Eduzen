import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

const TestFirestore = () => {
  const [firestoreRulesUpdated, setFirestoreRulesUpdated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [testData, setTestData] = useState(null);

  const testSaveToFirestore = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      // Check if user is logged in
      const user = auth.currentUser;
      if (!user) {
        setError('You must be logged in to test Firestore. Please log in first.');
        return;
      }
      
      // Create a simple test document
      const testPlan = {
        userId: user.uid,
        name: 'Test Study Plan',
        overview: 'This is a test study plan created to verify Firestore is working.',
        days: [
          {
            day: 1,
            date: 'Monday',
            sessions: [
              {
                title: 'Test Session',
                duration: 30,
                description: 'Test session description',
                completed: false
              }
            ]
          }
        ],
        tips: ['Test tip 1', 'Test tip 2'],
        timePerDay: 60,
        difficulty: 3,
        createdAt: serverTimestamp()
      };
      
      // Try to save to Firestore
      console.log('Attempting to save test plan to Firestore...');
      const docRef = await addDoc(collection(db, 'studyPlans'), testPlan);
      
      setResult(`Test plan saved successfully with ID: ${docRef.id}`);
      console.log('Test plan saved with ID:', docRef.id);
      
      // Now try to read all documents from the collection
      const querySnapshot = await getDocs(collection(db, 'studyPlans'));
      const plans = [];
      
      querySnapshot.forEach((doc) => {
        plans.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setTestData({
        totalPlans: plans.length,
        plans: plans
      });
      
    } catch (error) {
      console.error('Error testing Firestore:', error);
      setError(`Error testing Firestore: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Firestore Test Tool
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Firestore Security Rules Issue Detected
        </Typography>
        <Typography variant="body2" paragraph>
          Your Firestore security rules are currently set to deny all access. This is why you can't save study plans.
        </Typography>
        <Typography variant="body2" paragraph>
          To fix this, you need to update your Firestore security rules in the Firebase Console:
        </Typography>
        <ol>
          <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
          <li>Select your project</li>
          <li>In the left sidebar, click on "Firestore Database"</li>
          <li>Click on the "Rules" tab</li>
          <li>Replace the current rules with the following:</li>
        </ol>
        <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, my: 2, overflow: 'auto' }}>
          <pre style={{ margin: 0 }}>{`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their own data
    match /studyPlans/{planId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Allow users to read and write their own user data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Default rule - deny access to other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`}</pre>
        </Box>
        <Typography variant="body2" paragraph>
          After updating the rules, click "Publish" and then try saving a study plan again.
        </Typography>
      </Alert>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        This tool will test if Firestore is properly configured by saving a test study plan.
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">
          Current Auth Status:
        </Typography>
        <Typography variant="body2" color={auth.currentUser ? 'success.main' : 'error.main'}>
          {auth.currentUser 
            ? `Logged in as ${auth.currentUser.email || auth.currentUser.uid}` 
            : 'Not logged in'}
        </Typography>
      </Box>
      
      <Button 
        variant="contained" 
        onClick={testSaveToFirestore}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        sx={{ mb: 2 }}
      >
        {loading ? 'Testing...' : 'Test Firestore Connection'}
      </Button>
      
      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {result}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {testData && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Found {testData.totalPlans} plans in Firestore:
          </Typography>
          
          {testData.plans.map((plan, index) => (
            <Box 
              key={plan.id} 
              sx={{ 
                p: 2, 
                mb: 1, 
                bgcolor: 'rgba(0, 0, 0, 0.03)', 
                borderRadius: 1 
              }}
            >
              <Typography variant="subtitle2">
                {index + 1}. {plan.name}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                ID: {plan.id}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                User ID: {plan.userId}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Created: {plan.createdAt ? new Date(plan.createdAt.toDate()).toLocaleString() : 'No timestamp'}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TestFirestore;
