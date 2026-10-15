import axios from 'axios';

export default async function initAuth(options = { warmUser: true }) {
  try {
    // Get CSRF cookie from Sanctum
    await axios.get('/sanctum/csrf-cookie', {
      withCredentials: true,
    });
    
    // Optionally warm up user data
    if (options.warmUser) {
      await axios.get('/api/v1/user', {
        withCredentials: true,
      });
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    return false;
  }
}