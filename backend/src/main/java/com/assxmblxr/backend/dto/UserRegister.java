package com.assxmblxr.backend.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserRegister {
  @Size(min = 2, max = 15)
  private String username;

  @Size(max = 100)
  private String fullname;

  @Pattern(regexp = "^(?=.*[A-Za-z]).{8,}$")
  private String password;
}
