import axios from "axios";

const api = axios.create();

const getBaseUrl = () => {
    const saved = localStorage.getItem("server") || "http://localhost:8080";
    // BUG FIX: убираем trailing slash чтобы избежать двойного слэша
    // http://localhost:8080/ + /scheduler/date → http://localhost:8080//scheduler/date → 403
    return saved.replace(/\/+$/, "");
};

api.interceptors.request.use(
    (config) => {
        config.baseURL = getBaseUrl();
        const isAuthRoute = config.url?.startsWith("/auth/");
        if (!isAuthRoute) {
            const token = localStorage.getItem("accessToken");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

const handleCriticalAuthError = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("fullname");
    window.dispatchEvent(new Event("force-logout"));
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // BUG FIX: перехватываем только 401 (истёк токен), но НЕ 403 (нет прав).
        // Раньше 403 тоже уходил на refresh — это маскировало реальные ошибки прав доступа
        // и создавало двойной 403 в консоли при каждом запросе к /scheduler/date.
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const rToken = localStorage.getItem("refreshToken");

            if (!rToken) {
                handleCriticalAuthError();
                return Promise.reject(error);
            }

            try {
                const currentBaseUrl = getBaseUrl();
                const res = await axios.post(`${currentBaseUrl}/auth/refresh`, {
                    refreshToken: rToken,
                });

                const { accessToken, refreshToken, fullname } = res.data;

                localStorage.setItem("accessToken", accessToken);
                if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
                if (fullname) localStorage.setItem("fullname", fullname);

                window.dispatchEvent(new CustomEvent("token-refreshed", {
                    detail: accessToken,
                }));

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                originalRequest.baseURL = currentBaseUrl;

                return axios(originalRequest);
            } catch (refreshError) {
                handleCriticalAuthError();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;