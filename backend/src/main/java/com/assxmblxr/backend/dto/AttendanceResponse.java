package com.assxmblxr.backend.dto;

import com.assxmblxr.backend.entity.AttendanceStatus;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AttendanceResponse {
  private Long id;
  private Long studentId;
  private String studentName;
  private Long subjectId;
  private String subjectName;
  private Long teacherId;
  private String teacherName;
  private LocalDate attendanceDate;
  private AttendanceStatus status;
  private String note;
}