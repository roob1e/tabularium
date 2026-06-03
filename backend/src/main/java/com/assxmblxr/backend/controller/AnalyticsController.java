package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.GroupAnalyticsResponse;
import com.assxmblxr.backend.dto.StudentAnalyticsResponse;
import com.assxmblxr.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {
  private final AnalyticsService analyticsService;

  /** GET /api/analytics/student/{id} — успеваемость и посещаемость студента */
  @GetMapping("/student/{id}")
  public ResponseEntity<StudentAnalyticsResponse> getStudentAnalytics(@PathVariable Long id) {
    return ResponseEntity.ok(analyticsService.getStudentAnalytics(id));
  }

  /** GET /api/analytics/group/{id} — успеваемость группы */
  @GetMapping("/group/{id}")
  public ResponseEntity<GroupAnalyticsResponse> getGroupAnalytics(@PathVariable Long id) {
    return ResponseEntity.ok(analyticsService.getGroupAnalytics(id));
  }
}