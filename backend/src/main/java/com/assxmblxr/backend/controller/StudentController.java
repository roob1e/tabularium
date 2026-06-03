package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.StudentRequest;
import com.assxmblxr.backend.dto.StudentResponse;
import com.assxmblxr.backend.entity.Student;
import com.assxmblxr.backend.exceptions.StudentException;
import com.assxmblxr.backend.service.StudentService;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/students")
public class StudentController {

  private final StudentService studentService;

  public StudentController(StudentService studentService) {
    this.studentService = studentService;
  }

  @GetMapping
  public ResponseEntity<List<StudentResponse>> getAllStudents() {
    log.info("Fetching all students");
    List<StudentResponse> students = studentService.getStudents().stream()
            .map(this::toResponse)
            .toList();
    return ResponseEntity.ok(students);
  }

  @GetMapping("/{id}")
  public ResponseEntity<StudentResponse> getStudentById(@PathVariable Long id) {
    try {
      log.info("Fetching student with id {}", id);
      return ResponseEntity.ok(toResponse(studentService.getStudent(id)));
    } catch (StudentException e) {
      log.info("Student with id {} not found", id);
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
  }

  @PostMapping
  public ResponseEntity<StudentResponse> createStudent(@Valid @RequestBody StudentRequest request) {
    try {
      log.info("Creating student {}", request);
      Student created = studentService.createStudent(request);
      return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    } catch (Exception e) {
      log.error("Error creating student: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteStudent(@PathVariable Long id) {
    log.info("Deleting student with id {}", id);
    boolean deleted = studentService.deleteStudent(id);
    return deleted ? ResponseEntity.noContent().build()
            : ResponseEntity.status(HttpStatus.NOT_FOUND).build();
  }

  @PutMapping("/{id}")
  public ResponseEntity<StudentResponse> updateStudent(
          @PathVariable Long id,
          @Valid @RequestBody StudentRequest request
  ) {
    try {
      log.info("Updating student with id {}", id);
      Student updated = studentService.updateStudent(id, request);
      return ResponseEntity.ok(toResponse(updated));
    } catch (StudentException e) {
      log.error("Student with id {} not found", id);
      return ResponseEntity.notFound().build();
    } catch (Exception e) {
      log.error("Error updating student: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }

  // BUG FIX: маппинг entity -> DTO чтобы избежать бесконечной JSON-рекурсии
  // (Student -> Group -> students -> Student -> ...)
  private StudentResponse toResponse(Student student) {
    return new StudentResponse(
            student.getId(),
            student.getFullname(),
            student.getPhone(),
            student.getBirthdate(),
            student.getAge(),
            student.getGroup() != null ? student.getGroup().getId() : null,
            student.getGroup() != null ? student.getGroup().getName() : null
    );
  }
}