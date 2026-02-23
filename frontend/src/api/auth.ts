import api from './api';

export const login = async (credentials: any) => {
    const res = await api.post('/auth/login', credentials);
    return res.data; // Ожидаем { accessToken, refreshToken }
};

export const register = async (userData: any) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
};

export const pingServer = async () => {
    const res = await api.get('/');
    return res.data;
};