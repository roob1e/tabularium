package com.assxmblxr.backend.service;

import com.assxmblxr.backend.dto.SubjectDTO;
import com.assxmblxr.backend.entity.Subject;
import com.assxmblxr.backend.entity.Teacher;
import com.assxmblxr.backend.exceptions.SubjectNotFoundException;
import com.assxmblxr.backend.repository.SubjectRepository;
import com.assxmblxr.backend.repository.TeacherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class SubjectService {

  private final SubjectRepository subjectRepository;
  private final TeacherRepository teacherRepository;

  public SubjectService(SubjectRepository subjectRepository, TeacherRepository teacherRepository) {
    this.subjectRepository = subjectRepository;
    this.teacherRepository = teacherRepository;
  }

  @Transactional
  public Subject createSubject(SubjectDTO dto) {
    Set<Teacher> teachers = new HashSet<>();
    if (dto.getTeacherIds() != null) {
      teachers = new HashSet<>(teacherRepository.findAllById(dto.getTeacherIds()));
    }

    Subject subject = Subject.builder()
            .name(dto.getName())
            .teachers(teachers)
            .build();

    return subjectRepository.save(subject);
  }

  @Transactional
  public Subject updateSubject(Long id, SubjectDTO dto) {
    Subject subject = subjectRepository.findById(id)
            .orElseThrow(() -> new SubjectNotFoundException("Subject not found", id));

    subject.setName(dto.getName());

    Set<Teacher> teachers = new HashSet<>();
    if (dto.getTeacherIds() != null) {
      teachers = new HashSet<>(teacherRepository.findAllById(dto.getTeacherIds()));
    }
    subject.setTeachers(teachers);

    return subjectRepository.save(subject);
  }

  public Subject getSubject(Long id) {
    return subjectRepository.findById(id)
            .orElseThrow(() -> new SubjectNotFoundException("Subject not found", id));
  }

  public List<Subject> getAllSubjects() {
    return subjectRepository.findAll();
  }

  @Transactional
  public boolean deleteSubject(Long id) {
    return subjectRepository.findById(id)
            .map(subject -> {
              subjectRepository.delete(subject);
              return true;
            }).orElse(false);
  }
}