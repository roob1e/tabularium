package com.assxmblxr.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentResponse {
  private Long id;
  private String fullname;
  private String phone;
  private LocalDate birthdate;
  private Integer age;
  private Long groupId;
  private String groupName;
}