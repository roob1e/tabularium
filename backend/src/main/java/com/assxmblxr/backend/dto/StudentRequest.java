package com.assxmblxr.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

import java.time.LocalDate;

/**
 * DTO для создания записи STUDENT
 * @author assxmblxr
 */
@AllArgsConstructor
@Getter
@ToString
public class StudentRequest {
  @NotBlank(message = "Full name is required")
  @Size(min = 2, max = 100, message = "Full name should be from 2 to 100 symbols")
  private String fullname;

  @NotBlank(message = "Phone is required")
  @Pattern(
          regexp = "^\\+375(25|29|33|44|17|23)\\d{7}$",
          message = "Phone format should be +375(25|29|33|44|17|23)XXXXXXX"
  )
  private String phone;

  @NotNull(message = "Birthdate is required")
  @JsonFormat(pattern = "yyyy-MM-dd") // "2005-03-15"
  private LocalDate birthdate;

  @NotBlank(message = "Group is required")
  private Long groupId;
}