const BASE_URL = "http://localhost:8080/api/groups";

export const getAllGroups = async () => {
    const res = await fetch(BASE_URL);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch groups\n${res.statusText}\n${text}`);
    }
    return res.json();
}

export const createGroup = async (groupData: any) => {
    const res = await fetch(BASE_URL, {
        method: "POST",
        body: JSON.stringify(groupData),
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create group\n${res.statusText}\n${text}`);
    }
    return res.json();
}

export const deleteGroup = async (groupId: string) => {
    const res = await fetch(`${BASE_URL}/${groupId}`, {method: "DELETE"});
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to delete group\n${res.statusText}\n${text}`);
    }
    return res.json();
}