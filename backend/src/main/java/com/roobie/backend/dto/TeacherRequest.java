package com.roobie.backend.dto;

import lombok.Data;

import java.util.Set;

@Data
public class TeacherRequest {
    private String fullname;
    private String phone;
    private Set<Long> subjectIds;
}

