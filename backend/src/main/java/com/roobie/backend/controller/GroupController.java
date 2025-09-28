package com.roobie.backend.controller;

import com.roobie.backend.entity.Group;
import com.roobie.backend.service.GroupService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("api/groups")
public class GroupController {
    @Autowired
    private GroupService groupService;

    // GET: get all, get by name;
    @GetMapping
    public ResponseEntity<List<Group>> getAllGroups() {
        try {
            log.info("Fetching all groups");
            var groups = groupService.getAllGroups();
            return ResponseEntity.ok(groups);
        } catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Group> getGroupById(@PathVariable String id) {
        log.info("Fetching group by id {}", id);
        var group = groupService.getGroup(id);
        return group != null ? ResponseEntity.ok(group) : ResponseEntity.notFound().build();
    }

    // POST: create;
    @PostMapping()
    public ResponseEntity<Group> createGroup(@RequestBody Group group) {
        try {
            log.info("Creating group {}", group.getName());
            var createdGroup = groupService.createGroup(group);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdGroup);
        } catch (Exception e) {
            log.error(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // DELETE: delete;
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable String id) {
        log.info("Deleting group with id {}", id);
        boolean deleted = groupService.deleteGroup(id);
        return deleted ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
