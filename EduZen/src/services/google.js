const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];

// Authorization scopes required by the API
// Only request the minimal scope needed for calendar integration
// Remove any unnecessary scopes which might trigger additional permission requests
const SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/forms https://www.googleapis.com/auth/drive';

// Google API configuration
export const initGoogleApi = () => {
  return new Promise((resolve, reject) => {
    try {
      console.log("Initializing Google API...");
      console.log("Current origin:", window.location.origin);
      
      // Check if gapi is already loaded
      if (window.gapi && window.gapi.auth2 && window.gapi.auth2.getAuthInstance()) {
        console.log('Google API already loaded and initialized');
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        window.gapi.load('client:auth2', () => {
          console.log("Google API script loaded, initializing client...");
          
          // Get the current origin for better error messages
          const currentOrigin = window.location.origin;
          console.log("Initializing with origin:", currentOrigin);
          
          // Use the simplest configuration possible to avoid errors
          window.gapi.client.init({
            apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
            clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/forms https://www.googleapis.com/auth/drive',
            discoveryDocs: [
              'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
              'https://www.googleapis.com/discovery/v1/apis/forms/v1/rest',
              'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
            ]
          }).then(() => {
            console.log('Google API initialized successfully');
            resolve();
          }).catch((error) => {
            console.error('Error initializing Google APIs:', error);
            
            // Check if this is an origin mismatch error
            if (error.details && error.details.includes("not a valid origin")) {
              console.error(`Your current origin (${currentOrigin}) is not authorized in Google Cloud Console.`);
              console.error(`Please add ${currentOrigin} as an authorized JavaScript origin in your OAuth client settings.`);
            }
            
            // Still resolve to allow the app to function without Google features
            resolve();
          });
        });
      };
      
      script.onerror = (error) => {
        console.error('Error loading Google API script:', error);
        // Still resolve to allow the app to function without Google features
        resolve();
      };
      
      document.body.appendChild(script);
    } catch (error) {
      console.error('Error setting up Google API:', error);
      // Still resolve to allow the app to function without Google features
      resolve();
    }
  });
};

// Export summary to Google Docs
export const exportToGoogleDocs = async (title, content) => {
  try {
    const docs = window.gapi.client.docs;
    const createResponse = await docs.documents.create({
      title: title,
    });

    const document = createResponse.result;
    await docs.documents.batchUpdate({
      documentId: document.documentId,
      requests: [{
        insertText: {
          location: { index: 1 },
          text: content,
        },
      }],
    });

    return document;
  } catch (error) {
    console.error('Error creating Google Doc:', error);
    throw error;
  }
};

// Function to create a Google Form
export const createGoogleForm = async (title, quizData) => {
  try {
    if (!window.gapi || !window.gapi.client || !window.gapi.client.forms) {
      console.error('Google Forms API not loaded');
      throw new Error('Google Forms API not loaded');
    }

    console.log('Creating Google Form with data:', quizData);

    // Create a new form
    const formResponse = await window.gapi.client.forms.forms.create({
      info: {
        title: title,
        documentTitle: title
      }
    });

    const formId = formResponse.result.formId;
    console.log('Form created with ID:', formId);

    // Prepare batch update requests for adding questions
    const batchUpdateRequests = quizData.map((question, index) => {
      return {
        createItem: {
          item: {
            title: question.title || question.question, // Support both formats
            questionItem: {
              question: {
                required: true,
                choiceQuestion: {
                  type: 'RADIO',
                  options: question.options.map(option => ({ value: option })),
                  shuffle: false
                }
              }
            }
          },
          location: {
            index: index
          }
        }
      };
    });

    // Add questions to the form
    if (batchUpdateRequests.length > 0) {
      await window.gapi.client.forms.forms.batchUpdate({
        formId: formId,
        requests: batchUpdateRequests
      });
      console.log('Questions added to form');
    }

    return formId;
  } catch (error) {
    console.error('Error creating Google Form:', error);
    throw error;
  }
};

// Schedule study session in Calendar
export const scheduleStudySession = async (summary, startTime, endTime, description = '') => {
  try {
    // Check if Google API is available
    if (!window.gapi || !window.gapi.client || !window.gapi.client.calendar) {
      console.warn('Google Calendar API not available');
      return { success: false, error: 'Google Calendar API not available' };
    }

    const event = {
      summary: summary,
      description: description,
      start: {
        dateTime: startTime.toISOString(),
      },
      end: {
        dateTime: endTime.toISOString(),
      },
      colorId: "1", // Blue
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 }
        ]
      }
    };

    const response = await window.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    return { success: true, event: response.result };
  } catch (error) {
    console.error('Error scheduling study session:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

// Schedule a break in Calendar
export const scheduleBreak = async (summary, startTime, endTime, description = '') => {
  try {
    // Check if Google API is available
    if (!window.gapi || !window.gapi.client || !window.gapi.client.calendar) {
      console.warn('Google Calendar API not available');
      return { success: false, error: 'Google Calendar API not available' };
    }

    const event = {
      summary: summary,
      description: description,
      start: {
        dateTime: startTime.toISOString(),
      },
      end: {
        dateTime: endTime.toISOString(),
      },
      colorId: "4", // Green
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 1 }
        ]
      }
    };

    const response = await window.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    return { success: true, event: response.result };
  } catch (error) {
    console.error('Error scheduling break:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};
