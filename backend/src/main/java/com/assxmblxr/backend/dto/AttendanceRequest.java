package com.assxmblxr.backend.dto;

import com.assxmblxr.backend.entity.AttendanceStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AttendanceRequest {
  @NotNull(message = "Студент обязателен")
  private Long studentId;

  @NotNull(message = "Предмет обязателен")
  private Long subjectId;

  private Long teacherId;

  @NotNull(message = "Дата обязательна")
  @JsonFormat(pattern = "yyyy-MM-dd")
  private LocalDate attendanceDate;

  @NotNull(message = "Статус обязателен")
  private AttendanceStatus status;

  private String note;
}