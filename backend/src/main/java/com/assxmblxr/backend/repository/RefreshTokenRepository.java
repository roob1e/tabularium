package com.assxmblxr.backend.repository;

import com.assxmblxr.backend.entity.RefreshToken;
import com.assxmblxr.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
  Optional<RefreshToken> findByToken(String token);
  void deleteByUser(User user);
}
