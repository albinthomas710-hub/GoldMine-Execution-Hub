import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API,
    withCredentials: true,
});

// Attach Authorization header from localStorage as fallback for environments
// where third-party cookies are blocked.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("gm_token");
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
