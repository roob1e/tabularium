package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.entity.Group;
import com.assxmblxr.backend.exceptions.GroupException;
import com.assxmblxr.backend.service.GroupService;

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

  @GetMapping
  public ResponseEntity<List<Group>> getAllGroups() {
    try {
      log.info("Fetching all groups");
      var groups = groupService.getAllGroups();
      return ResponseEntity.ok(groups);
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN FETCHING ALL GROUPS: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<Group> getGroupById(
          @PathVariable Long id
  ) {
    try {
      log.info("Fetching group by id: {}", id);
      return ResponseEntity.ok(groupService.getGroup(id));
    } catch (GroupException e) {
      log.error("Group not found: {}", id);
      return ResponseEntity.notFound().build();
    }
  }

  @PostMapping()
  public ResponseEntity<Group> createGroup(
          @RequestBody Group group
  ) {
    try {
      log.info("Creating group {}", group.getName());
      var createdGroup = groupService.createGroup(group);
      return ResponseEntity.status(HttpStatus.CREATED).body(createdGroup);
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN CREATING GROUP: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteGroup(
          @PathVariable Long id
  ) {
    log.info("Deleting group with id {}", id);
    boolean deleted = groupService.deleteGroup(id);
    return deleted ? ResponseEntity.noContent().build()
            : ResponseEntity.notFound().build();
  }
}