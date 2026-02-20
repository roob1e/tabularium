package com.assxmblxr.backend.service;

import com.assxmblxr.backend.dto.TeacherRequest;
import com.assxmblxr.backend.dto.TeacherResponse;
import com.assxmblxr.backend.entity.Subject;
import com.assxmblxr.backend.entity.Teacher;
import com.assxmblxr.backend.exceptions.SubjectException;
import com.assxmblxr.backend.exceptions.TeacherException;
import com.assxmblxr.backend.repository.SubjectRepository;
import com.assxmblxr.backend.repository.TeacherRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TeacherService {
  private final TeacherRepository teacherRepository;
  private final SubjectRepository subjectRepository;

  public TeacherService(TeacherRepository teacherRepository, SubjectRepository subjectRepository) {
    this.teacherRepository = teacherRepository;
    this.subjectRepository = subjectRepository;
  }

  @Transactional
  public TeacherResponse createTeacher(TeacherRequest request) {
    Set<Subject> subjects = getSubjectsByIds(request.getSubjectIds());

    Teacher teacher = Teacher.builder()
            .fullname(request.getFullname())
            .phone(request.getPhone())
            .subjects(subjects)
            .build();

    Teacher saved = teacherRepository.save(teacher);
    return toResponse(saved);
  }

  @Transactional
  public TeacherResponse updateTeacher(Long id, TeacherRequest request) {
    Teacher teacher = teacherRepository.findById(id)
            .orElseThrow(() -> new TeacherException("Учитель не найден", id));

    teacher.setFullname(request.getFullname());
    teacher.setPhone(request.getPhone());
    teacher.setSubjects(getSubjectsByIds(request.getSubjectIds()));

    Teacher updated = teacherRepository.save(teacher);
    return toResponse(updated);
  }

  @Transactional
  public boolean deleteTeacher(Long id) {
    return teacherRepository.findById(id)
            .map(teacher -> {
              teacherRepository.delete(teacher);
              return true;
            })
            .orElse(false);
  }

  public TeacherResponse getTeacher(Long id) {
    Teacher teacher = teacherRepository.findById(id)
            .orElseThrow(() -> new TeacherException("Учитель не найден", id));
    return toResponse(teacher);
  }

  public List<TeacherResponse> getAllTeachers() {
    return teacherRepository.findAll().stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
  }

  private Set<Subject> getSubjectsByIds(Set<Long> ids) {
    if (ids == null || ids.isEmpty()) return new HashSet<>();

    Set<Subject> subjects = new HashSet<>();
    for (Long id : ids) {
      Subject subject = subjectRepository.findById(id)
              .orElseThrow(() -> new SubjectException("Предмет не найден", id));
      subjects.add(subject);
    }
    return subjects;
  }

  private TeacherResponse toResponse(Teacher teacher) {
    TeacherResponse response = new TeacherResponse();
    response.setId(teacher.getId());
    response.setFullname(teacher.getFullname());
    response.setPhone(teacher.getPhone());
    Set<Long> subjectIds = teacher.getSubjects() != null ?
            teacher.getSubjects().stream().map(Subject::getId).collect(Collectors.toSet())
            : new HashSet<>();
    response.setSubjectIds(subjectIds);
    return response;
  }
}