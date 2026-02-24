import React, { useState } from 'react';
import { Card, Input, Button, Form, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import axios from 'axios';

interface AuthPageProps {
    onLoginSuccess: (data: { accessToken: string; refreshToken: string; fullname: string }) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('login');

    const onFinish = async (values: any) => {
        setLoading(true);
        const url = activeTab === 'login'
            ? "http://localhost:8080/auth/login"
            : "http://localhost:8080/auth/register";

        try {
            const response = await axios.post(url, values);

            if (activeTab === 'login') {
                const { accessToken, refreshToken, fullname } = response.data;

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                localStorage.setItem('fullname', fullname || '');

                onLoginSuccess({ accessToken, refreshToken, fullname });
                message.success("Вход выполнен");
            } else {
                message.success("Регистрация успешна! Теперь войдите");
                setActiveTab('login');
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || "Ошибка операции");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
            <Card style={{ width: 400 }}>
                <Tabs activeKey={activeTab} onChange={setActiveTab} centered items={[
                    { key: 'login', label: 'Вход' },
                    { key: 'register', label: 'Регистрация' }
                ]} />

                <Form name="auth" onFinish={onFinish} layout="vertical" style={{ marginTop: 20 }}>
                    <Form.Item name="username" rules={[{ required: true, message: 'Введите логин' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Логин" size="large" />
                    </Form.Item>

                    {activeTab === 'register' && (
                        <Form.Item name="fullname" rules={[{ required: true, message: 'Введите ФИО' }]}>
                            <Input prefix={<UserOutlined />} placeholder="Имя и Фамилия" size="large" />
                        </Form.Item>
                    )}

                    <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            block
                            loading={loading}
                            icon={activeTab === 'login' ? <LoginOutlined /> : <UserAddOutlined />}
                        >
                            {activeTab === 'login' ? 'Войти' : 'Создать аккаунт'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default AuthPage;