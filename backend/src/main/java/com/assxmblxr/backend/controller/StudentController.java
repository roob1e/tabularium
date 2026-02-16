package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.CreateStudentRequest;
import com.assxmblxr.backend.dto.UpdateStudentRequest;
import com.assxmblxr.backend.entity.Student;
import com.assxmblxr.backend.exceptions.StudentNotFoundException;
import com.assxmblxr.backend.service.StudentService;

import jakarta.validation.Valid;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/students")
public class StudentController {
  @Autowired
  private StudentService studentService;

  // GET: get all, get by ID;
  @GetMapping
  public ResponseEntity<List<Student>> getAllStudents() {
    try {
      log.info("Fetching all students");
      var students = studentService.getStudents();
      return ResponseEntity.ok(students);
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN FETCHING ALL STUDENTS: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
    }
  }

  @GetMapping("/{id}")
  public ResponseEntity<Student> getStudentById(
          @PathVariable Long id
  ) {
    try {
      log.info("Fetching student with id {}", id);
      var students = studentService.getStudent(id);
      return ResponseEntity.ok(students);
    } catch (StudentNotFoundException e) {
      log.info("Student with id {} not found", id);
      return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
    }
  }

  // POST: create;
  @PostMapping
  public ResponseEntity<Student> createStudent(
          @RequestBody CreateStudentRequest request
  ) {
    try {
      log.info("Creating student {}", request.toString());
      Student createdStudent = studentService.createStudent(request);
      return ResponseEntity.status(HttpStatus.CREATED).body(createdStudent);
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN CREATING STUDENT: {}", e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
    }
  }

  // DELETE: delete;
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteStudent(
          @PathVariable Long id
  ) {
    log.info("Deleting student with id {}", id);
    boolean deleted = studentService.deleteStudent(id);
    return deleted ? ResponseEntity.noContent().build()
            : ResponseEntity.status(HttpStatus.NOT_FOUND).build();
  }

  // PUT: update;
  @PutMapping("/{id}")
  public ResponseEntity<Student> updateStudent(
          @PathVariable Long id,
          @Valid @RequestBody UpdateStudentRequest request
  ) {
    try {
      log.info("Updating student with id {}", id);
      Student updatedStudent = studentService.updateStudent(id, request);
      return ResponseEntity.ok(updatedStudent);
    } catch (StudentNotFoundException e) {
      log.error("Student with id {} not found", id);
      return ResponseEntity.notFound().build();
    } catch (Exception e) {
      log.error("GOT AN ERROR WHEN UPDATING STUDENT: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }
}