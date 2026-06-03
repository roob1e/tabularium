package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.service.ExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {
  private final ExportService exportService;

  /**
   * GET /api/export/grades/excel?groupId=&subjectId=
   * Экспорт журнала оценок в Excel — требование ТЗ
   */
  @GetMapping("/grades/excel")
  public ResponseEntity<byte[]> exportGradesExcel(
          @RequestParam Long groupId,
          @RequestParam Long subjectId
  ) {
    try {
      byte[] data = exportService.exportGradesToExcel(groupId, subjectId);
      return ResponseEntity.ok()
              .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=grades.xlsx")
              .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
              .body(data);
    } catch (Exception e) {
      log.error("Excel export error: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }

  /**
   * GET /api/export/grades/pdf?groupId=&subjectId=
   * Экспорт журнала оценок в PDF — требование ТЗ
   */
  @GetMapping("/grades/pdf")
  public ResponseEntity<byte[]> exportGradesPdf(
          @RequestParam Long groupId,
          @RequestParam Long subjectId
  ) {
    try {
      byte[] data = exportService.exportGradesToPdf(groupId, subjectId);
      return ResponseEntity.ok()
              .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=grades.pdf")
              .contentType(MediaType.APPLICATION_PDF)
              .body(data);
    } catch (Exception e) {
      log.error("PDF export error: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }
}