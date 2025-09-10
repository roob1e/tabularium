package com.roobie.backend.controller;

import com.roobie.backend.dto.CreateStudentRequest;
import com.roobie.backend.entity.Student;
import com.roobie.backend.service.StudentService;

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
    public ResponseEntity<Student> getStudentById(@PathVariable int id) {
        try {
            log.info("Fetching student with id {}", id);
            var students = studentService.GetStudent(id);
            return ResponseEntity.ok(students);
        } catch (Exception e) {
            log.info("Student with id {} not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
    }

    @PostMapping
    public ResponseEntity<Student> createStudent(@RequestBody CreateStudentRequest request) {
        try {
            log.info("Creating student {}", request.toString());
            Student createdStudent = studentService.createStudent(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdStudent);
        } catch (Exception e) {
            log.error("GOT AN ERROR WHEN CREATING STUDENT: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Student> deleteStudent(@PathVariable int id) {
        try {
            log.info("Deleting student with id {}", id);
            studentService.deleteStudent(studentService.GetStudent(id));
            return ResponseEntity.status(HttpStatus.OK).build();
        } catch (Exception e) {
            log.error("GOT AN ERROR WHEN DELETING STUDENT: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
    }
}
