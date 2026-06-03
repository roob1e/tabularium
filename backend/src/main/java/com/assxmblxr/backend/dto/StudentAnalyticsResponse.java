package com.assxmblxr.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
public class StudentAnalyticsResponse {
  private Long studentId;
  private String studentName;
  private String groupName;
  /** Средний балл по каждому предмету: subjectName -> avg */
  private Map<String, Double> avgGradeBySubject;
  /** Количество пропусков по каждому предмету: subjectName -> count */
  private Map<String, Long> absencesBySubject;
  /** Общий средний балл */
  private Double overallAvg;
  /** Суммарное число пропусков */
  private Long totalAbsences;
}