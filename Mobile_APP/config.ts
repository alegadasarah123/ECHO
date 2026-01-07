// config.ts (in project root)
const API_CONFIG = {
  BASE_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    "https://echo-ebl8.onrender.com/api",

  ENDPOINTS: {
    SIGNUP_MOBILE: "/signup_mobile/",
    UPLOAD_MEMBERSHIP: "/upload-membership-proof/",
    SUBMIT_APPLICATION: "/submit-membership-application/",
  },
};

export default API_CONFIG;