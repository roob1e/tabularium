import axios from "axios";

const api = axios.create();

const getBaseUrl = () => {
    const saved = localStorage.getItem("server") || "http://localhost:8080";
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
    localStorage.removeItem("role");
    // Диспатчим один раз — дебаунс через флаг
    if (!(window as any).__loggingOut) {
        (window as any).__loggingOut = true;
        window.dispatchEvent(new Event("force-logout"));
        setTimeout(() => { (window as any).__loggingOut = false; }, 2000);
    }
};

// Мьютекс: если refresh уже идёт — все остальные 401 ждут его результата
let refreshPromise: Promise<string> | null = null;

const doRefresh = async (): Promise<string> => {
    const rToken = localStorage.getItem("refreshToken");
    if (!rToken) {
        handleCriticalAuthError();
        throw new Error("No refresh token");
    }

    try {
        const res = await axios.post(`${getBaseUrl()}/auth/refresh`, {
            refreshToken: rToken,
        });

        const { accessToken, refreshToken, fullname } = res.data;
        localStorage.setItem("accessToken", accessToken);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
        if (fullname)     localStorage.setItem("fullname", fullname);

        window.dispatchEvent(new CustomEvent("token-refreshed", { detail: accessToken }));
        return accessToken;
    } catch {
        // Refresh не удался (токен протух или не в БД) — принудительный логаут
        handleCriticalAuthError();
        throw new Error("Refresh failed");
    } finally {
        refreshPromise = null;
    }
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const isAuthRoute = originalRequest.url?.startsWith("/auth/");
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
            originalRequest._retry = true;

            try {
                // Если refresh уже выполняется — ждём его, не запускаем новый
                if (!refreshPromise) {
                    refreshPromise = doRefresh();
                }
                const newToken = await refreshPromise;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                originalRequest.baseURL = getBaseUrl();
                return axios(originalRequest);
            } catch {
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default api;