package com.assxmblxr.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * DTO для запроса GRADE
 * @author assxmblxr
 */
@Data
public class GradeRequest {
    @NotNull(message = "Ссылка на студента обязательна")
    private Long studentId;

    @NotNull(message = "Ссылка на предмет обязательна")
    private Long subjectId;

    @NotNull(message = "Ссылка на учителя обязательна")
    private Long teacherId;

    @NotNull(message = "Оценка обязательна")
    @Max(10)
    private int grade;
}