import { initGoogleApi } from './google';

// Constants for localStorage
const AUTH_TOKEN_KEY = 'eduzen_google_auth_token';
const AUTH_PROFILE_KEY = 'eduzen_user_profile';
const AUTH_EXPIRY_KEY = 'eduzen_auth_expiry';

export const initializeGoogleServices = async () => {
  try {
    await initGoogleApi();
    console.log('Google APIs initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Google APIs:', error);
    return false;
  }
};

// Save auth data to localStorage
export const saveAuthData = (token, profile, expiryInMinutes = 60) => {
  try {
    const expiryTime = new Date().getTime() + (expiryInMinutes * 60 * 1000);
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString());
    console.log('Auth data saved to localStorage');
  } catch (error) {
    console.error('Error saving auth data:', error);
  }
};

// Get saved auth data from localStorage
export const getSavedAuthData = () => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const profileString = localStorage.getItem(AUTH_PROFILE_KEY);
    const expiryTime = localStorage.getItem(AUTH_EXPIRY_KEY);
    
    if (!token || !profileString || !expiryTime) {
      return null;
    }
    
    // Check if token is expired
    const now = new Date().getTime();
    if (now > parseInt(expiryTime, 10)) {
      clearAuthData();
      return null;
    }
    
    return {
      token,
      profile: JSON.parse(profileString)
    };
  } catch (error) {
    console.error('Error getting saved auth data:', error);
    return null;
  }
};

// Clear auth data from localStorage
export const clearAuthData = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_PROFILE_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    console.log('Auth data cleared from localStorage');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const checkGoogleAuthStatus = () => {
  try {
    // First check localStorage
    const savedAuth = getSavedAuthData();
    if (savedAuth) {
      console.log('Found saved auth data');
      return true;
    }
    
    // Then check Google API
    if (window.gapi && window.gapi.auth2 && window.gapi.auth2.getAuthInstance()) {
      const isSignedIn = window.gapi.auth2.getAuthInstance().isSignedIn.get();
      console.log('Google API auth status:', isSignedIn);
      return isSignedIn;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking Google auth status:', error);
    return false;
  }
};

export const signInWithGoogle = async () => {
  try {
    console.log("Starting Google sign-in process...");
    
    // Remove the authorized origins check since it's working on localhost:3000
    
    if (!window.gapi || !window.gapi.auth2) {
      console.log("Google API not initialized, initializing now...");
      await initializeGoogleServices();
    }
    
    console.log("Getting auth instance...");
    const auth2 = window.gapi.auth2.getAuthInstance();
    console.log("Auth instance obtained:", auth2 ? "Yes" : "No");
    
    if (!auth2) {
      throw new Error("Google Auth not initialized properly");
    }
    
    console.log("Current origin:", window.location.origin);
    console.log("Attempting sign in...");
    
    // Try to sign in with redirect instead of popup
    // This can help with popup blockers
    try {
      // First try with basic sign in (no options)
      console.log("Attempting basic sign in...");
      const user = await auth2.signIn();
      
      // Save auth data to localStorage
      const authResponse = user.getAuthResponse();
      const profile = user.getBasicProfile();
      const profileData = {
        id: profile.getId(),
        name: profile.getName(),
        email: profile.getEmail(),
        imageUrl: profile.getImageUrl()
      };
      
      // Save with expiry based on token expiry
      const expiryInMinutes = authResponse.expires_in / 60;
      saveAuthData(authResponse.id_token, profileData, expiryInMinutes);
      
      console.log("Sign-in successful!");
      return user;
    } catch (popupError) {
      console.error("Basic sign in failed, trying with redirect:", popupError);
      
      // If we get a popup_closed_by_user error, try with redirect
      if (popupError.error === "popup_closed_by_user" || 
          popupError.error === "popup_blocked_by_browser") {
        
        console.log("Popup was blocked or closed, trying with redirect flow...");
        
        // Try the Google One Tap approach which is less likely to be blocked
        const user = await new Promise((resolve, reject) => {
          try {
            // Set up auth callback
            window.onGoogleSignIn = (googleUser) => {
              console.log("Sign-in callback received");
              
              // Save auth data to localStorage
              try {
                const authResponse = googleUser.getAuthResponse();
                const profile = googleUser.getBasicProfile();
                const profileData = {
                  id: profile.getId(),
                  name: profile.getName(),
                  email: profile.getEmail(),
                  imageUrl: profile.getImageUrl()
                };
                
                // Save with expiry based on token expiry
                const expiryInMinutes = authResponse.expires_in / 60;
                saveAuthData(authResponse.id_token, profileData, expiryInMinutes);
              } catch (e) {
                console.error("Error saving auth data from callback:", e);
              }
              
              resolve(googleUser);
            };
            
            // Use gsi if available (Google Identity Services - newer API)
            if (window.google && window.google.accounts) {
              console.log("Using Google Identity Services...");
              window.google.accounts.id.initialize({
                client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                callback: (response) => {
                  console.log("Google Identity callback received");
                  
                  // Save auth data to localStorage
                  try {
                    const token = response.credential;
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const profileData = {
                      id: payload.sub,
                      name: payload.name,
                      email: payload.email,
                      imageUrl: payload.picture
                    };
                    
                    // Google Identity tokens typically last 1 hour
                    saveAuthData(token, profileData, 60);
                  } catch (e) {
                    console.error("Error saving auth data from GSI callback:", e);
                  }
                  
                  resolve(response);
                }
              });
              window.google.accounts.id.prompt();
            } else {
              // Fallback to redirect mode
              console.log("Using redirect mode...");
              auth2.signIn({
                ux_mode: 'redirect',
                redirect_uri: window.location.origin
              }).then(user => {
                // Save auth data to localStorage
                try {
                  const authResponse = user.getAuthResponse();
                  const profile = user.getBasicProfile();
                  const profileData = {
                    id: profile.getId(),
                    name: profile.getName(),
                    email: profile.getEmail(),
                    imageUrl: profile.getImageUrl()
                  };
                  
                  // Save with expiry based on token expiry
                  const expiryInMinutes = authResponse.expires_in / 60;
                  saveAuthData(authResponse.id_token, profileData, expiryInMinutes);
                } catch (e) {
                  console.error("Error saving auth data from redirect:", e);
                }
                
                resolve(user);
              }).catch(reject);
            }
          } catch (err) {
            reject(err);
          }
        });
        
        console.log("Sign-in successful!");
        return user;
      }
      
      // If it's not a popup issue, rethrow the original error
      throw popupError;
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    
    // Log more details about the error
    if (error.error) {
      console.log("Error type:", error.error);
    }
    
    // Check if this is a popup blocked error
    if (error.error === "popup_closed_by_user" || error.error === "popup_blocked_by_browser") {
      throw new Error(
        "Google Sign-In popup was closed or blocked. Please allow popups for this site and try again."
      );
    }
    
    // Check if this is a testing mode error
    if (error.message && (
        error.message.includes("not completed the Google verification process") ||
        error.message.includes("Permission denied") ||
        error.message.includes("Authorization Error") ||
        error.message.includes("Access blocked")
    )) {
      throw new Error(
        "Google Sign-In failed: Your app is in testing mode and requires adding your email as a test user. " +
        "Please go to Google Cloud Console > APIs & Services > OAuth consent screen and add your email as a test user."
      );
    }
    
    // Check for origin issues
    if (error.details && error.details.includes("Not a valid origin")) {
      throw new Error(
        `Not a valid origin for Google Sign-In: ${window.location.origin}. ` +
        `Please open the app at http://localhost:3000 instead.`
      );
    }
    
    throw error;
  }
};

export const signOutFromGoogle = async () => {
  try {
    // Clear localStorage data
    clearAuthData();
    
    // Sign out from Google API if available
    if (window.gapi && window.gapi.auth2) {
      const auth2 = window.gapi.auth2.getAuthInstance();
      await auth2.signOut();
    }
  } catch (error) {
    console.error('Error signing out from Google:', error);
    throw error;
  }
};
