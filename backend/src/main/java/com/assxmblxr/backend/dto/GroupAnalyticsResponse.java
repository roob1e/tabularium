package com.assxmblxr.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@AllArgsConstructor
public class GroupAnalyticsResponse {
  private Long groupId;
  private String groupName;
  private int studentCount;
  /** Средний балл группы по каждому предмету: subjectName -> avg */
  private Map<String, Double> avgGradeBySubject;
  /** Средний общий балл группы */
  private Double overallAvg;
}