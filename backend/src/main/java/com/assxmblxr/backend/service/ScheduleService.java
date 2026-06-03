package com.assxmblxr.backend.service;

import com.assxmblxr.backend.dto.ScheduleRequest;
import com.assxmblxr.backend.dto.ScheduleResponse;
import com.assxmblxr.backend.entity.*;
import com.assxmblxr.backend.exceptions.GroupException;
import com.assxmblxr.backend.exceptions.ScheduleException;
import com.assxmblxr.backend.exceptions.SubjectException;
import com.assxmblxr.backend.exceptions.TeacherException;
import com.assxmblxr.backend.repository.GroupRepository;
import com.assxmblxr.backend.repository.ScheduleRepository;
import com.assxmblxr.backend.repository.SubjectRepository;
import com.assxmblxr.backend.repository.TeacherRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleService {
  private final ScheduleRepository scheduleRepository;
  private final GroupRepository groupRepository;
  private final SubjectRepository subjectRepository;
  private final TeacherRepository teacherRepository;

  @Transactional
  public ScheduleResponse create(ScheduleRequest request) {
    Schedule s = Schedule.builder()
            .group(groupById(request.getGroupId()))
            .subject(subjectById(request.getSubjectId()))
            .teacher(request.getTeacherId() != null ? teacherById(request.getTeacherId()) : null)
            .dayOfWeek(request.getDayOfWeek())
            .lessonNumber(request.getLessonNumber())
            .classroom(request.getClassroom())
            .build();
    return toResponse(scheduleRepository.save(s));
  }

  @Transactional
  public ScheduleResponse update(Long id, ScheduleRequest request) {
    Schedule s = scheduleRepository.findById(id)
            .orElseThrow(() -> new ScheduleException("Запись расписания не найдена", id));
    s.setGroup(groupById(request.getGroupId()));
    s.setSubject(subjectById(request.getSubjectId()));
    s.setTeacher(request.getTeacherId() != null ? teacherById(request.getTeacherId()) : null);
    s.setDayOfWeek(request.getDayOfWeek());
    s.setLessonNumber(request.getLessonNumber());
    s.setClassroom(request.getClassroom());
    return toResponse(scheduleRepository.save(s));
  }

  @Transactional
  public boolean delete(Long id) {
    return scheduleRepository.findById(id)
            .map(s -> { scheduleRepository.delete(s); return true; }).orElse(false);
  }

  public ScheduleResponse getById(Long id) {
    return scheduleRepository.findById(id).map(this::toResponse)
            .orElseThrow(() -> new ScheduleException("Запись расписания не найдена", id));
  }

  public List<ScheduleResponse> getAll() {
    return scheduleRepository.findAll().stream().map(this::toResponse).toList();
  }

  public List<ScheduleResponse> getByGroup(Long groupId) {
    return scheduleRepository.findByGroupId(groupId).stream().map(this::toResponse).toList();
  }

  public List<ScheduleResponse> getByGroupAndDay(Long groupId, DayOfWeek dayOfWeek) {
    return scheduleRepository.findByGroupIdAndDayOfWeek(groupId, dayOfWeek).stream().map(this::toResponse).toList();
  }

  public List<ScheduleResponse> getByTeacher(Long teacherId) {
    return scheduleRepository.findByTeacherId(teacherId).stream().map(this::toResponse).toList();
  }

  private ScheduleResponse toResponse(Schedule s) {
    ScheduleResponse r = new ScheduleResponse();
    r.setId(s.getId());
    r.setGroupId(s.getGroup().getId());
    r.setGroupName(s.getGroup().getName());
    r.setSubjectId(s.getSubject().getId());
    r.setSubjectName(s.getSubject().getName());
    r.setTeacherId(s.getTeacher() != null ? s.getTeacher().getId() : null);
    r.setTeacherName(s.getTeacher() != null ? s.getTeacher().getFullname() : null);
    r.setDayOfWeek(s.getDayOfWeek());
    r.setLessonNumber(s.getLessonNumber());
    r.setClassroom(s.getClassroom());
    return r;
  }

  private Group groupById(Long id) {
    return groupRepository.findById(id).orElseThrow(() -> new GroupException("Группа не найдена", id));
  }
  private Subject subjectById(Long id) {
    return subjectRepository.findById(id).orElseThrow(() -> new SubjectException("Предмет не найден", id));
  }
  private Teacher teacherById(Long id) {
    return teacherRepository.findById(id).orElseThrow(() -> new TeacherException("Учитель не найден", id));
  }
}