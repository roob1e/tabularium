package com.roobie.backend.controller;

import com.roobie.backend.dto.GradeRequest;
import com.roobie.backend.dto.GradeResponse;
import com.roobie.backend.service.GradeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/grades")
public class GradeController {
    private final GradeService gradeService;

    public GradeController(GradeService gradeService) {
        this.gradeService = gradeService;
    }

    @GetMapping
    public ResponseEntity<List<GradeResponse>> getAll() {
        return ResponseEntity.ok(gradeService.getAllGrades());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GradeResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(gradeService.getGrade(id));
    }

    @PostMapping
    public ResponseEntity<GradeResponse> create(@RequestBody GradeRequest request) {
        return ResponseEntity.ok(gradeService.createGrade(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GradeResponse> update(@PathVariable Long id, @RequestBody GradeRequest request) {
        return ResponseEntity.ok(gradeService.updateGrade(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GradeResponse> delete(@PathVariable Long id) {
        boolean deleted = gradeService.deleteGrade(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
