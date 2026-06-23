import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('saas_token');
            sessionStorage.removeItem('saas_token');
            localStorage.removeItem('saas_user');
            sessionStorage.removeItem('saas_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
