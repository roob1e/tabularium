package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.AuthResponse;
import com.assxmblxr.backend.dto.RefreshTokenRequest;
import com.assxmblxr.backend.entity.RefreshToken;
import com.assxmblxr.backend.exceptions.RefreshTokenException;
import com.assxmblxr.backend.service.TokenService;
import com.assxmblxr.backend.utils.JwtUtils;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/auth")
public class TokenController {
  @Autowired
  private TokenService tokenService;

  @Autowired
  private JwtUtils jwtUtils;

  @PostMapping("/refresh")
  public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
    String requestRefreshToken = request.getRefreshToken();

    try {
      return tokenService.findByToken(requestRefreshToken)
              .map(tokenService::verifyExpiration)
              .map(RefreshToken::getUser)
              .map(user -> {
                String accessToken = jwtUtils.generateTokenFromUsername(user.getUsername());
                return ResponseEntity.ok((Object) new AuthResponse(
                        user.getUsername(),
                        user.getFullname(),
                        accessToken,
                        requestRefreshToken,
                        user.getRole().name()
                ));
              })
              // BUG FIX: раньше бросал RuntimeException -> 500.
              // Теперь возвращает 401, фронт поймает и сделает force-logout.
              .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                      .body("Refresh token not found. Please log in again."));
    } catch (RefreshTokenException e) {
      log.warn("Refresh token expired: {}", e.getMessage());
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
              .body("Refresh token expired. Please log in again.");
    } catch (Exception e) {
      log.error("Refresh token error: {}", e.getMessage());
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
              .body("Authentication error. Please log in again.");
    }
  }
}