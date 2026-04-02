const ENV_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();
const isBrowser = typeof window !== "undefined";
const isLocalEnv =
  isBrowser &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

// Local fallback for development only.
const fallbackBaseUrl = isLocalEnv ? "http://localhost:8000" : "";
export const HAS_CONFIGURED_API_BASE_URL = Boolean(ENV_BASE_URL) || isLocalEnv;

export const BASE_URL = (ENV_BASE_URL || fallbackBaseUrl).replace(
  /\/+$/,
  ""
);

if (isBrowser && !HAS_CONFIGURED_API_BASE_URL) {
  console.warn(
    "Missing VITE_API_BASE_URL in frontend deployment. API requests will fail until it is set."
  );
}

export const API_PATHS = {
  AUTH: {
    REGISTER: "/api/auth/register", // Signup
    LOGIN: "/api/auth/login", // Authenticate user & return JWT token
    GET_PROFILE: "/api/auth/profile", // Get logged-in user details
  },

//   IMAGE: {
//     UPLOAD_IMAGE: "/api/auth/upload-image", // Upload profile picture
//   },

  AI: {
    GENERATE_QUESTIONS: "/api/ai/generate-questions", // Generate interview questions and answers using Gemini
    GENERATE_EXPLANATION: "/api/ai/generate-explanation", // Generate concept explanation using Gemini
  },

  SESSION: {
    CREATE: "/api/sessions/create", // Create a new interview session with questions
    GET_ALL: "/api/sessions/my-sessions", // Get all user sessions
    GET_ONE: (id) => `/api/sessions/${id}`, // Get session details with questions
    DELETE: (id) => `/api/sessions/${id}`, // Delete a session
  },

  QUESTION: {
    ADD_TO_SESSION: "/api/questions/add", // Add more questions to a session
    PIN: (id) => `/api/questions/${id}/pin`, // Pin or Unpin a question
    UPDATE_NOTE: (id) => `/api/questions/${id}/note`, // Update/Add a note to a question
  },
};
