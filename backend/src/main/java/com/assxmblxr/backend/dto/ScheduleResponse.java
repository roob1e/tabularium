package com.assxmblxr.backend.dto;

import com.assxmblxr.backend.entity.DayOfWeek;
import lombok.Data;

@Data
public class ScheduleResponse {
  private Long id;
  private Long groupId;
  private String groupName;
  private Long subjectId;
  private String subjectName;
  private Long teacherId;
  private String teacherName;
  private DayOfWeek dayOfWeek;
  private int lessonNumber;
  private String classroom;
}