package com.assxmblxr.backend.service;

import com.assxmblxr.backend.entity.Attendance;
import com.assxmblxr.backend.entity.AttendanceStatus;
import com.assxmblxr.backend.entity.Grade;
import com.assxmblxr.backend.entity.Student;
import com.assxmblxr.backend.repository.AttendanceRepository;
import com.assxmblxr.backend.repository.GradeRepository;
import com.assxmblxr.backend.repository.StudentRepository;
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
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExportService {

  private final GradeRepository gradeRepository;
  private final StudentRepository studentRepository;
  private final AttendanceRepository attendanceRepository;

  // ══════════════════════════════════════════════════════════════
  //  GRADES — по группе + предмет
  // ══════════════════════════════════════════════════════════════

  public byte[] exportGradesToExcel(Long groupId, Long subjectId) throws IOException {
    List<Grade> grades = gradeRepository.findByGroupAndSubject(groupId, subjectId);
    return gradesToExcel(grades);
  }

  public byte[] exportGradesByStudentToExcel(Long studentId, Long subjectId) throws IOException {
    List<Grade> grades = subjectId != null
            ? gradeRepository.findByStudentIdAndSubjectId(studentId, subjectId)
            : gradeRepository.findByStudentId(studentId);
    return gradesToExcel(grades);
  }

  public byte[] exportGradesToPdf(Long groupId, Long subjectId) throws IOException {
    List<Grade> grades = gradeRepository.findByGroupAndSubject(groupId, subjectId);
    String groupName   = grades.isEmpty() ? "" : safeGroupName(grades.get(0).getStudent());
    String subjectName = grades.isEmpty() ? "" : grades.get(0).getSubject().getName();
    return gradesToPdf(grades, "Журнал оценок", "Группа: " + groupName + "   Предмет: " + subjectName);
  }

  public byte[] exportGradesByStudentToPdf(Long studentId, Long subjectId) throws IOException {
    List<Grade> grades = subjectId != null
            ? gradeRepository.findByStudentIdAndSubjectId(studentId, subjectId)
            : gradeRepository.findByStudentId(studentId);
    String name = grades.isEmpty() ? "" : grades.get(0).getStudent().getFullname();
    return gradesToPdf(grades, "Оценки учащегося", name);
  }

  // ── общая генерация Excel/PDF для оценок ─────────────────────────────────

  private byte[] gradesToExcel(List<Grade> grades) throws IOException {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("Оценки");
      CellStyle hs = buildHeaderStyle(wb);
      String[] cols = {"ID", "Учащийся", "Предмет", "Учитель", "Оценка", "Тип работы", "Дата", "Комментарий"};
      writeHeaderRow(sheet, cols, hs);
      int r = 1;
      for (Grade g : grades) {
        Row row = sheet.createRow(r++);
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
      wb.write(out);
      return out.toByteArray();
    }
  }

  private byte[] gradesToPdf(List<Grade> grades, String title, String subtitle) throws IOException {
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Document doc = new Document(PageSize.A4.rotate(), 30, 30, 30, 30);
      PdfWriter.getInstance(doc, out);
      doc.open();
      BaseFont bf = loadCyrillicFont();
      com.lowagie.text.Font tf = new com.lowagie.text.Font(bf, 14, com.lowagie.text.Font.BOLD);
      com.lowagie.text.Font hf = new com.lowagie.text.Font(bf, 9,  com.lowagie.text.Font.BOLD);
      com.lowagie.text.Font cf = new com.lowagie.text.Font(bf, 9,  com.lowagie.text.Font.NORMAL);
      com.lowagie.text.Font sf = new com.lowagie.text.Font(bf, 9,  com.lowagie.text.Font.ITALIC);
      addPdfTitle(doc, title, tf);
      if (!subtitle.isBlank()) addPdfSubtitle(doc, subtitle, sf);
      doc.add(new Paragraph(" "));
      PdfPTable table = new PdfPTable(7);
      table.setWidthPercentage(100);
      table.setWidths(new float[]{0.6f, 3f, 2.5f, 2.5f, 1f, 1.8f, 1.5f});
      for (String h : new String[]{"ID", "Учащийся", "Предмет", "Учитель", "Оценка", "Тип работы", "Дата"})
        addPdfHeaderCell(table, h, hf);
      double sum = 0;
      for (Grade g : grades) {
        sum += g.getGrade();
        addPdfCell(table, String.valueOf(g.getId()),                                      cf, Element.ALIGN_CENTER);
        addPdfCell(table, g.getStudent().getFullname(),                                   cf, Element.ALIGN_LEFT);
        addPdfCell(table, g.getSubject().getName(),                                       cf, Element.ALIGN_LEFT);
        addPdfCell(table, g.getTeacher() != null ? g.getTeacher().getFullname() : "—",   cf, Element.ALIGN_LEFT);
        addPdfCell(table, String.valueOf(g.getGrade()),                                   cf, Element.ALIGN_CENTER);
        addPdfCell(table, g.getWorkType() != null ? workTypeLabel(g.getWorkType().name()) : "—", cf, Element.ALIGN_LEFT);
        addPdfCell(table, g.getGradeDate() != null ? g.getGradeDate().toString() : "—",  cf, Element.ALIGN_CENTER);
      }
      doc.add(table);
      if (!grades.isEmpty()) {
        Paragraph footer = new Paragraph(
                String.format("Всего: %d   |   Средний балл: %.2f", grades.size(), sum / grades.size()), sf);
        footer.setSpacingBefore(8);
        footer.setAlignment(Element.ALIGN_RIGHT);
        doc.add(footer);
      }
      doc.close();
      return out.toByteArray();
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  STATISTICS
  // ══════════════════════════════════════════════════════════════

  public byte[] exportStatisticsToExcel(Long groupId) throws IOException {
    List<Student>    students  = groupId != null ? studentRepository.findByGroupId(groupId) : studentRepository.findAll();
    List<Grade>      allGrades = gradeRepository.findAll();
    List<Attendance> allAtt    = attendanceRepository.findAll();

    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("Статистика");
      CellStyle hs = buildHeaderStyle(wb);
      String[] cols = {"Учащийся","Группа","Средний балл","Плохих оценок","Всего оценок","Пропуски","Всего посещений","Опозданий","Статус риска"};
      writeHeaderRow(sheet, cols, hs);

      CellStyle highStyle = wb.createCellStyle();
      highStyle.setFillForegroundColor(IndexedColors.ROSE.getIndex());
      highStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

      CellStyle medStyle = wb.createCellStyle();
      medStyle.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
      medStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

      int r = 1;
      for (Student st : students) {
        List<Grade>      sg = allGrades.stream().filter(g -> g.getStudent().getId().equals(st.getId())).toList();
        List<Attendance> sa = allAtt.stream().filter(a -> a.getStudent().getId().equals(st.getId())).toList();
        double avg       = sg.isEmpty() ? 0.0 : Math.round(sg.stream().mapToInt(Grade::getGrade).average().orElse(0) * 100.0) / 100.0;
        long badGrades   = sg.stream().filter(g -> g.getGrade() < 5).count();
        long absences    = sa.stream().filter(a -> a.getStatus() == AttendanceStatus.ABSENT || a.getStatus() == AttendanceStatus.EXCUSED).count();
        long lates       = sa.stream().filter(a -> a.getStatus() == AttendanceStatus.LATE).count();
        String risk      = riskLabel(avg, absences, badGrades);

        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(st.getFullname());
        row.createCell(1).setCellValue(st.getGroup() != null ? st.getGroup().getName() : "");
        row.createCell(2).setCellValue(sg.isEmpty() ? "" : String.valueOf(avg));
        row.createCell(3).setCellValue(badGrades);
        row.createCell(4).setCellValue(sg.size());
        row.createCell(5).setCellValue(absences);
        row.createCell(6).setCellValue(sa.size());
        row.createCell(7).setCellValue(lates);
        Cell riskCell = row.createCell(8);
        riskCell.setCellValue(risk);
        if ("Высокий риск".equals(risk))          riskCell.setCellStyle(highStyle);
        else if ("Требует внимания".equals(risk))  riskCell.setCellStyle(medStyle);
      }
      for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
      wb.write(out);
      return out.toByteArray();
    }
  }

  public byte[] exportStatisticsToPdf(Long groupId) throws IOException {
    List<Student>    students  = groupId != null ? studentRepository.findByGroupId(groupId) : studentRepository.findAll();
    List<Grade>      allGrades = gradeRepository.findAll();
    List<Attendance> allAtt    = attendanceRepository.findAll();

    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Document doc = new Document(PageSize.A4.rotate(), 25, 25, 25, 25);
      PdfWriter.getInstance(doc, out);
      doc.open();
      BaseFont bf = loadCyrillicFont();
      com.lowagie.text.Font tf = new com.lowagie.text.Font(bf, 14, com.lowagie.text.Font.BOLD);
      com.lowagie.text.Font hf = new com.lowagie.text.Font(bf, 8,  com.lowagie.text.Font.BOLD);
      com.lowagie.text.Font cf = new com.lowagie.text.Font(bf, 8,  com.lowagie.text.Font.NORMAL);
      com.lowagie.text.Font sf = new com.lowagie.text.Font(bf, 8,  com.lowagie.text.Font.ITALIC);
      addPdfTitle(doc, "Статистика успеваемости и посещаемости", tf);
      doc.add(new Paragraph(" "));
      PdfPTable table = new PdfPTable(9);
      table.setWidthPercentage(100);
      table.setWidths(new float[]{3f, 2f, 1.4f, 1.4f, 1.4f, 1.4f, 1.6f, 1.2f, 2f});
      for (String h : new String[]{"Учащийся","Группа","Ср.балл","Плохих","Всего оц.","Пропуски","Всего пос.","Опозд.","Риск"})
        addPdfHeaderCell(table, h, hf);
      Color highColor = new Color(255, 200, 200);
      Color medColor  = new Color(255, 245, 180);
      for (Student st : students) {
        List<Grade>      sg = allGrades.stream().filter(g -> g.getStudent().getId().equals(st.getId())).toList();
        List<Attendance> sa = allAtt.stream().filter(a -> a.getStudent().getId().equals(st.getId())).toList();
        double avg     = sg.isEmpty() ? 0.0 : Math.round(sg.stream().mapToInt(Grade::getGrade).average().orElse(0) * 100.0) / 100.0;
        long badGrades = sg.stream().filter(g -> g.getGrade() < 5).count();
        long absences  = sa.stream().filter(a -> a.getStatus() == AttendanceStatus.ABSENT || a.getStatus() == AttendanceStatus.EXCUSED).count();
        long lates     = sa.stream().filter(a -> a.getStatus() == AttendanceStatus.LATE).count();
        String risk    = riskLabel(avg, absences, badGrades);
        Color rowBg = "Высокий риск".equals(risk) ? highColor : "Требует внимания".equals(risk) ? medColor : null;
        addPdfCellC(table, st.getFullname(),                                     cf, Element.ALIGN_LEFT,   rowBg);
        addPdfCellC(table, st.getGroup() != null ? st.getGroup().getName() : "—",cf, Element.ALIGN_LEFT,   rowBg);
        addPdfCellC(table, sg.isEmpty() ? "—" : String.valueOf(avg),             cf, Element.ALIGN_CENTER, rowBg);
        addPdfCellC(table, String.valueOf(badGrades),                             cf, Element.ALIGN_CENTER, rowBg);
        addPdfCellC(table, String.valueOf(sg.size()),                             cf, Element.ALIGN_CENTER, rowBg);
        addPdfCellC(table, String.valueOf(absences),                              cf, Element.ALIGN_CENTER, rowBg);
        addPdfCellC(table, String.valueOf(sa.size()),                             cf, Element.ALIGN_CENTER, rowBg);
        addPdfCellC(table, String.valueOf(lates),                                 cf, Element.ALIGN_CENTER, rowBg);
        addPdfCellC(table, risk,                                                  cf, Element.ALIGN_CENTER, rowBg);
      }
      doc.add(table);
      Paragraph footer = new Paragraph("Всего учащихся: " + students.size(), sf);
      footer.setSpacingBefore(8);
      footer.setAlignment(Element.ALIGN_RIGHT);
      doc.add(footer);
      doc.close();
      return out.toByteArray();
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  FILTER RESULTS — экспорт произвольных результатов фильтрации
  // ══════════════════════════════════════════════════════════════

  public byte[] exportFilterResultsToExcel(String entityLabel, List<Map<String, Object>> rows) throws IOException {
    try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Sheet sheet = wb.createSheet("Результаты");
      if (rows.isEmpty()) { wb.write(out); return out.toByteArray(); }

      List<String> cols = new java.util.ArrayList<>(rows.get(0).keySet());
      CellStyle hs = buildHeaderStyle(wb);
      Row header = sheet.createRow(0);
      for (int i = 0; i < cols.size(); i++) {
        Cell cell = header.createCell(i);
        cell.setCellValue(cols.get(i));
        cell.setCellStyle(hs);
      }
      int r = 1;
      for (Map<String, Object> row : rows) {
        Row exRow = sheet.createRow(r++);
        for (int i = 0; i < cols.size(); i++) {
          Object val = row.get(cols.get(i));
          exRow.createCell(i).setCellValue(val != null ? val.toString() : "");
        }
      }
      for (int i = 0; i < cols.size(); i++) sheet.autoSizeColumn(i);
      wb.write(out);
      return out.toByteArray();
    }
  }

  public byte[] exportFilterResultsToPdf(String entityLabel, List<Map<String, Object>> rows) throws IOException {
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      Document doc = new Document(PageSize.A4.rotate(), 20, 20, 20, 20);
      PdfWriter.getInstance(doc, out);
      doc.open();
      BaseFont bf = loadCyrillicFont();
      com.lowagie.text.Font tf = new com.lowagie.text.Font(bf, 13, com.lowagie.text.Font.BOLD);
      com.lowagie.text.Font hf = new com.lowagie.text.Font(bf, 8,  com.lowagie.text.Font.BOLD);
      com.lowagie.text.Font cf = new com.lowagie.text.Font(bf, 8,  com.lowagie.text.Font.NORMAL);
      com.lowagie.text.Font sf = new com.lowagie.text.Font(bf, 8,  com.lowagie.text.Font.ITALIC);
      addPdfTitle(doc, "Результаты фильтрации: " + entityLabel, tf);
      doc.add(new Paragraph(" "));

      if (rows.isEmpty()) {
        doc.add(new Paragraph("Нет данных", cf));
        doc.close();
        return out.toByteArray();
      }

      List<String> cols = new java.util.ArrayList<>(rows.get(0).keySet());
      PdfPTable table = new PdfPTable(cols.size());
      table.setWidthPercentage(100);
      for (String col : cols) addPdfHeaderCell(table, col, hf);
      for (Map<String, Object> row : rows) {
        for (String col : cols) {
          Object val = row.get(col);
          addPdfCell(table, val != null ? val.toString() : "—", cf, Element.ALIGN_LEFT);
        }
      }
      doc.add(table);
      Paragraph footer = new Paragraph("Всего строк: " + rows.size(), sf);
      footer.setSpacingBefore(8);
      footer.setAlignment(Element.ALIGN_RIGHT);
      doc.add(footer);
      doc.close();
      return out.toByteArray();
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Helpers
  // ══════════════════════════════════════════════════════════════

  private String riskLabel(double avg, long absences, long badGrades) {
    if (avg < 4 || absences >= 10)                  return "Высокий риск";
    if (avg < 6 || absences >= 5 || badGrades >= 3) return "Требует внимания";
    return "Норма";
  }

  private String safeGroupName(Student s) {
    return s.getGroup() != null ? s.getGroup().getName() : "";
  }

  private CellStyle buildHeaderStyle(Workbook wb) {
    CellStyle s = wb.createCellStyle();
    Font f = wb.createFont(); f.setBold(true); s.setFont(f);
    s.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
    s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    s.setBorderBottom(BorderStyle.THIN);
    return s;
  }

  private void writeHeaderRow(Sheet sheet, String[] cols, CellStyle style) {
    Row header = sheet.createRow(0);
    for (int i = 0; i < cols.length; i++) {
      Cell cell = header.createCell(i); cell.setCellValue(cols[i]); cell.setCellStyle(style);
    }
  }

  private void addPdfTitle(Document doc, String text, com.lowagie.text.Font font) throws DocumentException {
    Paragraph p = new Paragraph(text, font); p.setAlignment(Element.ALIGN_CENTER); doc.add(p);
  }

  private void addPdfSubtitle(Document doc, String text, com.lowagie.text.Font font) throws DocumentException {
    Paragraph p = new Paragraph(text, font); p.setAlignment(Element.ALIGN_CENTER); p.setSpacingBefore(4); doc.add(p);
  }

  private void addPdfHeaderCell(PdfPTable table, String text, com.lowagie.text.Font font) {
    PdfPCell cell = new PdfPCell(new Phrase(text, font));
    cell.setBackgroundColor(new Color(180, 210, 240));
    cell.setPadding(5); cell.setHorizontalAlignment(Element.ALIGN_CENTER);
    table.addCell(cell);
  }

  private void addPdfCell(PdfPTable table, String text, com.lowagie.text.Font font, int align) {
    addPdfCellC(table, text, font, align, null);
  }

  private void addPdfCellC(PdfPTable table, String text, com.lowagie.text.Font font, int align, Color bg) {
    PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "—", font));
    cell.setPadding(4); cell.setHorizontalAlignment(align);
    if (bg != null) cell.setBackgroundColor(bg);
    table.addCell(cell);
  }

  private BaseFont loadCyrillicFont() {
    try (InputStream is = getClass().getResourceAsStream("/fonts/FreeSans.ttf")) {
      if (is != null) {
        byte[] bytes = is.readAllBytes();
        return BaseFont.createFont("FreeSans.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, bytes, null);
      }
    } catch (Exception ignored) {}
    for (String path : new String[]{
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans.ttf",
            "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/ArialUni.ttf"
    }) { try { return BaseFont.createFont(path, BaseFont.IDENTITY_H, BaseFont.EMBEDDED); } catch (Exception ignored) {} }
    try { return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED); }
    catch (Exception e) { throw new RuntimeException("Cannot load any font for PDF", e); }
  }

  private String workTypeLabel(String type) {
    return switch (type) {
      case "CURRENT" -> "Текущая"; case "CONTROL" -> "Контрольная";
      case "INDEPENDENT" -> "Самостоятельная"; case "TEST" -> "Зачёт";
      case "EXAM" -> "Экзамен"; case "FINAL" -> "Итоговая"; default -> type;
    };
  }
}