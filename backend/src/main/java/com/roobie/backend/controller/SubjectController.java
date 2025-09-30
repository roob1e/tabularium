package com.roobie.backend.controller;

import com.roobie.backend.dto.SubjectDTO;
import com.roobie.backend.entity.Subject;
import com.roobie.backend.service.SubjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subjects")
public class SubjectController {

    private final SubjectService subjectService;

    public SubjectController(SubjectService subjectService) {
        this.subjectService = subjectService;
    }

    @PostMapping
    public ResponseEntity<Subject> createSubject(@RequestBody SubjectDTO dto) {
        return ResponseEntity.ok(subjectService.createSubject(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subject> updateSubject(@PathVariable Long id, @RequestBody SubjectDTO dto) {
        return ResponseEntity.ok(subjectService.updateSubject(id, dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Subject> getSubject(@PathVariable Long id) {
        return ResponseEntity.ok(subjectService.getSubject(id));
    }

    @GetMapping
    public ResponseEntity<List<Subject>> getAllSubjects() {
        return ResponseEntity.ok(subjectService.getAllSubjects());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deleteSubject(@PathVariable Long id) {
        return ResponseEntity.ok(subjectService.deleteSubject(id));
    }
}
