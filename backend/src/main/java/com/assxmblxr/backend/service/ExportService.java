package com.assxmblxr.backend.service;

import com.assxmblxr.backend.entity.Grade;
import com.assxmblxr.backend.entity.Student;
import com.assxmblxr.backend.repository.GradeRepository;
import com.assxmblxr.backend.repository.StudentRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
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
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExportService {
  private final GradeRepository gradeRepository;
  private final StudentRepository studentRepository;

  /**
   * Экспорт журнала оценок группы по предмету в Excel (.xlsx)
   * ТЗ: «экспорт отчётов в форматы Excel»
   */
  public byte[] exportGradesToExcel(Long groupId, Long subjectId) throws IOException {
    List<Grade> grades = gradeRepository.findByGroupAndSubject(groupId, subjectId);

    try (Workbook workbook = new XSSFWorkbook();
         ByteArrayOutputStream out = new ByteArrayOutputStream()) {

      Sheet sheet = workbook.createSheet("Оценки");

      // Стиль заголовка
      CellStyle headerStyle = workbook.createCellStyle();
      Font headerFont = workbook.createFont();
      headerFont.setBold(true);
      headerStyle.setFont(headerFont);
      headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
      headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

      // Заголовки
      Row header = sheet.createRow(0);
      String[] cols = {"ID", "Студент", "Предмет", "Учитель", "Оценка", "Тип работы", "Дата", "Комментарий"};
      for (int i = 0; i < cols.length; i++) {
        Cell cell = header.createCell(i);
        cell.setCellValue(cols[i]);
        cell.setCellStyle(headerStyle);
        sheet.autoSizeColumn(i);
      }

      // Данные
      int rowIdx = 1;
      for (Grade g : grades) {
        Row row = sheet.createRow(rowIdx++);
        row.createCell(0).setCellValue(g.getId());
        row.createCell(1).setCellValue(g.getStudent().getFullname());
        row.createCell(2).setCellValue(g.getSubject().getName());
        row.createCell(3).setCellValue(g.getTeacher() != null ? g.getTeacher().getFullname() : "");
        row.createCell(4).setCellValue(g.getGrade());
        row.createCell(5).setCellValue(g.getWorkType() != null ? g.getWorkType().name() : "");
        row.createCell(6).setCellValue(g.getGradeDate() != null ? g.getGradeDate().toString() : "");
        row.createCell(7).setCellValue(g.getComment() != null ? g.getComment() : "");
      }

      for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);

      workbook.write(out);
      return out.toByteArray();
    }
  }

  /**
   * Экспорт журнала оценок группы по предмету в PDF
   * ТЗ: «экспорт отчётов в форматы PDF»
   */
  public byte[] exportGradesToPdf(Long groupId, Long subjectId) throws IOException {
    List<Grade> grades = gradeRepository.findByGroupAndSubject(groupId, subjectId);

    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Document document = new Document(PageSize.A4.rotate());
      PdfWriter.getInstance(document, out);
      document.open();

      // Заголовок
      com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
      document.add(new Paragraph("Журнал оценок", titleFont));
      document.add(new Paragraph(" "));

      // Таблица
      PdfPTable table = new PdfPTable(7);
      table.setWidthPercentage(100);
      table.setWidths(new float[]{1, 3, 2, 2, 1, 2, 2});

      com.lowagie.text.Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
      com.lowagie.text.Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

      String[] headers = {"ID", "Студент", "Предмет", "Учитель", "Оценка", "Тип", "Дата"};
      for (String h : headers) {
        PdfPCell cell = new PdfPCell(new Phrase(h, headFont));
        cell.setBackgroundColor(new Color(173, 216, 230));
        cell.setPadding(5);
        table.addCell(cell);
      }

      for (Grade g : grades) {
        addCell(table, String.valueOf(g.getId()), cellFont);
        addCell(table, g.getStudent().getFullname(), cellFont);
        addCell(table, g.getSubject().getName(), cellFont);
        addCell(table, g.getTeacher() != null ? g.getTeacher().getFullname() : "-", cellFont);
        addCell(table, String.valueOf(g.getGrade()), cellFont);
        addCell(table, g.getWorkType() != null ? g.getWorkType().name() : "-", cellFont);
        addCell(table, g.getGradeDate() != null ? g.getGradeDate().toString() : "-", cellFont);
      }

      document.add(table);
      document.close();
      return out.toByteArray();
    }
  }

  private void addCell(PdfPTable table, String text, com.lowagie.text.Font font) {
    PdfPCell cell = new PdfPCell(new Phrase(text, font));
    cell.setPadding(4);
    table.addCell(cell);
  }
}