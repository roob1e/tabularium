package com.assxmblxr.backend.service;

import com.assxmblxr.backend.dto.SubjectDTO;
import com.assxmblxr.backend.entity.Subject;
import com.assxmblxr.backend.entity.Teacher;
import com.assxmblxr.backend.exceptions.SubjectException;
import com.assxmblxr.backend.repository.SubjectRepository;
import com.assxmblxr.backend.repository.TeacherRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SubjectService {

  private final SubjectRepository subjectRepository;
  private final TeacherRepository teacherRepository;

  public SubjectService(SubjectRepository subjectRepository, TeacherRepository teacherRepository) {
    this.subjectRepository = subjectRepository;
    this.teacherRepository = teacherRepository;
  }

  private SubjectDTO toDTO(Subject subject) {
    Set<Long> teacherIds = subject.getTeachers() != null
            ? subject.getTeachers().stream().map(Teacher::getId).collect(Collectors.toSet())
            : new HashSet<>();
    return SubjectDTO.builder()
            .id(subject.getId())
            .name(subject.getName())
            .teacherIds(teacherIds)
            .build();
  }

  @Transactional
  public SubjectDTO createSubject(SubjectDTO dto) {
    Set<Teacher> teachers = new HashSet<>();
    if (dto.getTeacherIds() != null) {
      teachers = new HashSet<>(teacherRepository.findAllById(dto.getTeacherIds()));
    }

    Subject subject = Subject.builder()
            .name(dto.getName())
            .teachers(teachers)
            .build();

    return toDTO(subjectRepository.save(subject));
  }

  @Transactional
  public SubjectDTO updateSubject(Long id, SubjectDTO dto) {
    Subject subject = subjectRepository.findById(id)
            .orElseThrow(() -> new SubjectException("Subject not found", id));

    subject.setName(dto.getName());

    Set<Teacher> teachers = new HashSet<>();
    if (dto.getTeacherIds() != null) {
      teachers = new HashSet<>(teacherRepository.findAllById(dto.getTeacherIds()));
    }
    subject.setTeachers(teachers);

    return toDTO(subjectRepository.save(subject));
  }

  public SubjectDTO getSubject(Long id) {
    return toDTO(subjectRepository.findById(id)
            .orElseThrow(() -> new SubjectException("Subject not found", id)));
  }

  public List<SubjectDTO> getAllSubjects() {
    return subjectRepository.findAll().stream().map(this::toDTO).toList();
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