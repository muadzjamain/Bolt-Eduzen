// Import Qwen AI service for fallback
import { getQwenResponse, getQwenVisionResponse, summarizeTextWithQwen, generateQuizWithQwen, analyzeImageWithQwen, summarizePDFWithQwen } from './qwen';

// Direct implementation using fetch API
// Use the provided API key directly
const API_KEY = process.env.REACT_APP_GOOGLE_GEMINI_API_KEY;
// Using the latest API endpoint with the current model name - gemini-1.5-flash supports both text and vision
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const VISION_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const getGeminiResponse = async (query, history = [], customApiKey = null) => {
  try {
    // Use custom API key if provided, otherwise use the default one
    const apiKey = customApiKey || API_KEY;
    
    if (!apiKey || apiKey === "DEMO_KEY_REPLACE_WITH_ACTUAL_KEY") {
      // Return a mock response instead of throwing an error
      console.warn('Using demo mode: Gemini API key is not configured');
      return "I'm running in demo mode because the Gemini API key is not configured. Please set up your API key in the environment variables to enable full functionality. For now, I can only provide this placeholder response.";
    }

    console.log('Sending request to Gemini API with query:', query);

    // Add a pre-prompt to make Gemini respond like a study advisor
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

    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: history.length > 0 ? 
          [
            ...history,
            {
              role: "user",
              parts: [
                {
                  text: query
                }
              ]
            }
          ] : 
          [
            {
              role: "user",
              parts: [
                {
                  text: fullQuery
                }
              ]
            }
          ],
        
        generationConfig: {
          temperature: 0.1, // Lower temperature for more consistent responses
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', data);

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    return textResponse;
  } catch (error) {
    console.error('Error in getGeminiResponse:', error);
    // Fallback to Qwen AI when Gemini fails
    console.log('Falling back to Qwen AI service...');
    try {
      return await getQwenResponse(query, history);
    } catch (qwenError) {
      console.error('Qwen AI fallback also failed:', qwenError);
      return "I'm sorry, I encountered an issue while processing your request. Please try again later.";
    }
  }
};

// Helper function for text summarization
export const summarizeText = async (text) => {
  const prompt = `Please summarize the following text in a clear, conversational way that a student would find helpful. Focus on creating a summary that helps understand and remember the content. Avoid using any markdown formatting like asterisks for emphasis. Write as if you're directly speaking to the student:

  ${text}
  
  Remember to:
  1. Use plain, conversational language
  2. Do NOT use any markdown formatting (no asterisks, no bold, no italics)
  3. Present information in a friendly, advisor-like tone
  4. Organize key points in a logical flow
  5. Keep your summary concise but comprehensive`;
  
  return getGeminiResponse(prompt);
};

// Helper function for generating interactive last-minute study plans
export const generateLastMinuteStudyPlan = async (files, examDate, hoursUntilExam, examTopics, knowledgeLevel, additionalInstructions) => {
  try {
    // Process files to extract content
    let fileContents = [];
    let fileTypes = [];
    
    // Process each file based on its type
    for (const file of files) {
      const fileType = file.type.split('/')[0]; // 'image', 'application', 'audio', 'video'
      fileTypes.push(fileType);
      
      if (fileType === 'image') {
        // For images, we'll analyze them with Gemini Vision API
        const imageContent = await analyzeImageWithGemini(file);
        fileContents.push(`Content from image ${file.name}: ${imageContent}`);
      } else if (fileType === 'application' && file.type.includes('pdf')) {
        // For PDFs, extract text and analyze
        try {
          const pdfContent = await analyzePDFWithGemini(file);
          fileContents.push(`Content from PDF ${file.name}: ${pdfContent}`);
        } catch (error) {
          console.error(`Error analyzing PDF ${file.name}:`, error);
          fileContents.push(`Failed to extract content from PDF ${file.name}`);
        }
      } else if (fileType === 'audio') {
        // For audio files
        try {
          const audioContent = await analyzeAudioWithGemini(file);
          fileContents.push(`Content from audio ${file.name}: ${audioContent}`);
        } catch (error) {
          console.error(`Error analyzing audio ${file.name}:`, error);
          fileContents.push(`Failed to extract content from audio ${file.name}`);
        }
      } else if (fileType === 'video') {
        // For video files
        try {
          const videoContent = await analyzeVideoWithGemini(file);
          fileContents.push(`Content from video ${file.name}: ${videoContent}`);
        } catch (error) {
          console.error(`Error analyzing video ${file.name}:`, error);
          fileContents.push(`Failed to extract content from video ${file.name}`);
        }
      } else {
        fileContents.push(`Unsupported file type for ${file.name}`);
      }
    }
    
    // Calculate time remaining until exam
    let timeRemaining = '';
    if (examDate) {
      const now = new Date();
      const exam = new Date(examDate);
      const diffMs = exam - now;
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      timeRemaining = `${diffHours} hours`;
    } else if (hoursUntilExam) {
      timeRemaining = `${hoursUntilExam} hours`;
    }
    
    // Create the prompt for Gemini
    const prompt = `
    You are an expert study advisor helping a student prepare for an upcoming exam. Create a comprehensive, focused, and INTERACTIVE last-minute study plan based on the following information:
    
    EXAM DETAILS:
    - Time remaining until exam: ${timeRemaining}
    - Exam topics: ${examTopics}
    - Student's knowledge level: ${knowledgeLevel}
    - Additional instructions: ${additionalInstructions || 'None provided'}
    
    STUDY MATERIALS CONTENT:
    ${fileContents.join('\n\n')}
    
    Please create a last-minute study plan that includes:
    
    1. A brief summary of the key concepts that will likely be on the exam
    2. A prioritized list of topics to focus on based on importance and the student's knowledge level
    3. A detailed hour-by-hour study schedule that makes the best use of the remaining time
    4. INTERACTIVE ELEMENTS: Create 5-10 practice questions with answers in a format that can be used as flashcards
    5. INTERACTIVE ELEMENTS: Create a set of 5-10 key terms with definitions that are critical to understand
    6. Memory aids like mnemonics or diagrams for difficult concepts
    7. Last-minute review tips for just before the exam
    
    Format the study plan in a clear, organized way that's easy to follow under time pressure. Use headers, bullet points, and numbered lists to make the information scannable.
    
    IMPORTANT: Format the practice questions and key terms in a way that's easy to convert into interactive elements. For each practice question, clearly separate the question from the answer. For key terms, clearly separate the term from its definition.
    `;
    
    // Get response from Gemini
    const response = await getGeminiResponse(prompt);
    return response;
  } catch (error) {
    console.error('Error generating last-minute study plan:', error);
    throw error;
  }
};

// Helper function for quiz generation
export const generateQuiz = async (text, numQuestions = 5) => {
  try {
    console.log(`Generating quiz with ${numQuestions} questions`);
    const prompt = `Based on the following content, create a quiz with EXACTLY ${numQuestions} multiple-choice questions to test understanding of the key concepts. You MUST create EXACTLY ${numQuestions} questions, no more and no less. Format the response as a JSON array of objects, where each object represents a question with the following structure:
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0 // Index of the correct answer (0-based)
    }
    
    Content to create questions from:
    ${text}
    
    Important guidelines:
    1. Use plain, conversational language in your questions
    2. Do NOT use any markdown formatting (no asterisks, no bold, no italics)
    3. Make sure each question has exactly 4 options
    4. Ensure the correctAnswer index is valid (0-3)
    5. Make questions that test understanding, not just recall
    6. Write in a friendly, conversational tone as if you're a helpful advisor or tutor
    7. YOU MUST CREATE EXACTLY ${numQuestions} QUESTIONS
    
    Return ONLY the JSON array without any additional text or explanation.`;
    
    const response = await getGeminiResponse(prompt);
    
    try {
      // Find JSON array in the response text
      const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsedQuiz = JSON.parse(jsonStr);
        
        // Ensure we have exactly the requested number of questions
        if (parsedQuiz.length === numQuestions) {
          return parsedQuiz;
        } else {
          console.log(`Expected ${numQuestions} questions but got ${parsedQuiz.length}. Adjusting...`);
          
          // If we have too few questions, add more
          if (parsedQuiz.length < numQuestions) {
            const additionalQuestions = await generateTextQuiz(text, numQuestions - parsedQuiz.length);
            return [...parsedQuiz, ...additionalQuestions];
          } 
          // If we have too many questions, trim the excess
          else {
            return parsedQuiz.slice(0, numQuestions);
          }
        }
      } else {
        console.error('Could not extract valid JSON array from response');
        return generateTextQuiz(text, numQuestions);
      }
    } catch (error) {
      console.error('Error parsing quiz JSON:', error);
      return generateTextQuiz(text, numQuestions);
    }
  } catch (error) {
    console.error('Error generating quiz:', error);
    // Fallback to Qwen AI for quiz generation
    try {
      return await generateQuizWithQwen(text, numQuestions);
    } catch (qwenError) {
      console.error('Qwen AI fallback also failed:', qwenError);
      return "I'm sorry, I encountered an issue while generating the quiz. Please try again later.";
    }
  }
};

// Fallback function for text-based quiz generation
export const generateTextQuiz = async (text, numQuestions = 5) => {
  try {
    // Create a simple fallback quiz with the requested number of questions
    const fallbackQuiz = [];
    
    // Add the specified number of questions
    for (let i = 0; i < numQuestions; i++) {
      fallbackQuiz.push({
        question: `Question ${i+1} about the content?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: Math.floor(Math.random() * 4) // Random correct answer
      });
    }
    
    return fallbackQuiz;
  } catch (error) {
    console.error('Error generating text quiz:', error);
    throw error;
  }
};

// Function to analyze images with Gemini
export const analyzeImageWithGemini = async (imageFile) => {
  try {
    if (!API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    console.log('Preparing image for Gemini API analysis');
    
    // Convert image to base64
    const base64Image = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(imageFile);
    });
    
    // Use the latest Gemini model for image analysis (gemini-1.5-flash)
    const visionApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    console.log('Sending image to Gemini Vision API');
    
    const response = await fetch(`${visionApiUrl}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Extract all the text from this image. Then, provide a comprehensive analysis of the content in a conversational, advisor-like tone. Focus on key concepts, definitions, and important points. Format your response as plain text without any markdown formatting like asterisks for bold or emphasis. Write as if you're directly speaking to a student who wants to learn this material."
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini Vision API error:', response.status, errorData);
      throw new Error(`Gemini Vision API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini Vision API response received');

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Empty response from Gemini Vision API');
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    return textResponse;
  } catch (error) {
    console.error('Error in analyzeImageWithGemini:', error);
    // Fallback to Qwen AI for image analysis
    try {
      return await analyzeImageWithQwen(imageFile);
    } catch (qwenError) {
      console.error('Qwen AI fallback also failed:', qwenError);
      return "I'm sorry, I encountered an issue while analyzing the image. Please try again later.";
    }
  }
};

// Format text by removing markdown formatting
export const formatText = (text) => {
  if (!text) return '';
  
  // Remove bold formatting
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '$1');
  
  // Remove italic formatting
  formatted = formatted.replace(/\*(.*?)\*/g, '$1');
  
  // Remove code blocks
  formatted = formatted.replace(/```(.*?)```/gs, '$1');
  
  // Remove inline code
  formatted = formatted.replace(/`(.*?)`/g, '$1');
  
  // Remove headers
  formatted = formatted.replace(/#{1,6}\s+(.+)/g, '$1');
  
  return formatted;
};

// Summarize PDF text using Gemini API
export const summarizePDFWithGemini = async (pdfText) => {
  try {
    const prompt = `
    Please summarize the following PDF content in a clear, conversational way that a student would find helpful. Focus on the key concepts, main points, and important details. 
    
    PDF content:
    ${pdfText}
    
    Important guidelines:
    1. Use plain, conversational language
    2. Do NOT use any markdown formatting (no asterisks, no bold, no italics)
    3. Present information in a friendly, advisor-like tone
    4. Organize key points in a logical flow
    5. Keep your summary concise but comprehensive
    `;
    
    return getGeminiResponse(prompt);
  } catch (error) {
    console.error('Error summarizing PDF with Gemini:', error);
    // Fallback to Qwen AI for PDF summarization
    try {
      return await summarizePDFWithQwen(pdfText);
    } catch (qwenError) {
      console.error('Qwen AI fallback also failed:', qwenError);
      return "I'm sorry, I encountered an issue while summarizing the PDF. Please try again later.";
    }
  }
};

// Analyze multiple files (images and PDFs) together using Gemini multimodal API
export const analyzeMultipleFilesWithGemini = async (files) => {
  try {
    if (!API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    console.log('Preparing multiple files for Gemini API analysis', files);
    
    // Prepare parts array for the API request
    const parts = [
      {
        text: `I'm uploading ${files.length} file(s) for you to analyze. This includes ${files.map(f => `"${f.name}" (${f.type})`).join(', ')}.

IMPORTANT INSTRUCTIONS:
1. Analyze ALL files thoroughly and EQUALLY. Do not focus only on the first file.
2. Create a COMPREHENSIVE SUMMARY that integrates information from ALL the files.
3. If there are multiple PDF documents, make sure to analyze the content of EACH document.
4. Extract and summarize the ACTUAL CONTENT from each file - key concepts, facts, data, and important points.
5. DO NOT provide generic advice about how to study these materials.
6. If analyzing multiple PDFs, clearly identify information from each document in your summary.
7. Format your response as plain text without any markdown formatting.
8. Write as if you're directly explaining the content to someone who hasn't seen any of these files.
9. Make sure your summary covers ALL the important information from EVERY file provided.

Your task is to create a single, cohesive summary that accurately represents ALL the content I've uploaded.`
      }
    ];
    
    // Process each file and add to parts array
    for (const fileObj of files) {
      if (fileObj.type === 'image') {
        // Convert image to base64
        const base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(fileObj.file);
        });
        
        parts.push({
          inline_data: {
            mime_type: fileObj.file.type,
            data: base64Image
          }
        });
      } else if (fileObj.type === 'pdf') {
        if (fileObj.text) {
          // Add PDF text content with a more detailed prompt
          parts.push({
            text: `PDF DOCUMENT: "${fileObj.name}"\n\nCONTENT:\n${fileObj.text}\n\nPlease analyze this PDF document thoroughly and include its key information in the overall summary. Do not skip any important details from this document.`
          });
        } else {
          // If we don't have text content, try to use the PDF as an image
          try {
            const base64Pdf = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result.split(',')[1]);
              reader.readAsDataURL(fileObj.file);
            });
            
            parts.push({
              inline_data: {
                mime_type: fileObj.file.type,
                data: base64Pdf
              }
            });
            
            parts.push({
              text: `This is a PDF document named "${fileObj.name}". Please extract and analyze all text and visual content from this PDF.`
            });
          } catch (error) {
            console.error(`Error processing PDF file ${fileObj.name} as binary:`, error);
            parts.push({
              text: `PDF file (${fileObj.name}) could not be processed. Please provide general information about what might be in a document with this name.`
            });
          }
        }
      } else if (fileObj.type === 'audio') {
        // For audio files, convert to base64 and add directly as multimodal content
        try {
          const base64Audio = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(fileObj.file);
          });
          
          parts.push({
            inline_data: {
              mime_type: fileObj.file.type,
              data: base64Audio
            }
          });
          
          // Use a more specific prompt to ensure we get actual content summary, not just advice
          parts.push({
            text: `I've uploaded an audio file named "${fileObj.name}". Please listen to this audio and provide a DETAILED SUMMARY of its ACTUAL CONTENT. Do NOT give me generic advice about how to learn from audio. Instead, tell me specifically what is being said, what topics are covered, who is speaking if identifiable, and any key information presented. Transcribe important quotes if possible. Describe the audio as if you're explaining its content to someone who hasn't heard it.`
          });
        } catch (error) {
          console.error(`Error processing audio file ${fileObj.name}:`, error);
          // If we can't process the audio directly, add a placeholder
          parts.push({
            text: `Audio file (${fileObj.name}) could not be processed directly. Please provide general guidance on analyzing audio content.`
          });
        }
      } else if (fileObj.type === 'video') {
        // For video files, convert to base64 and add directly as multimodal content
        try {
          const base64Video = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(fileObj.file);
          });
          
          parts.push({
            inline_data: {
              mime_type: fileObj.file.type,
              data: base64Video
            }
          });
          
          // Use a more specific prompt to ensure we get actual content summary, not just advice
          parts.push({
            text: `I've uploaded a video file named "${fileObj.name}". Please watch this video and provide a DETAILED SUMMARY of its ACTUAL CONTENT. Do NOT give me generic advice about how to learn from videos. Instead, tell me specifically what this video shows, what topics it covers, what is being demonstrated or taught, and any key information presented. Describe the video as if you're explaining its content to someone who hasn't seen it.`
          });
        } catch (error) {
          console.error(`Error processing video file ${fileObj.name}:`, error);
          // If we can't process the video directly, add a placeholder
          parts.push({
            text: `Video file (${fileObj.name}) could not be processed directly. Please provide general guidance on analyzing video content.`
          });
        }
      }
    }
    
    // Use the latest Gemini model for multimodal analysis
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    console.log('Sending multiple files to Gemini API');
    
    const response = await fetch(`${apiUrl}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: parts
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API multimodal response received');

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    return textResponse;
  } catch (error) {
    console.error('Error in analyzeMultipleFilesWithGemini:', error);
    throw error;
  }
};

// Analyze audio content directly using Gemini API
export const analyzeAudioWithGemini = async (audioFile) => {
  try {
    if (!API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    console.log('Preparing audio for Gemini API analysis');
    
    // Convert audio to base64
    const base64Audio = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(audioFile);
    });
    
    // Use the latest Gemini model for audio analysis
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    console.log('Sending audio to Gemini API');
    
    const response = await fetch(`${apiUrl}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "I've uploaded an audio file. Please listen to this audio and provide a DETAILED SUMMARY of its ACTUAL CONTENT. Do NOT give me generic advice about how to learn from audio. Instead, tell me specifically what is being said, what topics are covered, who is speaking if identifiable, and any key information presented. Transcribe important quotes if possible. Describe the audio as if you're explaining its content to someone who hasn't heard it."
              },
              {
                inline_data: {
                  mime_type: audioFile.type,
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API audio analysis response received');

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    return textResponse;
  } catch (error) {
    console.error('Error in analyzeAudioWithGemini:', error);
    throw error;
  }
};

// Analyze video content directly using Gemini API
export const analyzeVideoWithGemini = async (videoFile) => {
  try {
    if (!API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    console.log('Preparing video for Gemini API analysis');
    
    // Convert video to base64
    const base64Video = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(videoFile);
    });
    
    // Use the latest Gemini model for video analysis
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    
    console.log('Sending video to Gemini API');
    
    const response = await fetch(`${apiUrl}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "I've uploaded a video file. Please watch this video and provide a DETAILED SUMMARY of its ACTUAL CONTENT. Do NOT give me generic advice about how to learn from videos. Instead, tell me specifically what this video shows, what topics it covers, what is being demonstrated or taught, and any key information presented. Describe the video as if you're explaining its content to someone who hasn't seen it."
              },
              {
                inline_data: {
                  mime_type: videoFile.type,
                  data: base64Video
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API video analysis response received');

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    return textResponse;
  } catch (error) {
    console.error('Error in analyzeVideoWithGemini:', error);
    throw error;
  }
};

// Generate quiz questions from PDF content using Gemini API
export const generatePDFQuiz = async (pdfText, numQuestions = 5) => {
  try {
    console.log(`Generating PDF quiz with ${numQuestions} questions`);
    const prompt = `
    Based on the following PDF content, create a quiz with EXACTLY ${numQuestions} multiple-choice questions to test understanding of the key concepts. You MUST create EXACTLY ${numQuestions} questions, no more and no less. Format the response as a JSON array of objects, where each object represents a question with the following structure:
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0 // Index of the correct answer (0-based)
    }
    
    PDF content:
    ${pdfText}
    
    Important guidelines:
    1. Use plain, conversational language in your questions
    2. Do NOT use any markdown formatting (no asterisks, no bold, no italics)
    3. Make sure each question has exactly 4 options
    4. Ensure the correctAnswer index is valid (0-3)
    5. Make questions that test understanding, not just recall
    6. Write in a friendly, conversational tone as if you're a helpful advisor or tutor
    7. YOU MUST CREATE EXACTLY ${numQuestions} QUESTIONS
    
    Return ONLY the JSON array without any additional text or explanation.
    `;
    
    const response = await getGeminiResponse(prompt);
    
    try {
      // Find JSON array in the response text
      const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsedQuiz = JSON.parse(jsonStr);
        
        // Ensure we have exactly the requested number of questions
        if (parsedQuiz.length === numQuestions) {
          return parsedQuiz;
        } else {
          console.log(`Expected ${numQuestions} questions but got ${parsedQuiz.length}. Adjusting...`);
          
          // If we have too few questions, add more
          if (parsedQuiz.length < numQuestions) {
            const additionalQuestions = await generateTextQuiz(pdfText, numQuestions - parsedQuiz.length);
            return [...parsedQuiz, ...additionalQuestions];
          } 
          // If we have too many questions, trim the excess
          else {
            return parsedQuiz.slice(0, numQuestions);
          }
        }
      } else {
        console.error('Could not extract valid JSON array from response');
        return generateTextQuiz(pdfText, numQuestions);
      }
    } catch (error) {
      console.error('Error parsing PDF quiz JSON:', error);
      return generateTextQuiz(pdfText, numQuestions);
    }
  } catch (error) {
    console.error('Error generating PDF quiz:', error);
    return generateTextQuiz(pdfText, numQuestions);
  }
};

// Analyze PDF with Gemini Vision API
export const analyzePDFWithGemini = async (pdfFile) => {
  try {
    // Convert PDF to base64
    const base64PDF = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(pdfFile);
    });

    // Prepare the request body for Gemini Vision API
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Please analyze this PDF document and extract all the text content. Then provide a comprehensive summary of the key concepts, main points, and important details. Focus on creating a response that would help a student understand and learn from this material.

              Important guidelines:
              1. Use plain, conversational language
              2. Do NOT use any markdown formatting (no asterisks, no bold, no italics)
              3. Present information in a friendly, advisor-like tone as if you're directly speaking to the student
              4. Organize key points in a logical flow
              5. Keep your summary concise but comprehensive
              
              The PDF is titled: "${pdfFile.name}"
              `
            },
            {
              inline_data: {
                mime_type: pdfFile.type,
                data: base64PDF
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      }
    };

    // Make the API request
    const response = await fetch(`${VISION_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini Vision API error:', errorData);
      throw new Error(`Gemini Vision API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini Vision API');
    }

    // Extract the text from the response
    const text = data.candidates[0].content.parts[0].text;
    return text;
  } catch (error) {
    console.error('Error analyzing PDF with Gemini:', error);
    throw error;
  }
};

/**
 * Generate a study plan from PDF content using Gemini API
 * @param {string} pdfContent - The content extracted from a PDF
 * @param {Object} preferences - User preferences for the study plan
 * @returns {Promise<Object>} - The generated study plan
 */
export const generatePDFStudyPlan = async (pdfContent, preferences) => {
  try {
    const { difficulty, timeAvailable, daysToComplete, learningStyle } = preferences;
    
    const prompt = `
    Create a personalized study plan for a student based on the following PDF content and preferences.
    
    PDF content:
    ${pdfContent}
    
    Student preferences:
    - Difficulty level: ${difficulty} (1-5, where 5 is most difficult)
    - Available study time per day: ${timeAvailable} minutes
    - Days to complete: ${daysToComplete} days
    - Learning style preference: ${learningStyle}
    
    Please create a structured study plan that includes:
    1. A breakdown of topics to cover each day
    2. Recommended study sessions with durations
    3. Strategic breaks to maintain focus
    4. Review sessions to reinforce learning
    5. Practice activities or exercises
    
    Format your response as a JSON object with this structure:
    {
      "overview": "Brief overview of the study plan approach",
      "days": [
        {
          "day": 1,
          "date": "YYYY-MM-DD",
          "sessions": [
            {
              "title": "Session title",
              "type": "study|break|review|practice",
              "duration": 30,
              "topics": ["Topic 1", "Topic 2"],
              "description": "Description of what to do in this session"
            }
          ]
        }
      ],
      "tips": ["Study tip 1", "Study tip 2"]
    }
    
    Ensure the plan is realistic, balanced, and tailored to the student's preferences. Write in a friendly, conversational tone without using markdown formatting.
    `;
    
    const response = await getGeminiResponse(prompt);
    
    // Extract JSON from the response
    try {
      // Find JSON object in the response text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        return JSON.parse(jsonStr);
      } else {
        console.error('Could not extract valid JSON from response');
        throw new Error('Failed to generate a valid study plan from PDF content');
      }
    } catch (error) {
      console.error('Error parsing study plan JSON:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error generating study plan from PDF:', error);
    throw error;
  }
};

/**
 * Process a screenshot with Gemini Vision API and analyze it based on user query
 * @param {string} query - The user's question about the screenshot
 * @param {string} screenshotBase64 - Base64 encoded screenshot image
 * @param {Array} history - Chat history for context
 * @param {string} customApiKey - Custom API key provided by the user
 * @returns {Promise<string>} - AI analysis of the screenshot
 */
export const getGeminiVisionResponse = async (query, screenshotBase64, history = [], customApiKey = null) => {
  try {
    // Use custom API key if provided, otherwise use the default one
    const apiKey = customApiKey || API_KEY;
    
    if (!apiKey || apiKey === "DEMO_KEY_REPLACE_WITH_ACTUAL_KEY") {
      console.warn('Using demo mode: Gemini API key is not configured');
      return "I'm running in demo mode because the Gemini API key is not configured. Please set up your API key to enable screen analysis.";
    }

    console.log('Processing screenshot with Gemini 1.5 Flash API');
    
    // Extract the base64 data from the data URL if needed
    let base64Data = screenshotBase64;
    if (screenshotBase64.startsWith('data:')) {
      base64Data = screenshotBase64.split(',')[1];
    }
    
    // Log the first 100 characters of the base64 data to verify it's not empty
    console.log('Base64 data preview:', base64Data.substring(0, 100) + '...');

    // Create the request body with the image
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are EduZen's Screen Analysis Assistant. You are looking at a screenshot of my screen.
              You CAN see my screen because I've shared it with you as an image.
              Analyze what you see in this screenshot and answer my question: ${query}
              Be specific about what you can see in the image. Describe elements, text, and visuals you observe.
              If you can't determine something specific from the image, be honest about it.
              IMPORTANT: DO NOT say you can't see my screen or that you don't have access to it - you DO have access to this specific screenshot.`
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      }
    };

    // Make the API request
    const response = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini Vision API error:', errorData);
      throw new Error(`Gemini Vision API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini Vision API');
    }

    // Extract the text from the response
    const text = data.candidates[0].content.parts[0].text;
    return text;
  } catch (error) {
    console.error('Error analyzing screenshot with Gemini:', error);
    // Fallback to Qwen AI for vision analysis
    try {
      console.log('Falling back to Qwen Vision API...');
      return await getQwenVisionResponse(query, screenshotBase64);
    } catch (qwenError) {
      console.error('Qwen Vision API fallback also failed:', qwenError);
      return "I'm sorry, I encountered an issue while analyzing the screenshot. Please try again later.";
    }
  }
};
