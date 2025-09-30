package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.TeacherRequest;
import com.assxmblxr.backend.dto.TeacherResponse;
import com.assxmblxr.backend.exceptions.TeacherNotFoundException;
import com.assxmblxr.backend.service.TeacherService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/teachers")
public class TeacherController {

    private final TeacherService teacherService;

    public TeacherController(TeacherService teacherService) {
        this.teacherService = teacherService;
    }

    // Создание учителя
    @PostMapping
    public ResponseEntity<TeacherResponse> createTeacher(
            @RequestBody TeacherRequest request
    ) {
        try {
            log.info("Create teacher: {}", request);
            TeacherResponse created = teacherService.createTeacher(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            log.error("GOT AN ERROR WHEN CREATING TEACHER: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    // Обновление учителя
    @PutMapping("/{id}")
    public ResponseEntity<TeacherResponse> updateTeacher(
            @PathVariable Long id,
            @RequestBody TeacherRequest request
    ) {
        try {
            log.info("Updating teacher with id {}", id);
            TeacherResponse updated = teacherService.updateTeacher(id, request);
            return ResponseEntity.ok(updated);
        } catch (TeacherNotFoundException e) {
            log.error("Teacher with id {} not found", id);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("GOT AN ERROR WHEN UPDATING TEACHER: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // Получение одного учителя
    @GetMapping("/{id}")
    public ResponseEntity<TeacherResponse> getTeacher(
            @PathVariable Long id
    ) {
        try {
            log.info("Fetching teacher with id {}", id);
            var teacher = teacherService.getTeacher(id) ;
            return ResponseEntity.ok(teacher);
        } catch (TeacherNotFoundException e) {
            log.info("Teacher with id {} not found", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
    }

    // Получение всех учителей
    @GetMapping
    public ResponseEntity<List<TeacherResponse>> getAllTeachers() {
        try {
            log.info("Fetching all teachers");
            var teachers = teacherService.getAllTeachers();
            return ResponseEntity.ok(teachers);
        } catch (Exception e) {
            log.error("GOT AN ERROR WHEN FETCHING ALL TEACHERS: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    // Удаление учителя
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeacher(
            @PathVariable Long id
    ) {
        log.info("Deleting teacher with id {}", id);
        boolean deleted = teacherService.deleteTeacher(id);
        return deleted ? ResponseEntity.noContent().build()
                : ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
}