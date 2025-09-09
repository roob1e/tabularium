package com.roobie.backend.repository;

import com.roobie.backend.entity.FinalGrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FinalGradeRepository extends JpaRepository<FinalGrade, Integer> {
}