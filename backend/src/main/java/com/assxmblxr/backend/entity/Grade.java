package com.assxmblxr.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "grades")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Grade {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @ManyToOne
  @JoinColumn(name = "student_id", nullable = false)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Student student;

  @ManyToOne
  @JoinColumn(name = "subject_id", nullable = false)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Subject subject;

  @ManyToOne
  @JoinColumn(name = "teacher_id")
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Teacher teacher;

  @Min(0)
  @Max(10)
  @Column(name = "grade")
  private int grade;
}