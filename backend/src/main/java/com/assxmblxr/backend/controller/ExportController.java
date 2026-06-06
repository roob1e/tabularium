package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.GradeResponse;
import com.assxmblxr.backend.service.ExportService;
import com.assxmblxr.backend.service.GradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

  private final ExportService exportService;
  private final GradeService  gradeService;

  // ── Grades: по группе + предмет ──────────────────────────────────────────

  @GetMapping("/grades/preview")
  public ResponseEntity<List<GradeResponse>> previewGrades(
          @RequestParam Long groupId, @RequestParam Long subjectId) {
    try { return ResponseEntity.ok(gradeService.getGradesByGroupAndSubject(groupId, subjectId)); }
    catch (Exception e) { log.error("Grades preview error", e); return ResponseEntity.internalServerError().build(); }
  }

  @GetMapping("/grades/excel")
  public ResponseEntity<byte[]> exportGradesExcel(
          @RequestParam Long groupId, @RequestParam Long subjectId) {
    try {
      return xlsxResponse(exportService.exportGradesToExcel(groupId, subjectId), "grades.xlsx");
    } catch (Exception e) { log.error("Grades Excel error", e); return ResponseEntity.internalServerError().build(); }
  }

  @GetMapping("/grades/pdf")
  public ResponseEntity<byte[]> exportGradesPdf(
          @RequestParam Long groupId, @RequestParam Long subjectId) {
    try {
      return pdfResponse(exportService.exportGradesToPdf(groupId, subjectId), "grades.pdf");
    } catch (Exception e) { log.error("Grades PDF error", e); return ResponseEntity.internalServerError().build(); }
  }

  // ── Grades: по учащемуся ─────────────────────────────────────────────────

  @GetMapping("/grades/student/excel")
  public ResponseEntity<byte[]> exportGradesByStudentExcel(
          @RequestParam Long studentId,
          @RequestParam(required = false) Long subjectId) {
    try {
      return xlsxResponse(exportService.exportGradesByStudentToExcel(studentId, subjectId), "grades_student.xlsx");
    } catch (Exception e) { log.error("Student grades Excel error", e); return ResponseEntity.internalServerError().build(); }
  }

  @GetMapping("/grades/student/pdf")
  public ResponseEntity<byte[]> exportGradesByStudentPdf(
          @RequestParam Long studentId,
          @RequestParam(required = false) Long subjectId) {
    try {
      return pdfResponse(exportService.exportGradesByStudentToPdf(studentId, subjectId), "grades_student.pdf");
    } catch (Exception e) { log.error("Student grades PDF error", e); return ResponseEntity.internalServerError().build(); }
  }

  // ── Statistics ────────────────────────────────────────────────────────────

  @GetMapping("/statistics/excel")
  public ResponseEntity<byte[]> exportStatisticsExcel(
          @RequestParam(required = false) Long groupId) {
    try {
      return xlsxResponse(exportService.exportStatisticsToExcel(groupId), "statistics.xlsx");
    } catch (Exception e) { log.error("Statistics Excel error", e); return ResponseEntity.internalServerError().build(); }
  }

  @GetMapping("/statistics/pdf")
  public ResponseEntity<byte[]> exportStatisticsPdf(
          @RequestParam(required = false) Long groupId) {
    try {
      return pdfResponse(exportService.exportStatisticsToPdf(groupId), "statistics.pdf");
    } catch (Exception e) { log.error("Statistics PDF error", e); return ResponseEntity.internalServerError().build(); }
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private ResponseEntity<byte[]> xlsxResponse(byte[] data, String filename) {
    return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(data);
  }

  private ResponseEntity<byte[]> pdfResponse(byte[] data, String filename) {
    return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(data);
  }
}