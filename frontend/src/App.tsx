import React, { useState } from 'react';
import { Layout, Menu, Table, Button, Modal, Form, Input, message } from 'antd';
import { DatabaseOutlined, TableOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

interface Student {
    id: number;
    name: string;
    group: string;
}

const App: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [students, setStudents] = useState<Student[]>([
        { id: 1, name: 'Иван Петров', group: '10А' },
        { id: 2, name: 'Мария Сидорова', group: '11Б' },
    ]);

    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id' },
        { title: 'ФИО', dataIndex: 'name', key: 'name' },
        { title: 'Класс', dataIndex: 'group', key: 'group' },
        { title: 'Действия', key: 'actions', render: () => <Button danger>Удалить</Button> },
    ];

    const showModal = () => setIsModalOpen(true);
    const handleCancel = () => setIsModalOpen(false);

    const onFinish = (values: any) => {
        const newStudent: Student = {
            id: students.length + 1,
            name: values.name,
            group: values.group,
        };
        setStudents([...students, newStudent]);
        message.success('Ученик добавлен!');
        setIsModalOpen(false);
    };

    return (
        <Layout style={{ height: '100vh' }}>
            <Header style={{ color: 'white', display: 'flex', alignItems: 'center' }}>
                Админка Базы Данных Учеников
            </Header>
            <Layout>
                <Sider width={200}>
                    <Menu mode="inline" defaultSelectedKeys={['1']}>
                        <Menu.Item key="1" icon={<TableOutlined />}>Ученики</Menu.Item>
                        <Menu.Item key="2" icon={<DatabaseOutlined />}>Классы</Menu.Item>
                    </Menu>
                </Sider>
                <Content style={{ padding: '20px' }}>
                    <Button type="primary" onClick={showModal} style={{ marginBottom: 16 }}>
                        Добавить ученика
                    </Button>
                    <Table dataSource={students} columns={columns} rowKey="id" />

                    <Modal title="Добавить ученика" open={isModalOpen} onCancel={handleCancel} footer={null}>
                        <Form onFinish={onFinish} layout="vertical">
                            <Form.Item name="name" label="ФИО" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="group" label="Класс" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit">Сохранить</Button>
                            </Form.Item>
                        </Form>
                    </Modal>
                </Content>
            </Layout>
        </Layout>
    );
};

export default App;