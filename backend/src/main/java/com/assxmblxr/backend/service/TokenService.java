package com.assxmblxr.backend.service;

import com.assxmblxr.backend.entity.RefreshToken;
import com.assxmblxr.backend.entity.User;
import com.assxmblxr.backend.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TokenService {
  private final RefreshTokenRepository refreshTokenRepository;

  @Value("${jwt.refresh-token-expiration:604800000}")
  private long refreshTokenExpiration;

  public RefreshToken createRefreshToken(User user) {
    LocalDateTime expiryDate = LocalDateTime.now().plus(refreshTokenExpiration, ChronoUnit.MILLIS);
    RefreshToken refreshToken = new RefreshToken(user, expiryDate);
    return refreshTokenRepository.save(refreshToken);
  }

  public Optional<RefreshToken> findByToken(String token) {
    return refreshTokenRepository.findByToken(token);
  }

  public void deleteByUser(User user) {
    refreshTokenRepository.deleteByUser(user);
  }

  public RefreshToken verifyExpiration(RefreshToken token) {
    if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
      refreshTokenRepository.delete(token);
      throw new RuntimeException("Refresh token expired");
    }
    return token;
  }
}
