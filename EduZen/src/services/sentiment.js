const API_KEY = process.env.REACT_APP_GOOGLE_CLOUD_API_KEY;
const API_ENDPOINT = 'https://language.googleapis.com/v1/documents:analyzeSentiment';

// Temporary simplified sentiment analysis until API is fixed
export const analyzeSentiment = async (text) => {
  try {
    // Simple keyword-based sentiment analysis
    const stressKeywords = [
      'stress', 'stressed', 'anxiety', 'anxious', 'worried', 'worry',
      'nervous', 'scared', 'fear', 'tired', 'exhausted', 'overwhelmed',
      'panic', 'depressed', 'sad', 'upset', 'frustrated', 'angry'
    ];

    const lowercaseText = text.toLowerCase();
    const hasStressKeywords = stressKeywords.some(keyword => 
      lowercaseText.includes(keyword)
    );

    return {
      score: hasStressKeywords ? -0.5 : 0,
      isStressed: hasStressKeywords
    };

  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {
      score: 0,
      isStressed: false
    };
  }
};
