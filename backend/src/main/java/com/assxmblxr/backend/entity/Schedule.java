package com.assxmblxr.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * Расписание занятий — требование ТЗ: «управление расписанием»
 */
@Entity
@Table(name = "schedule",
        uniqueConstraints = @UniqueConstraint(columnNames = {"group_id", "day_of_week", "lesson_number"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne
  @JoinColumn(name = "group_id", nullable = false)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Group group;

  @ManyToOne
  @JoinColumn(name = "subject_id", nullable = false)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Subject subject;

  @ManyToOne
  @JoinColumn(name = "teacher_id")
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Teacher teacher;

  @Enumerated(EnumType.STRING)
  @Column(name = "day_of_week", nullable = false)
  private DayOfWeek dayOfWeek;

  /** Номер урока/пары в течение дня (1-8) */
  @Column(name = "lesson_number", nullable = false)
  private int lessonNumber;

  /** Кабинет / аудитория */
  @Column(name = "classroom", length = 50)
  private String classroom;
}