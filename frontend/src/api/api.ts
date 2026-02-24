import axios from "axios";

const BASE_URL = "http://localhost:8080";

const api = axios.create({
    baseURL: BASE_URL,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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

        if (error.response?.status === 403 && !originalRequest._retry) {
            originalRequest._retry = true;
            const rToken = localStorage.getItem("refreshToken");

            if (!rToken) {
                handleCriticalAuthError();
                return Promise.reject(error);
            }

            try {
                const res = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refreshToken: rToken,
                });

                const { accessToken, refreshToken, fullname } = res.data;

                localStorage.setItem("accessToken", accessToken);
                if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
                if (fullname) localStorage.setItem("fullname", fullname);

                window.dispatchEvent(new CustomEvent("token-refreshed", {
                    detail: { accessToken, fullname }
                }));

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                handleCriticalAuthError();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;