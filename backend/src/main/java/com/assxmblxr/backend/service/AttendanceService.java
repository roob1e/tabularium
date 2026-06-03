package com.assxmblxr.backend.service;

import com.assxmblxr.backend.dto.AttendanceRequest;
import com.assxmblxr.backend.dto.AttendanceResponse;
import com.assxmblxr.backend.entity.*;
import com.assxmblxr.backend.exceptions.AttendanceException;
import com.assxmblxr.backend.exceptions.StudentException;
import com.assxmblxr.backend.exceptions.SubjectException;
import com.assxmblxr.backend.exceptions.TeacherException;
import com.assxmblxr.backend.repository.AttendanceRepository;
import com.assxmblxr.backend.repository.StudentRepository;
import com.assxmblxr.backend.repository.SubjectRepository;
import com.assxmblxr.backend.repository.TeacherRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceService {
  private final AttendanceRepository attendanceRepository;
  private final StudentRepository studentRepository;
  private final SubjectRepository subjectRepository;
  private final TeacherRepository teacherRepository;

  @Transactional
  public AttendanceResponse create(AttendanceRequest request) {
    Attendance a = Attendance.builder()
            .student(studentById(request.getStudentId()))
            .subject(subjectById(request.getSubjectId()))
            .teacher(request.getTeacherId() != null ? teacherById(request.getTeacherId()) : null)
            .attendanceDate(request.getAttendanceDate())
            .status(request.getStatus())
            .note(request.getNote())
            .build();
    return toResponse(attendanceRepository.save(a));
  }

  @Transactional
  public AttendanceResponse update(Long id, AttendanceRequest request) {
    Attendance a = attendanceRepository.findById(id)
            .orElseThrow(() -> new AttendanceException("Запись посещаемости не найдена", id));
    a.setStudent(studentById(request.getStudentId()));
    a.setSubject(subjectById(request.getSubjectId()));
    a.setTeacher(request.getTeacherId() != null ? teacherById(request.getTeacherId()) : null);
    a.setAttendanceDate(request.getAttendanceDate());
    a.setStatus(request.getStatus());
    a.setNote(request.getNote());
    return toResponse(attendanceRepository.save(a));
  }

  @Transactional
  public boolean delete(Long id) {
    return attendanceRepository.findById(id)
            .map(a -> { attendanceRepository.delete(a); return true; }).orElse(false);
  }

  public AttendanceResponse getById(Long id) {
    return attendanceRepository.findById(id).map(this::toResponse)
            .orElseThrow(() -> new AttendanceException("Запись не найдена", id));
  }

  public List<AttendanceResponse> getAll() {
    return attendanceRepository.findAll().stream().map(this::toResponse).toList();
  }

  public List<AttendanceResponse> getByStudent(Long studentId) {
    return attendanceRepository.findByStudentId(studentId).stream().map(this::toResponse).toList();
  }

  public List<AttendanceResponse> getByStudentDateRange(Long studentId, LocalDate from, LocalDate to) {
    return attendanceRepository.findByStudentIdAndAttendanceDateBetween(studentId, from, to)
            .stream().map(this::toResponse).toList();
  }

  public List<AttendanceResponse> getBySubjectAndDate(Long subjectId, LocalDate date) {
    return attendanceRepository.findBySubjectIdAndAttendanceDate(subjectId, date)
            .stream().map(this::toResponse).toList();
  }

  public List<AttendanceResponse> getByGroupAndDate(Long groupId, LocalDate date) {
    return attendanceRepository.findByGroupAndDate(groupId, date).stream().map(this::toResponse).toList();
  }

  /** Количество пропусков студента по предмету */
  public long countAbsences(Long studentId, Long subjectId) {
    return attendanceRepository.countByStudentAndSubjectAndStatus(studentId, subjectId, AttendanceStatus.ABSENT)
            + attendanceRepository.countByStudentAndSubjectAndStatus(studentId, subjectId, AttendanceStatus.EXCUSED);
  }

  private AttendanceResponse toResponse(Attendance a) {
    AttendanceResponse r = new AttendanceResponse();
    r.setId(a.getId());
    r.setStudentId(a.getStudent().getId());
    r.setStudentName(a.getStudent().getFullname());
    r.setSubjectId(a.getSubject().getId());
    r.setSubjectName(a.getSubject().getName());
    r.setTeacherId(a.getTeacher() != null ? a.getTeacher().getId() : null);
    r.setTeacherName(a.getTeacher() != null ? a.getTeacher().getFullname() : null);
    r.setAttendanceDate(a.getAttendanceDate());
    r.setStatus(a.getStatus());
    r.setNote(a.getNote());
    return r;
  }

  private Student studentById(Long id) {
    return studentRepository.findById(id).orElseThrow(() -> new StudentException("Студент не найден", id));
  }
  private Subject subjectById(Long id) {
    return subjectRepository.findById(id).orElseThrow(() -> new SubjectException("Предмет не найден", id));
  }
  private Teacher teacherById(Long id) {
    return teacherRepository.findById(id).orElseThrow(() -> new TeacherException("Учитель не найден", id));
  }
}