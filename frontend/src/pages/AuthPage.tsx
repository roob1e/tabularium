import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card, Form, Input, Button, Typography, Alert, Divider } from 'antd';
import { UserOutlined, LockOutlined, IdcardOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import { login, register } from '../api/auth';

const { Title, Text } = Typography;

interface IAuthForm {
    username: string;
    fullname: string;
    password: string;
}

interface AuthPageProps {
    onLoginSuccess: (token: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { handleSubmit, control, reset, formState: { errors } } = useForm<IAuthForm>({
        defaultValues: { username: '', fullname: '', password: '' }
    });

    const onSubmit = async (data: IAuthForm) => {
        setLoading(true);
        setError(null);
        try {
            if (isLogin) {
                const res = await login({ username: data.username, password: data.password });
                localStorage.setItem('accessToken', res.accessToken);
                localStorage.setItem('refreshToken', res.refreshToken);

                onLoginSuccess(res.accessToken);
            } else {
                const res = await register(data);
                if (res && res.accessToken && res.refreshToken) {
                    localStorage.setItem('accessToken', res.accessToken);
                    localStorage.setItem('refreshToken', res.refreshToken);
                    onLoginSuccess(res.accessToken);
                } else {
                    setIsLogin(true);
                    reset();
                    alert('Регистрация завершена успешно!');
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка выполнения операции');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
            <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={2}>Tabularium</Title>
                    <Text type="secondary">{isLogin ? 'Вход в систему' : 'Новый аккаунт'}</Text>
                </div>

                {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}

                <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
                    <Form.Item validateStatus={errors.username ? 'error' : ''} help={errors.username?.message}>
                        <Controller
                            name="username"
                            control={control}
                            rules={{
                                required: 'Введите логин',
                                minLength: { value: 2, message: 'Минимум 2 символа' },
                                maxLength: { value: 15, message: 'Максимум 15 символов' }
                            }}
                            render={({ field }) => (
                                <Input {...field} prefix={<UserOutlined />} placeholder="Логин" size="large" />
                            )}
                        />
                    </Form.Item>

                    {/* Поле FULLNAME (только регистрация) */}
                    {!isLogin && (
                        <Form.Item validateStatus={errors.fullname ? 'error' : ''} help={errors.fullname?.message}>
                            <Controller
                                name="fullname"
                                control={control}
                                rules={{
                                    required: 'Введите полное имя',
                                    maxLength: { value: 100, message: 'Слишком длинное имя' }
                                }}
                                render={({ field }) => (
                                    <Input {...field} prefix={<IdcardOutlined />} placeholder="Полное имя (ФИО)" size="large" />
                                )}
                            />
                        </Form.Item>
                    )}

                    <Form.Item validateStatus={errors.password ? 'error' : ''} help={errors.password?.message}>
                        <Controller
                            name="password"
                            control={control}
                            rules={{
                                required: 'Введите пароль',
                                pattern: {
                                    value: /^(?=.*[A-Za-z]).{8,}$/,
                                    message: 'Минимум 8 символов и одна буква'
                                }
                            }}
                            render={({ field }) => (
                                <Input.Password {...field} prefix={<LockOutlined />} placeholder="Пароль" size="large" />
                            )}
                        />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" size="large" block loading={loading} icon={isLogin ? <LoginOutlined /> : <UserAddOutlined />}>
                        {isLogin ? 'Войти' : 'Зарегистрироваться'}
                    </Button>
                </Form>

                <Divider plain>или</Divider>

                <Button type="link" block onClick={() => { setIsLogin(!isLogin); setError(null); reset(); }}>
                    {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
                </Button>
            </Card>
        </div>
    );
};

export default AuthPage;