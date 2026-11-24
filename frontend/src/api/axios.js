import axios from "axios";

//const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_URL = "http://localhost:5000/api";
// const API_URL = "https://sbt2mktn-5000.uks1.devtunnels.ms/api/"; // Replace with your actual API URL
//console.log("API_URL:", API_URL);
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    // console.log("API request:", config.method?.toUpperCase(), config.url);
    // console.log("Authentication token exists:", Boolean(token));
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      //window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
