package com.assxmblxr.backend.service;

import com.assxmblxr.backend.entity.User;
import com.assxmblxr.backend.exceptions.UserException;
import com.assxmblxr.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with username " + username));

    return org.springframework.security.core.userdetails.User.builder()
            .username(user.getUsername())
            .password(user.getPassword())
            .authorities(new ArrayList<>())
            .build();
  }

  public User register(String username, String fullname, String password) {
    if (userRepository.existsByUsername(username)) {
      throw new UserException("User already exists");
    }
      return userRepository.save(User.builder()
              .username(username)
              .fullname(fullname)
              .password(passwordEncoder.encode(password))
              .refreshTokens(new ArrayList<>())
              .build());

  }

  public Optional<User> login(String username, String password) {
    Optional<User> userOptional = userRepository.findByUsername(username);
    if (userOptional.isPresent()) {
      User user = userOptional.get();
      if (passwordEncoder.matches(password, user.getPassword())) {
        return Optional.of(user);
      }
    }
    return Optional.empty();
  }

  public Optional<User> findByUsername(String username) {
    return userRepository.findByUsername(username);
  }

  public boolean checkPassword(String raw, String encoded) {
    return passwordEncoder.matches(raw, encoded);
  }
}
