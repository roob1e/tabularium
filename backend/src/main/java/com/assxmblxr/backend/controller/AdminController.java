package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.UserResponse;
import com.assxmblxr.backend.entity.Role;
import com.assxmblxr.backend.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

  private final AdminService adminService;

  @GetMapping("/users")
  public ResponseEntity<List<UserResponse>> getAllUsers() {
    return ResponseEntity.ok(adminService.getAllUsers());
  }

  @PatchMapping("/users/{id}/approve")
  public ResponseEntity<UserResponse> approveUser(@PathVariable Long id) {
    return ResponseEntity.ok(adminService.approveUser(id));
  }

  @PatchMapping("/users/{id}/role")
  public ResponseEntity<UserResponse> setRole(@PathVariable Long id, @RequestParam Role role) {
    return ResponseEntity.ok(adminService.setRole(id, role));
  }

  @DeleteMapping("/users/{id}")
  public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    adminService.deleteUser(id);
    return ResponseEntity.noContent().build();
  }
}