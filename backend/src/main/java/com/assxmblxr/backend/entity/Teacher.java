package com.assxmblxr.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "teachers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Teacher {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank
  private String fullname;

  @NotBlank
  private String phone;

  @ManyToMany
  @JoinTable(
          name = "teacher_subjects",
          joinColumns = @JoinColumn(name = "teacher_id"),
          inverseJoinColumns = @JoinColumn(name = "subject_id")
  )
  @ToString.Exclude
  @EqualsAndHashCode.Exclude
  private Set<Subject> subjects;
}