package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.ScheduleRequest;
import com.assxmblxr.backend.dto.ScheduleResponse;
import com.assxmblxr.backend.entity.DayOfWeek;
import com.assxmblxr.backend.exceptions.ScheduleException;
import com.assxmblxr.backend.service.ScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
public class ScheduleController {
  private final ScheduleService scheduleService;

  /** GET /api/schedule?groupId=&day=&teacherId= */
  @GetMapping
  public ResponseEntity<List<ScheduleResponse>> getAll(
          @RequestParam(required = false) Long groupId,
          @RequestParam(required = false) DayOfWeek day,
          @RequestParam(required = false) Long teacherId
  ) {
    if (groupId != null && day != null) return ResponseEntity.ok(scheduleService.getByGroupAndDay(groupId, day));
    if (groupId != null) return ResponseEntity.ok(scheduleService.getByGroup(groupId));
    if (teacherId != null) return ResponseEntity.ok(scheduleService.getByTeacher(teacherId));
    return ResponseEntity.ok(scheduleService.getAll());
  }

  @GetMapping("/{id}")
  public ResponseEntity<ScheduleResponse> getById(@PathVariable Long id) {
    try {
      return ResponseEntity.ok(scheduleService.getById(id));
    } catch (ScheduleException e) {
      return ResponseEntity.notFound().build();
    }
  }

  @PostMapping
  public ResponseEntity<ScheduleResponse> create(@Valid @RequestBody ScheduleRequest request) {
    try {
      return ResponseEntity.status(HttpStatus.CREATED).body(scheduleService.create(request));
    } catch (Exception e) {
      log.error("Error creating schedule: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @PutMapping("/{id}")
  public ResponseEntity<ScheduleResponse> update(@PathVariable Long id, @Valid @RequestBody ScheduleRequest request) {
    try {
      return ResponseEntity.ok(scheduleService.update(id, request));
    } catch (ScheduleException e) {
      return ResponseEntity.notFound().build();
    } catch (Exception e) {
      log.error("Error updating schedule: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    return scheduleService.delete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
  }
}