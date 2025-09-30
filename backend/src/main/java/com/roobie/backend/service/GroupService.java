package com.roobie.backend.service;

import com.roobie.backend.entity.Group;
import com.roobie.backend.exceptions.GroupNotFoundException;
import com.roobie.backend.repository.GroupRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GroupService {

    private final GroupRepository groupRepository;

    public GroupService(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }


    public Group getGroupByName(String name) {
        return groupRepository.findByName(name).orElse(null);
    }

    /**
     * Получить группу по ID.
     * @param id ID группы.
     * @return Найденная группа.
     * @throws GroupNotFoundException если группа не найдена.
     */
    public Group getGroup(Long id) {
        return groupRepository.findById(id)
                .orElseThrow(() -> new GroupNotFoundException("Группа с id " + id + " не найдена"));
    }

    /**
     * Получить все группы.
     * @return список всех групп.
     */
    public List<Group> getAllGroups() {
        return groupRepository.findAll();
    }

    /**
     * Создать новую группу.
     * @param group объект Group.
     * @return сохранённая группа.
     */
    public Group createGroup(Group group) {
        return groupRepository.save(group);
    }

    /**
     * Удалить группу по ID.
     * @param id ID группы.
     * @return true, если удалено, иначе false.
     */
    public boolean deleteGroup(Long id) {
        return groupRepository.findById(id)
                .map(group -> {
                    groupRepository.delete(group);
                    return true;
                })
                .orElse(false);
    }
}
