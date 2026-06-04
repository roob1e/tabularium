package com.assxmblxr.backend.repository;

import com.assxmblxr.backend.entity.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
  Page<Student> findAll(Pageable pageable);
  Page<Student> findByGroupId(Long groupId, Pageable pageable);
  List<Student> findByGroupId(Long groupId); // для аналитики
}