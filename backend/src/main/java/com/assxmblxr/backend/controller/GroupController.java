package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.entity.Group;
import com.assxmblxr.backend.exceptions.GroupException;
import com.assxmblxr.backend.service.GroupService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/groups")
public class GroupController {
  private final GroupService groupService;

  public GroupController(GroupService groupService) {
    this.groupService = groupService;
  }

  @GetMapping
  public ResponseEntity<List<Group>> getAllGroups() {
    return ResponseEntity.ok(groupService.getAllGroups());
  }

  @GetMapping("/{id}")
  public ResponseEntity<Group> getGroupById(@PathVariable Long id) {
    try {
      return ResponseEntity.ok(groupService.getGroup(id));
    } catch (GroupException e) {
      return ResponseEntity.notFound().build();
    }
  }

  @PostMapping
  public ResponseEntity<Group> createGroup(@RequestBody Group group) {
    try {
      return ResponseEntity.status(HttpStatus.CREATED).body(groupService.createGroup(group));
    } catch (Exception e) {
      log.error("Error creating group: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @PutMapping("/{id}")
  public ResponseEntity<Group> updateGroup(@PathVariable Long id, @RequestBody Group group) {
    try {
      return ResponseEntity.ok(groupService.updateGroup(id, group));
    } catch (GroupException e) {
      return ResponseEntity.notFound().build();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
    return groupService.deleteGroup(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
  }
}