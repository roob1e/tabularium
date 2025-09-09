package com.roobie.backend.repository;

import com.roobie.backend.entity.Teacher;
import com.roobie.backend.entity.TeacherSubjectId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TeacjerSubjectRepository extends JpaRepository<Teacher, TeacherSubjectId> {
}