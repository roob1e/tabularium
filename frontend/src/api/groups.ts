import api from './api';

const PATH = '/api/groups';

export const getAllGroups = async () => {
    const res = await api.get(PATH);
    return res.data;
};

export const createGroup = async (groupData: any) => {
    const res = await api.post(PATH, groupData);
    return res.data;
};

export const deleteGroup = async (groupId: string) => {
    const res = await api.delete(`${PATH}/${groupId}`);
    return res.data;
};