package com.roobie.backend.repository;

import com.roobie.backend.entity.Group;
import com.roobie.backend.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    long countByGroup(Group group);
}