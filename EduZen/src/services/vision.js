const API_KEY = process.env.REACT_APP_GOOGLE_CLOUD_VISION_API_KEY;
const API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

export const extractTextFromImage = async (input) => {
  try {
    let base64Image;
    
    if (input instanceof File) {
      // If input is a File object, convert directly to base64
      base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(input);
      });
    } else if (typeof input === 'string' && input.startsWith('http')) {
      // If input is a URL, fetch and convert to base64
      const imageResponse = await fetch(input);
      const blob = await imageResponse.blob();
      base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } else {
      throw new Error('Invalid input: must be either a File object or an image URL');
    }

    const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: base64Image,
          },
          features: [{
            type: 'TEXT_DETECTION',
            maxResults: 1
          }],
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const detections = result.responses[0].textAnnotations;
    return detections.length > 0 ? detections[0].description : '';
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
};
