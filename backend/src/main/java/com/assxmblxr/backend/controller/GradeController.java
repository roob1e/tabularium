package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.GradeRequest;
import com.assxmblxr.backend.dto.GradeResponse;
import com.assxmblxr.backend.exceptions.GradeNotFoundException;
import com.assxmblxr.backend.service.GradeService;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@SuppressWarnings("LoggingSimilarMessage")
@Slf4j
@AllArgsConstructor
@RestController
@RequestMapping("/api/grades")
public class GradeController {
  private final GradeService gradeService;

  @GetMapping
  public ResponseEntity<List<GradeResponse>> getAll() {
    try {
      log.info("Fetching all grades");
      var grades = gradeService.getAllGrades();
      return ResponseEntity.ok(grades);
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN FETCHING ALL TEACHERS: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<GradeResponse> getById(
          @PathVariable Long id
  ) {
    try {
      log.info("Fetching grade by id: {}", id);
      return ResponseEntity.ok(gradeService.getGrade(id));
    } catch (GradeNotFoundException e) {
      log.error("Grade not found: {}", id);
      return ResponseEntity.notFound().build();
    }
  }

  @PostMapping
  public ResponseEntity<GradeResponse> create(
          @RequestBody GradeRequest request
  ) {
    try {
      log.info("Creating grade: {}", request);
      var createdGrade = gradeService.createGrade(request);
      return ResponseEntity.status(HttpStatus.CREATED).body(createdGrade);
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN CREATING GRADE: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @PutMapping("/{id}")
  public ResponseEntity<GradeResponse> update(
          @PathVariable Long id,
          @RequestBody GradeRequest request
  ) {
    try {
      log.info("Updating grade: {}", request);
      GradeResponse updatedGrade = gradeService.updateGrade(id, request);
      return ResponseEntity.ok(updatedGrade);
    } catch (GradeNotFoundException e) {
      log.error("Grade not found: {}", id);
      return ResponseEntity.notFound().build();
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN UPDATING GRADE: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<GradeResponse> delete(
          @PathVariable Long id
  ) {
    log.info("Deleting grade: {}", id);
    boolean deleted = gradeService.deleteGrade(id);
    return deleted ? ResponseEntity.noContent().build()
            : ResponseEntity.status(HttpStatus.NOT_FOUND).build();
  }
}