package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.GradeRequest;
import com.assxmblxr.backend.dto.GradeResponse;
import com.assxmblxr.backend.dto.PageResponse;
import com.assxmblxr.backend.exceptions.GradeException;
import com.assxmblxr.backend.service.GradeService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@AllArgsConstructor
@RestController
@RequestMapping("/api/grades")
public class GradeController {
  private final GradeService gradeService;

  /**
   * GET /api/grades?page=0&size=50&studentId=&subjectId=
   * Возвращает PageResponse<GradeResponse> — content + totalElements + totalPages
   */
  @GetMapping
  public ResponseEntity<PageResponse<GradeResponse>> getAll(
          @RequestParam(required = false) Long studentId,
          @RequestParam(required = false) Long subjectId,
          @RequestParam(defaultValue = "0")  int page,
          @RequestParam(defaultValue = "50") int size
  ) {
    if (studentId != null && subjectId != null) {
      return ResponseEntity.ok(gradeService.getGradesByStudentAndSubjectPaged(studentId, subjectId, page, size));
    }
    if (studentId != null) {
      return ResponseEntity.ok(gradeService.getGradesByStudentPaged(studentId, page, size));
    }
    return ResponseEntity.ok(gradeService.getAllGradesPaged(page, size));
  }

  @GetMapping("/{id}")
  public ResponseEntity<GradeResponse> getById(@PathVariable Long id) {
    try {
      return ResponseEntity.ok(gradeService.getGrade(id));
    } catch (GradeException e) {
      return ResponseEntity.notFound().build();
    }
  }

  @PostMapping
  public ResponseEntity<GradeResponse> create(@Valid @RequestBody GradeRequest request) {
    try {
      return ResponseEntity.status(HttpStatus.CREATED).body(gradeService.createGrade(request));
    } catch (Exception e) {
      log.error("Error creating grade: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @PutMapping("/{id}")
  public ResponseEntity<GradeResponse> update(@PathVariable Long id, @Valid @RequestBody GradeRequest request) {
    try {
      return ResponseEntity.ok(gradeService.updateGrade(id, request));
    } catch (GradeException e) {
      return ResponseEntity.notFound().build();
    } catch (Exception e) {
      log.error("Error updating grade: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    return gradeService.deleteGrade(id)
            ? ResponseEntity.noContent().build()
            : ResponseEntity.notFound().build();
  }
}