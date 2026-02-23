package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.AuthResponse;
import com.assxmblxr.backend.dto.RefreshTokenRequest;
import com.assxmblxr.backend.entity.RefreshToken;
import com.assxmblxr.backend.service.TokenService;
import com.assxmblxr.backend.utils.JwtUtils;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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

    return tokenService.findByToken(requestRefreshToken)
            .map(tokenService::verifyExpiration)
            .map(RefreshToken::getUser)
            .map(user -> {
              String accessToken = jwtUtils.generateTokenFromUsername(user.getUsername());
              return ResponseEntity.ok(new AuthResponse(
                      user.getUsername(),
                      user.getFullname(),
                      accessToken,
                      requestRefreshToken
              ));
            })
            .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
  }
}