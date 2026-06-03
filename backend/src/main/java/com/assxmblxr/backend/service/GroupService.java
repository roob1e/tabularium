package com.assxmblxr.backend.service;

import com.assxmblxr.backend.entity.Group;
import com.assxmblxr.backend.exceptions.GroupException;
import com.assxmblxr.backend.repository.GroupRepository;
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

  public Group getGroup(Long id) {
    return groupRepository.findById(id)
            .orElseThrow(() -> new GroupException("Группа не найдена", id));
  }

  public List<Group> getAllGroups() {
    return groupRepository.findAll();
  }

  public Group createGroup(Group group) {
    return groupRepository.save(group);
  }

  /** Обновление названия группы — нужно для ТЗ (управление учебными группами) */
  public Group updateGroup(Long id, Group updated) {
    Group existing = groupRepository.findById(id)
            .orElseThrow(() -> new GroupException("Группа не найдена", id));
    existing.setName(updated.getName());
    return groupRepository.save(existing);
  }

  public boolean deleteGroup(Long id) {
    return groupRepository.findById(id)
            .map(group -> { groupRepository.delete(group); return true; })
            .orElse(false);
  }
}