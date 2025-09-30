package com.roobie.backend.controller;

import com.roobie.backend.dto.TeacherRequest;
import com.roobie.backend.dto.TeacherResponse;
import com.roobie.backend.service.TeacherService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teachers")
public class TeacherController {

    private final TeacherService teacherService;

    public TeacherController(TeacherService teacherService) {
        this.teacherService = teacherService;
    }

    // Создание учителя
    @PostMapping
    public ResponseEntity<TeacherResponse> createTeacher(@RequestBody TeacherRequest request) {
        TeacherResponse response = teacherService.createTeacher(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // Обновление учителя
    @PutMapping("/{id}")
    public ResponseEntity<TeacherResponse> updateTeacher(@PathVariable Long id,
                                                         @RequestBody TeacherRequest request) {
        TeacherResponse response = teacherService.updateTeacher(id, request);
        return ResponseEntity.ok(response);
    }

    // Получение одного учителя
    @GetMapping("/{id}")
    public ResponseEntity<TeacherResponse> getTeacher(@PathVariable Long id) {
        TeacherResponse response = teacherService.getTeacher(id);
        return ResponseEntity.ok(response);
    }

    // Получение всех учителей
    @GetMapping
    public ResponseEntity<List<TeacherResponse>> getAllTeachers() {
        List<TeacherResponse> responses = teacherService.getAllTeachers();
        return ResponseEntity.ok(responses);
    }

    // Удаление учителя
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeacher(@PathVariable Long id) {
        boolean deleted = teacherService.deleteTeacher(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
