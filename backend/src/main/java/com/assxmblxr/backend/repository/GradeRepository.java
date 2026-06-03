package com.assxmblxr.backend.repository;

import com.assxmblxr.backend.entity.Grade;
import com.assxmblxr.backend.entity.WorkType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GradeRepository extends JpaRepository<Grade, Long> {
  List<Grade> findByStudentId(Long studentId);
  List<Grade> findByStudentIdAndSubjectId(Long studentId, Long subjectId);
  List<Grade> findByStudentIdAndWorkType(Long studentId, WorkType workType);
  List<Grade> findBySubjectId(Long subjectId);
  List<Grade> findByTeacherId(Long teacherId);

  /** Средний балл студента по предмету */
  @Query("SELECT AVG(g.grade) FROM Grade g WHERE g.student.id = :studentId AND g.subject.id = :subjectId")
  Double avgGradeByStudentAndSubject(@Param("studentId") Long studentId, @Param("subjectId") Long subjectId);

  /** Все оценки группы по предмету */
  @Query("SELECT g FROM Grade g WHERE g.student.group.id = :groupId AND g.subject.id = :subjectId")
  List<Grade> findByGroupAndSubject(@Param("groupId") Long groupId, @Param("subjectId") Long subjectId);
}