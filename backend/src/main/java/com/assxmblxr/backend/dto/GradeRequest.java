package com.assxmblxr.backend.dto;

import com.assxmblxr.backend.entity.WorkType;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class GradeRequest {
  @NotNull(message = "Ссылка на студента обязательна")
  private Long studentId;

  @NotNull(message = "Ссылка на предмет обязательна")
  private Long subjectId;

  @NotNull(message = "Ссылка на учителя обязательна")
  private Long teacherId;

  @NotNull(message = "Оценка обязательна")
  @Min(0) @Max(10)
  private int grade;

  /** Тип работы — контрольная, самостоятельная и т.д. */
  private WorkType workType;

  @JsonFormat(pattern = "yyyy-MM-dd")
  private LocalDate gradeDate;

  private String comment;
}