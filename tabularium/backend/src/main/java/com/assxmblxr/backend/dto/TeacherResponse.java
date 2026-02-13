package com.assxmblxr.backend.dto;

import lombok.Data;

import java.util.Set;

@Data
public class TeacherResponse {
  private Long id;
  private String fullname;
  private String phone;
  private Set<Long> subjectIds;
}