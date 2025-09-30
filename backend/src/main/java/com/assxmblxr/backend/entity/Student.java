package com.assxmblxr.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.Period;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "fullname", nullable = false)
    private String fullname;

    @Column(name = "age", nullable = false)
    private Integer age;

    @Column(name = "phone", nullable = false)
    private String phone;

    @Column(name = "birthdate")
    private LocalDate birthdate;

    @ManyToOne
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    public void recalcAge() {
        if (birthdate != null) {
            this.age = Period.between(birthdate, LocalDate.now()).getYears();
        } else {
            this.age = 0; // или null, если nullable
        }
    }
}
