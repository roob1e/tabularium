package com.assxmblxr.backend.service;

import com.assxmblxr.backend.entity.Grade;
import com.assxmblxr.backend.repository.GradeRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExportService {
  private final GradeRepository gradeRepository;

  // ───────────────────────── EXCEL ─────────────────────────

  public byte[] exportGradesToExcel(Long groupId, Long subjectId) throws IOException {
    List<Grade> grades = gradeRepository.findByGroupAndSubject(groupId, subjectId);

    try (Workbook workbook = new XSSFWorkbook();
         ByteArrayOutputStream out = new ByteArrayOutputStream()) {

      Sheet sheet = workbook.createSheet("Оценки");

      CellStyle headerStyle = workbook.createCellStyle();
      Font headerFont = workbook.createFont();
      headerFont.setBold(true);
      headerStyle.setFont(headerFont);
      headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
      headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      headerStyle.setBorderBottom(BorderStyle.THIN);

      String[] cols = {"ID", "Учащийся", "Предмет", "Учитель", "Оценка", "Тип работы", "Дата", "Комментарий"};
      Row header = sheet.createRow(0);
      for (int i = 0; i < cols.length; i++) {
        Cell cell = header.createCell(i);
        cell.setCellValue(cols[i]);
        cell.setCellStyle(headerStyle);
      }

      int rowIdx = 1;
      for (Grade g : grades) {
        Row row = sheet.createRow(rowIdx++);
        row.createCell(0).setCellValue(g.getId());
        row.createCell(1).setCellValue(g.getStudent().getFullname());
        row.createCell(2).setCellValue(g.getSubject().getName());
        row.createCell(3).setCellValue(g.getTeacher() != null ? g.getTeacher().getFullname() : "");
        row.createCell(4).setCellValue(g.getGrade());
        row.createCell(5).setCellValue(g.getWorkType() != null ? workTypeLabel(g.getWorkType().name()) : "");
        row.createCell(6).setCellValue(g.getGradeDate() != null ? g.getGradeDate().toString() : "");
        row.createCell(7).setCellValue(g.getComment() != null ? g.getComment() : "");
      }

      for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);

      workbook.write(out);
      return out.toByteArray();
    }
  }

  // ───────────────────────── PDF ─────────────────────────

  public byte[] exportGradesToPdf(Long groupId, Long subjectId) throws IOException {
    List<Grade> grades = gradeRepository.findByGroupAndSubject(groupId, subjectId);

    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Document document = new Document(PageSize.A4.rotate(), 30, 30, 30, 30);
      PdfWriter.getInstance(document, out);
      document.open();

      // BUG FIX: кириллица — загружаем встроенный шрифт FreeSans из classpath.
      // Если недоступен, падаем на Helvetica (только латиница, но не крашимся).
      BaseFont baseFont = loadCyrillicFont();
      com.lowagie.text.Font titleFont  = new com.lowagie.text.Font(baseFont, 14, com.lowagie.text.Font.BOLD);
      com.lowagie.text.Font headFont   = new com.lowagie.text.Font(baseFont, 9,  com.lowagie.text.Font.BOLD);
      com.lowagie.text.Font cellFont   = new com.lowagie.text.Font(baseFont, 9,  com.lowagie.text.Font.NORMAL);
      com.lowagie.text.Font summaryFont= new com.lowagie.text.Font(baseFont, 9,  com.lowagie.text.Font.ITALIC);

      // Заголовок
      String groupName  = grades.isEmpty() ? "" : grades.get(0).getStudent().getGroup() != null
              ? grades.get(0).getStudent().getGroup().getName() : "";
      String subjectName = grades.isEmpty() ? "" : grades.get(0).getSubject().getName();

      Paragraph title = new Paragraph("Журнал оценок", titleFont);
      title.setAlignment(Element.ALIGN_CENTER);
      document.add(title);

      if (!groupName.isEmpty() || !subjectName.isEmpty()) {
        Paragraph sub = new Paragraph(
                "Группа: " + groupName + "   Предмет: " + subjectName, summaryFont);
        sub.setAlignment(Element.ALIGN_CENTER);
        sub.setSpacingBefore(4);
        document.add(sub);
      }
      document.add(new Paragraph(" "));

      // Таблица
      PdfPTable table = new PdfPTable(7);
      table.setWidthPercentage(100);
      table.setWidths(new float[]{0.6f, 3f, 2.5f, 2.5f, 1f, 1.8f, 1.5f});

      String[] headers = {"ID", "Учащийся", "Предмет", "Учитель", "Оценка", "Тип работы", "Дата"};
      for (String h : headers) {
        PdfPCell cell = new PdfPCell(new Phrase(h, headFont));
        cell.setBackgroundColor(new Color(180, 210, 240));
        cell.setPadding(5);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
      }

      double sum = 0;
      for (Grade g : grades) {
        sum += g.getGrade();
        addPdfCell(table, String.valueOf(g.getId()), cellFont, Element.ALIGN_CENTER);
        addPdfCell(table, g.getStudent().getFullname(), cellFont, Element.ALIGN_LEFT);
        addPdfCell(table, g.getSubject().getName(), cellFont, Element.ALIGN_LEFT);
        addPdfCell(table, g.getTeacher() != null ? g.getTeacher().getFullname() : "—", cellFont, Element.ALIGN_LEFT);
        addPdfCell(table, String.valueOf(g.getGrade()), cellFont, Element.ALIGN_CENTER);
        addPdfCell(table, g.getWorkType() != null ? workTypeLabel(g.getWorkType().name()) : "—", cellFont, Element.ALIGN_LEFT);
        addPdfCell(table, g.getGradeDate() != null ? g.getGradeDate().toString() : "—", cellFont, Element.ALIGN_CENTER);
      }

      document.add(table);

      // Итоговая строка
      if (!grades.isEmpty()) {
        double avg = sum / grades.size();
        Paragraph footer = new Paragraph(
                String.format("Всего записей: %d   |   Средний балл: %.2f", grades.size(), avg),
                summaryFont);
        footer.setSpacingBefore(8);
        footer.setAlignment(Element.ALIGN_RIGHT);
        document.add(footer);
      }

      document.close();
      return out.toByteArray();
    }
  }

  // ───────────────────────── helpers ─────────────────────────

  private void addPdfCell(PdfPTable table, String text, com.lowagie.text.Font font, int align) {
    PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "—", font));
    cell.setPadding(4);
    cell.setHorizontalAlignment(align);
    table.addCell(cell);
  }

  /**
   * Пытается загрузить FreeSans (поддерживает кириллицу) из classpath.
   * Если не найден — использует встроенный Helvetica (кириллица не отобразится,
   * но приложение не упадёт).
   *
   * Чтобы добавить FreeSans: положить FreeSans.ttf в src/main/resources/fonts/FreeSans.ttf
   */
  private BaseFont loadCyrillicFont() {
    try (InputStream is = getClass().getResourceAsStream("/fonts/FreeSans.ttf")) {
      if (is != null) {
        byte[] fontBytes = is.readAllBytes();
        return BaseFont.createFont("FreeSans.ttf", BaseFont.IDENTITY_H,
                BaseFont.EMBEDDED, true, fontBytes, null);
      }
    } catch (Exception ignored) {}

    // Запасной вариант — системные шрифты с поддержкой кириллицы
    for (String path : new String[]{
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/ArialUni.ttf"
    }) {
      try {
        return BaseFont.createFont(path, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
      } catch (Exception ignored) {}
    }

    // Последний fallback — Helvetica без кириллицы
    try {
      return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
    } catch (Exception e) {
      throw new RuntimeException("Cannot load any font for PDF", e);
    }
  }

  private String workTypeLabel(String type) {
    return switch (type) {
      case "CURRENT"     -> "Текущая";
      case "CONTROL"     -> "Контрольная";
      case "INDEPENDENT" -> "Самостоятельная";
      case "TEST"        -> "Зачёт";
      case "EXAM"        -> "Экзамен";
      case "FINAL"       -> "Итоговая";
      default            -> type;
    };
  }
}