import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateEmail,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Constants for localStorage
const AUTH_TOKEN_KEY = 'scholarai_auth_token';
const AUTH_USER_KEY = 'scholarai_user';
const AUTH_EXPIRY_KEY = 'scholarai_auth_expiry';

/**
 * Register a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} username - User display name
 * @returns {Promise<Object>} User data
 */
export const registerWithEmailAndPassword = async (email, password, username) => {
  try {
    console.log('Starting registration process for:', email);
    
    // Check if Firebase is initialized properly
    if (!auth) {
      console.error('Firebase auth is not initialized');
      return {
        error: 'Firebase authentication is not available. Please try again later.',
        success: false
      };
    }
    
    // Create user with Firebase Auth
    console.log('Creating user with Firebase Auth...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('User created successfully:', user.uid);
    
    try {
      // Update profile with username
      console.log('Updating user profile with username...');
      await updateProfile(user, {
        displayName: username
      });
      console.log('Profile updated successfully');
      
      // Create user document in Firestore
      console.log('Creating user document in Firestore...');
      const creationTime = new Date().toISOString();
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username,
        email,
        createdAt: serverTimestamp(),
        creationTime: creationTime // Store exact creation time as ISO string
      });
      console.log('Firestore document created successfully');
    } catch (firestoreError) {
      console.error('Error creating Firestore document:', firestoreError);
      // Continue despite Firestore error - the user is still created in Auth
    }
    
    // Save user data to localStorage
    console.log('Saving user data to localStorage...');
    saveUserData(user);
    console.log('Registration process completed successfully');
    
    return {
      user: {
        uid: user.uid,
        email: user.email,
        username: username,
        photoURL: user.photoURL
      },
      success: true
    };
  } catch (error) {
    console.error("Error registering user:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    let errorMessage = "Registration failed. Please try again.";
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = "This email is already in use. Please try another one.";
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Invalid email address. Please check and try again.";
    } else if (error.code === 'auth/weak-password') {
      errorMessage = "Password is too weak. Please use a stronger password.";
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = "Network error. Please check your internet connection and try again.";
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = "Email/password registration is not enabled. Please contact support.";
    }
    
    return {
      error: errorMessage,
      success: false
    };
  }
};

/**
 * Sign in a user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data
 */
export const loginWithEmailAndPassword = async (email, password) => {
  try {
    console.log('Starting login process for:', email);
    
    // Check if Firebase is initialized properly
    if (!auth) {
      console.error('Firebase auth is not initialized');
      return {
        error: 'Firebase authentication is not available. Please try again later.',
        success: false
      };
    }
    
    // Sign in with Firebase Auth
    console.log('Signing in with Firebase Auth...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('User signed in successfully:', user.uid);
    
    try {
      // Update last login timestamp
      console.log('Updating last login timestamp in Firestore...');
      const lastLoginTime = new Date().toISOString();
      await setDoc(doc(db, "users", user.uid), {
        lastLogin: serverTimestamp(),
        lastLoginTime: lastLoginTime // Store exact login time as ISO string
      }, { merge: true });
      console.log('Last login timestamp updated successfully');
      
      // Get user data from Firestore
      console.log('Getting user data from Firestore...');
      let userData = null;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        userData = userDoc.data();
        console.log('User data retrieved successfully:', userData);
      } catch (firestoreError) {
        console.error('Error getting user data from Firestore:', firestoreError);
        // Continue despite Firestore error - we can use the Auth user data
      }
      
      // Save user data to localStorage
      console.log('Saving user data to localStorage...');
      saveUserData(user);
      console.log('Login process completed successfully');
      
      // Combine auth user and Firestore data
      const combinedUserData = {
        uid: user.uid,
        email: user.email,
        username: user.displayName || userData?.username || email.split('@')[0],
        photoURL: user.photoURL || userData?.photoURL,
        createdAt: userData?.creationTime || user.metadata?.creationTime,
        lastLoginAt: lastLoginTime || userData?.lastLoginTime || user.metadata?.lastSignInTime,
        ...userData
      };
      
      return {
        user: combinedUserData,
        success: true
      };
    } catch (updateError) {
      console.error('Error updating user data:', updateError);
      // Even if update fails, the user is still authenticated
      return {
        user: {
          uid: user.uid,
          email: user.email,
          username: user.displayName || email.split('@')[0],
          photoURL: user.photoURL
        },
        success: true
      };
    }
  } catch (error) {
    console.error("Error signing in:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    let errorMessage = "Login failed. Please check your credentials and try again.";
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorMessage = "Invalid email or password. Please try again.";
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Invalid email address. Please check and try again.";
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = "Too many failed login attempts. Please try again later.";
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = "Network error. Please check your internet connection and try again.";
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = "This account has been disabled. Please contact support.";
    }
    
    return {
      error: errorMessage,
      success: false
    };
  }
};

/**
 * Sign out the current user
 * @returns {Promise<boolean>} Success status
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    clearUserData();
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    return false;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<Object>} Success status and message
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: "Password reset email sent. Please check your inbox."
    };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    let errorMessage = "Failed to send password reset email. Please try again.";
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = "No user found with this email address.";
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Invalid email address. Please check and try again.";
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>} User data or null if not authenticated
 */
export const getCurrentUser = () => {
  return new Promise(async (resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        try {
          // Try to get additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          
          resolve({
            uid: user.uid,
            email: user.email,
            username: user.displayName,
            photoURL: user.photoURL,
            createdAt: userData?.creationTime || user.metadata?.creationTime,
            lastLoginAt: userData?.lastLoginTime || user.metadata?.lastSignInTime,
            ...userData
          });
        } catch (error) {
          console.error('Error getting user data from Firestore:', error);
          // Fallback to just auth data if Firestore fails
          resolve({
            uid: user.uid,
            email: user.email,
            username: user.displayName,
            photoURL: user.photoURL,
            createdAt: user.metadata?.creationTime,
            lastLoginAt: user.metadata?.lastSignInTime
          });
        }
      } else {
        resolve(null);
      }
    });
  });
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} Authentication status
 */
export const isAuthenticated = async () => {
  const user = await getCurrentUser();
  return user !== null;
};

/**
 * Save user data to localStorage
 * @param {Object} user - Firebase user object
 * @param {number} expiryInMinutes - Token expiry time in minutes
 */
const saveUserData = (user, expiryInMinutes = 60) => {
  try {
    const expiryTime = new Date().getTime() + (expiryInMinutes * 60 * 1000);
    
    // Get the ID token
    user.getIdToken().then((token) => {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }));
      localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString());
    });
  } catch (error) {
    console.error("Error saving user data:", error);
  }
};

/**
 * Clear user data from localStorage
 */
const clearUserData = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_EXPIRY_KEY);
};

/**
 * Get user data from localStorage
 * @returns {Object|null} User data or null if not found
 */
export const getUserFromLocalStorage = () => {
  try {
    const userJson = localStorage.getItem(AUTH_USER_KEY);
    if (!userJson) return null;
    
    const user = JSON.parse(userJson);
    const expiryTime = localStorage.getItem(AUTH_EXPIRY_KEY);
    
    // Check if token is expired
    if (expiryTime && new Date().getTime() > parseInt(expiryTime)) {
      // Token expired, clear data
      clearUserData();
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting user from localStorage:', error);
    return null;
  }
};

/**
 * Update user profile information
 * @param {Object} profileData - User profile data to update
 * @param {string} profileData.username - New username
 * @param {string} profileData.photoURL - New photo URL (optional)
 * @returns {Promise<Object>} Success status and updated user data
 */
/**
 * Change user password
 * @param {string} currentPassword - Current password for verification
 * @param {string} newPassword - New password to set
 * @returns {Promise<Object>} Success status and message
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return {
        success: false,
        error: 'No authenticated user found'
      };
    }
    
    // Re-authenticate user before changing password
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );
    
    await reauthenticateWithCredential(currentUser, credential);
    
    // Update password
    await updatePassword(currentUser, newPassword);
    
    return {
      success: true,
      message: 'Password updated successfully'
    };
  } catch (error) {
    console.error('Error changing password:', error);
    
    let errorMessage = 'Failed to change password';
    
    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Current password is incorrect';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'New password is too weak. Please use at least 6 characters';
    } else if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'This operation requires recent authentication. Please log in again';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Delete user account
 * @param {string} password - Current password for verification
 * @returns {Promise<Object>} Success status and message
 */
export const deleteAccount = async (password) => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return {
        success: false,
        error: 'No authenticated user found'
      };
    }
    
    // Re-authenticate user before deleting account
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      password
    );
    
    await reauthenticateWithCredential(currentUser, credential);
    
    // Delete user document from Firestore
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, {
      deleted: true,
      deletedAt: serverTimestamp()
    }, { merge: true });
    
    // Delete user from Firebase Auth
    await deleteUser(currentUser);
    
    // Clear local storage
    clearUserData();
    
    return {
      success: true,
      message: 'Account deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting account:', error);
    
    let errorMessage = 'Failed to delete account';
    
    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Password is incorrect';
    } else if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'This operation requires recent authentication. Please log in again';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Update user profile information
 * @param {Object} profileData - User profile data to update
 * @param {string} profileData.username - New username
 * @param {string} profileData.photoURL - New photo URL (optional)
 * @returns {Promise<Object>} Success status and updated user data
 */
export const updateUserProfile = async (profileData) => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return {
        success: false,
        error: 'No authenticated user found'
      };
    }
    
    // Update Firebase auth profile
    await updateProfile(currentUser, {
      displayName: profileData.username,
      ...(profileData.photoURL && { photoURL: profileData.photoURL })
    });
    
    // Update Firestore user document
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, {
      username: profileData.username,
      ...(profileData.photoURL && { photoURL: profileData.photoURL }),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // Get updated user data
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    
    // Update local storage
    const updatedUser = {
      uid: currentUser.uid,
      email: currentUser.email,
      username: profileData.username,
      ...(profileData.photoURL && { photoURL: profileData.photoURL }),
      ...userData
    };
    
    // Save updated user data to localStorage
    saveUserData(updatedUser);
    
    return {
      success: true,
      user: updatedUser
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to update profile'
    };
  }
};
