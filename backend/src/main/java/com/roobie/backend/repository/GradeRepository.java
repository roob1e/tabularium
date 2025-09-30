package com.roobie.backend.repository;

import com.roobie.backend.entity.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GradeRepository  extends JpaRepository<Grade, Long> {
}
