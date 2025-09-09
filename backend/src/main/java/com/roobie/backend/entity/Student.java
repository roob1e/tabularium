package com.roobie.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {
    @Id
    @Column(name = "id")
    private Integer id;

    @Column(name = "fullname", nullable = false)
    private String fullname;

    @Column(name = "age", nullable = false)
    private Integer age;

    @Column(name = "phone", nullable = false)
    private String phone;

    @Column(name = "birthdate")
    private String birthdate;

    @ManyToOne
    @JoinColumn(name = "group_name", nullable = false)
    private Group group;
}