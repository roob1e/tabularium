package com.roobie.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "teacher_subject")
@IdClass(TeacherSubjectId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherSubject {
    @Id
    @ManyToOne
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @Id
    @ManyToOne
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;
}