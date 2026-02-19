package com.assxmblxr.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RefreshToken {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "token", unique = true, nullable = false)
  private String token;

  @ManyToOne
  @JoinColumn(name = "user_id", nullable = false)
  @JsonIgnore
  private User user;

  @Column(name = "expiry_date")
  private LocalDateTime expiryDate;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  public RefreshToken(User user, LocalDateTime expiryDate) {
    this.token = UUID.randomUUID().toString();
    this.user = user;
    this.expiryDate = expiryDate;
    this.createdAt = LocalDateTime.now();
  }
}
