package com.roobie.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

@AllArgsConstructor
@Getter
@ToString
public class CreateStudentRequest {
    private String fullname;
    private Integer age;
    private String phone;
    private String birthdate;
    private String groupName;
}
