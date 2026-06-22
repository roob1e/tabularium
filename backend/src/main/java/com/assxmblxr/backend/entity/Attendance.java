package com.assxmblxr.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDate;

@Entity
@Table(name = "attendance",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "subject_id", "attendance_date"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
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

  @Column(name = "attendance_date", nullable = false)
  private LocalDate attendanceDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private AttendanceStatus status;

  @Column(name = "note", length = 300)
  private String note;
}