package com.assxmblxr.backend.service;

import com.assxmblxr.backend.dto.UserResponse;
import com.assxmblxr.backend.entity.Role;
import com.assxmblxr.backend.entity.User;
import com.assxmblxr.backend.exceptions.UserException;
import com.assxmblxr.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {
  private final UserRepository userRepository;

  @Transactional(readOnly = true)
  public List<UserResponse> getAllUsers() {
    return userRepository.findAll().stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
  }

  @Transactional
  public UserResponse approveUser(Long id) {
    User user = userRepository.findById(id)
            .orElseThrow(() -> new UserException("User not found with id: " + id));

    user.setApproved(true);
    User updated = userRepository.save(user);
    return mapToResponse(updated);
  }

  @Transactional
  public UserResponse setRole(Long id, Role role) {
    User user = userRepository.findById(id)
            .orElseThrow(() -> new UserException("User not found with id: " + id));

    user.setRole(role);
    User updated = userRepository.save(user);
    return mapToResponse(updated);
  }

  @Transactional
  public void deleteUser(Long id) {
    if (!userRepository.existsById(id)) {
      throw new UserException("Cannot delete: User not found with id: " + id);
    }
    userRepository.deleteById(id);
  }

  private UserResponse mapToResponse(User user) {
    return new UserResponse(
            user.getId(),
            user.getUsername(),
            user.getFullname(),
            user.getRole(),
            user.isApproved()
    );
  }
}