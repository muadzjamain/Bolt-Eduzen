// Implementation of Qwen AI service as a fallback for Gemini
// This service will be used when Gemini API encounters errors

// Qwen API configuration
const QWEN_API_KEY = "YOUR_QWEN_API_KEY"; // Replace with your actual Qwen API key
const QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

/**
 * Get a response from Qwen AI
 * @param {string} query - The user's query
 * @param {Array} history - Chat history for context (optional)
 * @returns {Promise<string>} - AI response
 */
export const getQwenResponse = async (query, history = []) => {
  try {
    if (!QWEN_API_KEY || QWEN_API_KEY === "YOUR_QWEN_API_KEY") {
      console.warn('Using demo mode: Qwen API key is not configured');
      return "I'm running in demo mode because the Qwen API key is not configured. Please set up your API key to enable full functionality.";
    }

    console.log('Sending request to Qwen API with query:', query);

    // Add a pre-prompt to make Qwen respond like a study advisor
    const prePrompt = `You are EduZens's Study Companion, a supportive and knowledgeable study advisor. 
    Your role is to help students learn effectively, manage their study time, and maintain their well-being.
    
    Please follow these guidelines in all your responses:
    1. Use a warm, encouraging, and conversational tone as if you're speaking directly to the student
    2. Provide practical, actionable advice that students can immediately apply
    3. Be empathetic and understanding of the challenges students face
    4. Format your responses as plain text only - do not use markdown formatting like **bold**, *italics*, or code blocks
    5. Break complex concepts into simple, digestible explanations
    6. Offer specific study techniques, time management strategies, and well-being practices
    7. Personalize your advice based on the student's specific situation
    8. Be concise but thorough in your explanations
    9. IMPORTANT: For very short or one-word queries, provide a brief, direct response without elaborating too much. 
    10. IMPORTANT: If you receive the same query multiple times, provide the exact same response
    
    Now, please respond to the following query from the student:
    `;

    const fullQuery = prePrompt + query;

    // Format messages for Qwen API
    const messages = history.length > 0 ? 
      [
        ...history.map(msg => ({
          role: msg.role,
          content: msg.parts[0].text
        })),
        {
          role: "user",
          content: query
        }
      ] : 
      [
        {
          role: "user",
          content: fullQuery
        }
      ];

    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen-max",
        input: {
          messages: messages
        },
        parameters: {
          temperature: 0.1,
          max_tokens: 2048
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Qwen API error:', response.status, errorData);
      throw new Error(`Qwen API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Qwen API response:', data);

    // Extract the response text from Qwen API response
    const textResponse = data.output.text || "Sorry, I couldn't generate a response.";
    return textResponse;
  } catch (error) {
    console.error('Error in getQwenResponse:', error);
    throw error;
  }
};

/**
 * Process a screenshot with Qwen Vision API
 * @param {string} query - The user's question about the screenshot
 * @param {string} screenshotBase64 - Base64 encoded screenshot image
 * @returns {Promise<string>} - AI analysis of the screenshot
 */
export const getQwenVisionResponse = async (query, screenshotBase64) => {
  try {
    if (!QWEN_API_KEY || QWEN_API_KEY === "YOUR_QWEN_API_KEY") {
      console.warn('Using demo mode: Qwen API key is not configured');
      return "I'm running in demo mode because the Qwen API key is not configured. Please set up your API key to enable screen analysis.";
    }

    console.log('Processing screenshot with Qwen Vision API');
    
    // Extract the base64 data from the data URL if needed
    let base64Data = screenshotBase64;
    if (screenshotBase64.startsWith('data:')) {
      base64Data = screenshotBase64.split(',')[1];
    }
    
    // Log the first 100 characters of the base64 data to verify it's not empty
    console.log('Base64 data preview:', base64Data.substring(0, 100) + '...');

    // Create the request body with the image
    const requestBody = {
      model: "qwen-vl-max",
      input: {
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are EduZen's Screen Analysis Assistant. You are looking at a screenshot of my screen.
                You CAN see my screen because I've shared it with you as an image.
                Analyze what you see in this screenshot and answer my question: ${query}
                Be specific about what you can see in the image. Describe elements, text, and visuals you observe.
                If you can't determine something specific from the image, be honest about it.
                IMPORTANT: DO NOT say you can't see my screen or that you don't have access to it - you DO have access to this specific screenshot.`
              },
              {
                type: "image",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`
                }
              }
            ]
          }
        ]
      },
      parameters: {
        temperature: 0.2,
        max_tokens: 2048
      }
    };

    // Make the API request
    const response = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Qwen Vision API error:', errorData);
      throw new Error(`Qwen Vision API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // Extract the text from the response
    const text = data.output.text || "Sorry, I couldn't analyze the image.";
    return text;
  } catch (error) {
    console.error('Error analyzing screenshot with Qwen:', error);
    throw error;
  }
};

// Export additional functions as needed for fallback
export const summarizeTextWithQwen = async (text) => {
  try {
    const query = `Please summarize the following text in a concise way that captures the main points:
    
    ${text}`;
    
    return await getQwenResponse(query);
  } catch (error) {
    console.error('Error summarizing text with Qwen:', error);
    throw error;
  }
};

export const generateQuizWithQwen = async (text, numQuestions = 5) => {
  try {
    const query = `Generate a quiz with ${numQuestions} questions based on the following text. 
    For each question, provide multiple-choice options (A, B, C, D) and indicate the correct answer.
    
    ${text}`;
    
    return await getQwenResponse(query);
  } catch (error) {
    console.error('Error generating quiz with Qwen:', error);
    throw error;
  }
};

// Analyze image with Qwen AI
export const analyzeImageWithQwen = async (imageFile) => {
  try {
    // Convert image to base64
    const base64Image = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(imageFile);
    });
    
    // Create a query for image analysis
    const query = "Extract all the text from this image. Then, provide a comprehensive analysis of the content in a conversational, advisor-like tone.";
    
    // Use the Qwen Vision API to analyze the image
    return await getQwenVisionResponse(query, base64Image);
  } catch (error) {
    console.error('Error analyzing image with Qwen:', error);
    throw error;
  }
};

// Summarize PDF with Qwen AI
export const summarizePDFWithQwen = async (pdfText) => {
  try {
    const query = `
    Please summarize the following PDF content in a clear, conversational way that a student would find helpful. Focus on the key concepts, main points, and important details.
    
    PDF content:
    ${pdfText}
    `;
    
    return await getQwenResponse(query);
  } catch (error) {
    console.error('Error summarizing PDF with Qwen:', error);
    throw error;
  }
};
