package com.roobie.backend.dto;

import lombok.Data;

@Data
public class GradeRequest {
    private Long studentId;
    private Long subjectId;
    private Long teacherId;
    private int grade;
}
