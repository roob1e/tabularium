package com.assxmblxr.backend.service;

import com.assxmblxr.backend.dto.GroupAnalyticsResponse;
import com.assxmblxr.backend.dto.StudentAnalyticsResponse;
import com.assxmblxr.backend.entity.AttendanceStatus;
import com.assxmblxr.backend.entity.Grade;
import com.assxmblxr.backend.entity.Student;
import com.assxmblxr.backend.entity.Subject;
import com.assxmblxr.backend.exceptions.GroupException;
import com.assxmblxr.backend.exceptions.StudentException;
import com.assxmblxr.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
  private final StudentRepository studentRepository;
  private final GroupRepository groupRepository;
  private final GradeRepository gradeRepository;
  private final AttendanceRepository attendanceRepository;
  private final SubjectRepository subjectRepository;

  /** Аналитика по одному студенту */
  public StudentAnalyticsResponse getStudentAnalytics(Long studentId) {
    Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new StudentException("Студент не найден", studentId));

    List<Grade> grades = gradeRepository.findByStudentId(studentId);
    List<Subject> subjects = subjectRepository.findAll();

    // Средний балл по каждому предмету
    Map<String, Double> avgBySubject = new LinkedHashMap<>();
    Map<String, Long> absencesBySubject = new LinkedHashMap<>();

    for (Subject subject : subjects) {
      List<Grade> sg = grades.stream()
              .filter(g -> g.getSubject().getId().equals(subject.getId()))
              .toList();
      if (!sg.isEmpty()) {
        double avg = sg.stream().mapToInt(Grade::getGrade).average().orElse(0);
        avgBySubject.put(subject.getName(), Math.round(avg * 100.0) / 100.0);

        long absences = attendanceRepository.countByStudentAndSubjectAndStatus(studentId, subject.getId(), AttendanceStatus.ABSENT)
                + attendanceRepository.countByStudentAndSubjectAndStatus(studentId, subject.getId(), AttendanceStatus.EXCUSED);
        absencesBySubject.put(subject.getName(), absences);
      }
    }

    double overallAvg = grades.isEmpty() ? 0.0
            : Math.round(grades.stream().mapToInt(Grade::getGrade).average().orElse(0) * 100.0) / 100.0;

    long totalAbsences = absencesBySubject.values().stream().mapToLong(Long::longValue).sum();

    return new StudentAnalyticsResponse(
            studentId,
            student.getFullname(),
            student.getGroup() != null ? student.getGroup().getName() : null,
            avgBySubject,
            absencesBySubject,
            overallAvg,
            totalAbsences
    );
  }

  /** Аналитика по группе */
  public GroupAnalyticsResponse getGroupAnalytics(Long groupId) {
    var group = groupRepository.findById(groupId)
            .orElseThrow(() -> new GroupException("Группа не найдена", groupId));

    List<Student> students = studentRepository.findAll().stream()
            .filter(s -> s.getGroup() != null && s.getGroup().getId().equals(groupId))
            .toList();

    List<Subject> subjects = subjectRepository.findAll();

    Map<String, Double> avgBySubject = new LinkedHashMap<>();
    for (Subject subject : subjects) {
      List<Grade> groupGrades = gradeRepository.findByGroupAndSubject(groupId, subject.getId());
      if (!groupGrades.isEmpty()) {
        double avg = groupGrades.stream().mapToInt(Grade::getGrade).average().orElse(0);
        avgBySubject.put(subject.getName(), Math.round(avg * 100.0) / 100.0);
      }
    }

    double overallAvg = avgBySubject.isEmpty() ? 0.0
            : Math.round(avgBySubject.values().stream().mapToDouble(Double::doubleValue).average().orElse(0) * 100.0) / 100.0;

    return new GroupAnalyticsResponse(groupId, group.getName(), students.size(), avgBySubject, overallAvg);
  }
}