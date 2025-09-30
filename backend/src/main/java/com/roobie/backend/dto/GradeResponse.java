package com.roobie.backend.dto;

import lombok.Data;

@Data
public class GradeResponse {
    private Long id;
    private Long studentId;
    private Long subjectId;
    private Long teacherId;
    private int grade;
}
