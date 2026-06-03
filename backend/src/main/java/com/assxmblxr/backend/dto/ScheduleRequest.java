package com.assxmblxr.backend.dto;

import com.assxmblxr.backend.entity.DayOfWeek;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ScheduleRequest {
  @NotNull(message = "Группа обязательна")
  private Long groupId;

  @NotNull(message = "Предмет обязателен")
  private Long subjectId;

  private Long teacherId;

  @NotNull(message = "День недели обязателен")
  private DayOfWeek dayOfWeek;

  @Min(1) @Max(8)
  private int lessonNumber;

  private String classroom;
}