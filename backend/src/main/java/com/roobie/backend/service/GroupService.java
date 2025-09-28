package com.roobie.backend.service;

import com.roobie.backend.entity.Group;
import com.roobie.backend.repository.GroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * @author assxmblxr
 */
@Service
public class GroupService {
    @Autowired private GroupRepository groupRepository;

    /**
     * Выполняет поиск группы по её имени.
     * @param name название искомой группы/класса.
     * @return Найденная группа или null.
     */
    public Group getGroup(String name) {
        return groupRepository.findByName(name).orElse(null);
    }

    /**
     * Возвращает список из всех групп.
     * @return Список всех групп.
     */
    public List<Group> getAllGroups() {
        return groupRepository.findAll();
    }

    /**
     * Создаёт запись в таблице groups в БД.
     * @param group объект класса Group, который нужно записать в БД.
     * @return Созданный объект группы.
     */
    public Group createGroup(Group group) {
        return groupRepository.save(group);
    }

    /**
     * Удаляет группу, принимая её уникальное название.
     * @param name название группы.
     * @return true, если группа найдена и удалена, иначе false.
     */
    public boolean deleteGroup(String name) {
        return groupRepository.findById(name)
                .map(group -> {
                    groupRepository.delete(group);
                    return true;
                })
                .orElse(false);
    }
}
