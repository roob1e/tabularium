package com.assxmblxr.backend.service;

import com.assxmblxr.backend.dto.GradeRequest;
import com.assxmblxr.backend.dto.GradeResponse;
import com.assxmblxr.backend.entity.Grade;
import com.assxmblxr.backend.entity.Student;
import com.assxmblxr.backend.entity.Subject;
import com.assxmblxr.backend.entity.Teacher;
import com.assxmblxr.backend.exceptions.GradeException;
import com.assxmblxr.backend.exceptions.StudentException;
import com.assxmblxr.backend.exceptions.SubjectException;
import com.assxmblxr.backend.exceptions.TeacherException;
import com.assxmblxr.backend.repository.GradeRepository;
import com.assxmblxr.backend.repository.StudentRepository;
import com.assxmblxr.backend.repository.SubjectRepository;
import com.assxmblxr.backend.repository.TeacherRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GradeService {
  private final GradeRepository gradeRepository;
  private final StudentRepository studentRepository;
  private final SubjectRepository subjectRepository;
  private final TeacherRepository teacherRepository;

  public GradeService(GradeRepository gradeRepository, StudentRepository studentRepository,
                      SubjectRepository subjectRepository, TeacherRepository teacherRepository) {
    this.gradeRepository = gradeRepository;
    this.studentRepository = studentRepository;
    this.subjectRepository = subjectRepository;
    this.teacherRepository = teacherRepository;
  }

  @Transactional
  public GradeResponse createGrade(GradeRequest request) {
    Grade grade = new Grade();
    grade.setStudent(getStudentById(request.getStudentId()));
    grade.setSubject(getSubjectById(request.getSubjectId()));
    grade.setTeacher(request.getTeacherId() != null ? getTeacherById(request.getTeacherId()) : null);
    grade.setGrade(request.getGrade());
    grade.setWorkType(request.getWorkType());
    grade.setGradeDate(request.getGradeDate() != null ? request.getGradeDate() : LocalDate.now());
    grade.setComment(request.getComment());
    return toResponse(gradeRepository.save(grade));
  }

  @Transactional
  public GradeResponse updateGrade(Long id, GradeRequest request) {
    Grade grade = gradeRepository.findById(id)
            .orElseThrow(() -> new GradeException("Оценка не найдена", id));
    grade.setStudent(getStudentById(request.getStudentId()));
    grade.setSubject(getSubjectById(request.getSubjectId()));
    grade.setTeacher(request.getTeacherId() != null ? getTeacherById(request.getTeacherId()) : null);
    grade.setGrade(request.getGrade());
    grade.setWorkType(request.getWorkType());
    if (request.getGradeDate() != null) grade.setGradeDate(request.getGradeDate());
    grade.setComment(request.getComment());
    return toResponse(gradeRepository.save(grade));
  }

  @Transactional
  public boolean deleteGrade(Long id) {
    return gradeRepository.findById(id).map(g -> { gradeRepository.delete(g); return true; }).orElse(false);
  }

  public List<GradeResponse> getAllGrades() {
    return gradeRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
  }

  public GradeResponse getGrade(Long id) {
    return gradeRepository.findById(id).map(this::toResponse)
            .orElseThrow(() -> new GradeException("Оценка не найдена", id));
  }

  public List<GradeResponse> getGradesByStudent(Long studentId) {
    return gradeRepository.findByStudentId(studentId).stream().map(this::toResponse).toList();
  }

  public List<GradeResponse> getGradesByStudentAndSubject(Long studentId, Long subjectId) {
    return gradeRepository.findByStudentIdAndSubjectId(studentId, subjectId).stream().map(this::toResponse).toList();
  }

  private GradeResponse toResponse(Grade grade) {
    GradeResponse r = new GradeResponse();
    r.setId(grade.getId());
    r.setStudentId(grade.getStudent().getId());
    r.setStudentName(grade.getStudent().getFullname());
    r.setSubjectId(grade.getSubject().getId());
    r.setSubjectName(grade.getSubject().getName());
    r.setTeacherId(grade.getTeacher() != null ? grade.getTeacher().getId() : null);
    r.setTeacherName(grade.getTeacher() != null ? grade.getTeacher().getFullname() : null);
    r.setGrade(grade.getGrade());
    r.setWorkType(grade.getWorkType());
    r.setGradeDate(grade.getGradeDate());
    r.setComment(grade.getComment());
    return r;
  }

  private Teacher getTeacherById(Long id) {
    return teacherRepository.findById(id).orElseThrow(() -> new TeacherException("Учитель не найден", id));
  }
  private Subject getSubjectById(Long id) {
    return subjectRepository.findById(id).orElseThrow(() -> new SubjectException("Предмет не найден", id));
  }
  private Student getStudentById(Long id) {
    return studentRepository.findById(id).orElseThrow(() -> new StudentException("Студент не найден", id));
  }
}