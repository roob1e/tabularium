package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.SubjectDTO;
import com.assxmblxr.backend.exceptions.SubjectException;
import com.assxmblxr.backend.service.SubjectService;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

  private final SubjectService subjectService;

  public SubjectController(SubjectService subjectService) {
    this.subjectService = subjectService;
  }

  @PostMapping
  public ResponseEntity<SubjectDTO> createSubject(
          @RequestBody @Valid SubjectDTO request
  ) {
    try {
      log.info("Creating subject {}", request);
      SubjectDTO created = subjectService.createSubject(request);
      return ResponseEntity.status(HttpStatus.CREATED).body(created);
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN CREATING SUBJECT: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
    }
  }

  @PutMapping("/{id}")
  public ResponseEntity<SubjectDTO> updateSubject(
          @PathVariable Long id,
          @RequestBody SubjectDTO request
  ) {
    try {
      log.info("Updating subject {}", request);
      SubjectDTO updated = subjectService.updateSubject(id, request);
      return ResponseEntity.ok(updated);
    } catch (SubjectException e) {
      log.error("Subject with id {} not found", id);
      return ResponseEntity.notFound().build();
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN UPDATING SUBJECT: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<SubjectDTO> getSubject(
          @PathVariable Long id
  ) {
    try {
      log.info("Fetching subject {}", id);
      SubjectDTO subject = subjectService.getSubject(id);
      return ResponseEntity.ok(subject);
    } catch (SubjectException e) {
      log.info("Subject with id {} not found", id);
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
    }
  }

  @GetMapping
  public ResponseEntity<List<SubjectDTO>> getAllSubjects() {
    try {
      log.info("Fetching all subjects");
      List<SubjectDTO> subjects = subjectService.getAllSubjects();
      return ResponseEntity.ok(subjects);
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN FETCHING ALL SUBJECTS: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Boolean> deleteSubject(
          @PathVariable Long id
  ) {
    log.info("Deleting subject with id {}", id);
    boolean deleted = subjectService.deleteSubject(id);
    return deleted ? ResponseEntity.noContent().build()
            : ResponseEntity.status(HttpStatus.NOT_FOUND).build();
  }
}