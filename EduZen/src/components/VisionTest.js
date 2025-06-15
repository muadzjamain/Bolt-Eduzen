import React, { useState } from 'react';
import { Button, Box, Typography, Paper } from '@mui/material';
import { extractTextFromImage } from '../services/vision';

const VisionTest = () => {
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    try {
      const text = await extractTextFromImage(file);
      setResult(text);
    } catch (err) {
      setError(err.message);
      console.error('Vision API Error:', err);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Vision API Test
      </Typography>
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="vision-test-upload"
        type="file"
        onChange={handleFileUpload}
      />
      <label htmlFor="vision-test-upload">
        <Button variant="contained" component="span">
          Upload Image
        </Button>
      </label>
      
      {loading && <Typography sx={{ mt: 2 }}>Processing...</Typography>}
      
      {error && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: '#ffebee' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
      
      {result && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle1">Extracted Text:</Typography>
          <Typography>{result}</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default VisionTest;
