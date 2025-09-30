package com.roobie.backend.repository;

import com.roobie.backend.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {
    Optional<Group> findById(Long id);
    Optional<Group> findByName(String name);

    @Modifying
    @Query("""
        UPDATE Group g
        SET g.amount = (SELECT COUNT(s) FROM Student s WHERE s.group = g)
        WHERE g IN :groups
    """)
    void updateGroupAmount(@Param("groups") List<Group> groups);
}