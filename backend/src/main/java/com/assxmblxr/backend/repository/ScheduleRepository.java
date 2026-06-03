package com.assxmblxr.backend.repository;

import com.assxmblxr.backend.entity.DayOfWeek;
import com.assxmblxr.backend.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
  List<Schedule> findByGroupId(Long groupId);
  List<Schedule> findByGroupIdAndDayOfWeek(Long groupId, DayOfWeek dayOfWeek);
  List<Schedule> findByTeacherId(Long teacherId);
  List<Schedule> findByTeacherIdAndDayOfWeek(Long teacherId, DayOfWeek dayOfWeek);
}