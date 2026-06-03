package com.assxmblxr.backend.repository;

import com.assxmblxr.backend.entity.Attendance;
import com.assxmblxr.backend.entity.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
  List<Attendance> findByStudentId(Long studentId);
  List<Attendance> findByStudentIdAndAttendanceDateBetween(Long studentId, LocalDate from, LocalDate to);
  List<Attendance> findBySubjectIdAndAttendanceDate(Long subjectId, LocalDate date);
  List<Attendance> findByStudentIdAndSubjectId(Long studentId, Long subjectId);

  /** Подсчёт пропусков по студенту и предмету */
  @Query("SELECT COUNT(a) FROM Attendance a WHERE a.student.id = :studentId AND a.subject.id = :subjectId AND a.status = :status")
  long countByStudentAndSubjectAndStatus(@Param("studentId") Long studentId,
                                         @Param("subjectId") Long subjectId,
                                         @Param("status") AttendanceStatus status);

  /** Все записи за конкретную дату для группы */
  @Query("SELECT a FROM Attendance a WHERE a.student.group.id = :groupId AND a.attendanceDate = :date")
  List<Attendance> findByGroupAndDate(@Param("groupId") Long groupId, @Param("date") LocalDate date);
}