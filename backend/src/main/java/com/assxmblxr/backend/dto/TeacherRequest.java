package com.assxmblxr.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.Set;

@Data
public class TeacherRequest {
  @NotBlank(message = "ФИО обязательно")
  private String fullname;

  @NotBlank(message = "Телефон обязателен")
  @Pattern(
          regexp = "^\\+375(25|29|33|35|44|17|23)\\d{7}$",
          message = "Телефон должен быть в формате +375(25|29|33|35|44|17|23)XXXXXXX"
  )
  private String phone;

  private Set<Long> subjectIds;
}