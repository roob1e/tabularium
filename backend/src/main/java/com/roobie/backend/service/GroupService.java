package com.roobie.backend.service;

import com.roobie.backend.entity.Group;
import com.roobie.backend.repository.GroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GroupService {
    @Autowired private GroupRepository groupRepository;

    public Group getGroup(String name) {
        return groupRepository.findByName(name).orElse(null);
    }

    public List<Group> getAllGroups() {
        return groupRepository.findAll();
    }

    public Group createGroup(Group group) {
        return groupRepository.save(group);
    }

    public boolean deleteGroup(String id) {
        return groupRepository.findById(id)
                .map(group -> {
                    groupRepository.delete(group);
                    return true;
                })
                .orElse(false);
    }
}
