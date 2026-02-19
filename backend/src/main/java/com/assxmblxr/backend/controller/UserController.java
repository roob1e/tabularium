package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.UserRegister;
import com.assxmblxr.backend.entity.RefreshToken;
import com.assxmblxr.backend.entity.User;
import com.assxmblxr.backend.repository.UserRepository;
import com.assxmblxr.backend.service.TokenService;
import com.assxmblxr.backend.service.UserService;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.antlr.v4.runtime.Token;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/auth")
public class UserController {
  @Autowired
  private UserService userService;

  @Autowired
  private TokenService tokenService;

  @Autowired
  private UserRepository userRepository;

  @Transactional
  @PostMapping("/register")
  public HttpEntity<User> register(@RequestBody UserRegister request) {
    try {
      User user = userService.register(
              request.getUsername(),
              request.getFullname(),
              request.getPassword()
      );

      // Эта строка падает
      RefreshToken token = tokenService.createRefreshToken(user);
      user.getRefreshTokens().add(token);

      return ResponseEntity.ok(user);
    } catch (RuntimeException e) {
      log.error("Registration failed: ", e); // Так увидишь всю ошибку
      return ResponseEntity.status(HttpStatus.CONFLICT).body(null);
    }
  }
}
