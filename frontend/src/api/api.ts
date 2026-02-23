import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

const api = axios.create({
    baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const oldRefreshToken = localStorage.getItem('refreshToken');
                const res = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refreshToken: oldRefreshToken
                });

                if (res.status === 200) {
                    const { accessToken, refreshToken } = res.data;
                    localStorage.setItem('accessToken', accessToken);

                    if (refreshToken) {
                        localStorage.setItem('refreshToken', refreshToken);
                    }

                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
            // Очищаем мусор
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');

            // Вместо перезагрузки страницы кидаем событие.
            // App.tsx его услышит и просто переключит стейт.
            window.dispatchEvent(new Event("force-logout"));

            return Promise.reject(refreshError);
        }
        }
        return Promise.reject(error);
    }
);

export default api;