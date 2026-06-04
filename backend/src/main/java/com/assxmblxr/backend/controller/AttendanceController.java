package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.AttendanceRequest;
import com.assxmblxr.backend.dto.AttendanceResponse;
import com.assxmblxr.backend.dto.PageResponse;
import com.assxmblxr.backend.exceptions.AttendanceException;
import com.assxmblxr.backend.service.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {
  private final AttendanceService attendanceService;

  /**
   * GET /api/attendance?page=0&size=50&studentId=&groupId=&date=
   * Без фильтров — серверная пагинация.
   * С фильтром groupId+date или subjectId+date — возвращает List (обычно небольшой).
   * С фильтром studentId+from+to — тоже List.
   */
  @GetMapping
  public ResponseEntity<?> getAll(
          @RequestParam(required = false) Long studentId,
          @RequestParam(required = false) Long subjectId,
          @RequestParam(required = false) Long groupId,
          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
          @RequestParam(defaultValue = "0")  int page,
          @RequestParam(defaultValue = "50") int size
  ) {
    // Специфические фильтры → маленький ответ, пагинация не нужна
    if (groupId != null && date != null)
      return ResponseEntity.ok(attendanceService.getByGroupAndDate(groupId, date));
    if (subjectId != null && date != null)
      return ResponseEntity.ok(attendanceService.getBySubjectAndDate(subjectId, date));
    if (studentId != null && from != null && to != null)
      return ResponseEntity.ok(attendanceService.getByStudentDateRange(studentId, from, to));

    // По студенту — пагинация
    if (studentId != null)
      return ResponseEntity.ok(attendanceService.getByStudentPaged(studentId, page, size));

    // Все записи — пагинация
    return ResponseEntity.ok(attendanceService.getAllPaged(page, size));
  }

  @GetMapping("/{id}")
  public ResponseEntity<AttendanceResponse> getById(@PathVariable Long id) {
    try {
      return ResponseEntity.ok(attendanceService.getById(id));
    } catch (AttendanceException e) {
      return ResponseEntity.notFound().build();
    }
  }

  @GetMapping("/absences")
  public ResponseEntity<Long> countAbsences(@RequestParam Long studentId, @RequestParam Long subjectId) {
    return ResponseEntity.ok(attendanceService.countAbsences(studentId, subjectId));
  }

  @PostMapping
  public ResponseEntity<AttendanceResponse> create(@Valid @RequestBody AttendanceRequest request) {
    try {
      return ResponseEntity.status(HttpStatus.CREATED).body(attendanceService.create(request));
    } catch (Exception e) {
      log.error("Error creating attendance: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @PutMapping("/{id}")
  public ResponseEntity<AttendanceResponse> update(@PathVariable Long id, @Valid @RequestBody AttendanceRequest request) {
    try {
      return ResponseEntity.ok(attendanceService.update(id, request));
    } catch (AttendanceException e) {
      return ResponseEntity.notFound().build();
    } catch (Exception e) {
      log.error("Error updating attendance: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    return attendanceService.delete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
  }
}