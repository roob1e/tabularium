package com.assxmblxr.backend.components;

import com.assxmblxr.backend.entity.Role;
import com.assxmblxr.backend.entity.User;
import com.assxmblxr.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  @Override
  public void run(ApplicationArguments args) {
    if (userRepository.count() == 0) {
      User admin = User.builder()
              .username("admin")
              .fullname("Администратор")
              .password(passwordEncoder.encode("admin"))
              .role(Role.ADMIN)
              .approved(true)
              .refreshTokens(new ArrayList<>())
              .build();
      userRepository.save(admin);
      log.info("Создан администратор по умолчанию: admin / admin");
    }
  }
}
