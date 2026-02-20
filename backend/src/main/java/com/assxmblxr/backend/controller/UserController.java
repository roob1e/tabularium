package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.AuthResponse;
import com.assxmblxr.backend.dto.UserLogin;
import com.assxmblxr.backend.dto.UserRegister;
import com.assxmblxr.backend.entity.RefreshToken;
import com.assxmblxr.backend.entity.User;
import com.assxmblxr.backend.exceptions.UserException;
import com.assxmblxr.backend.service.TokenService;
import com.assxmblxr.backend.service.UserService;
import com.assxmblxr.backend.utils.JwtUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/auth")
public class UserController {
  @Autowired
  private UserService userService;

  @Autowired
  private TokenService tokenService;

  @Autowired
  private JwtUtils jwtUtils;

  @PostMapping("/register")
  public HttpEntity<?> register(@RequestBody UserRegister request) {
    try {
      User user = userService.register(
              request.getUsername(),
              request.getFullname(),
              request.getPassword()
      );
      String accessToken = jwtUtils.generateTokenFromUsername(user.getUsername());
      RefreshToken refreshToken = tokenService.createRefreshToken(user);

      return ResponseEntity.ok(new AuthResponse(
              user.getUsername(),
              user.getFullname(),
              accessToken,
              refreshToken.getToken()
              )
      );
    } catch (UserException e) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
  }

  @PostMapping("/login")
  public HttpEntity<?> login(@RequestBody UserLogin request) {
    Optional<User> userOptional = userService.login(request.getUsername(), request.getPassword());
    if (userOptional.isPresent()) {
      try {
        User user = userOptional.get();
        String accessToken = jwtUtils.generateTokenFromUsername(user.getUsername());
        RefreshToken refreshToken = tokenService.createRefreshToken(user);

        return ResponseEntity.ok(new AuthResponse(
                user.getUsername(),
                user.getFullname(),
                accessToken,
                refreshToken.getToken()
        ));
      } catch (UserException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
      }
    } else {
        return ResponseEntity.notFound().build();
    }
  }

}
