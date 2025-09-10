package com.roobie.backend.service;

import com.roobie.backend.dto.CreateStudentRequest;
import com.roobie.backend.entity.Group;
import com.roobie.backend.entity.Student;
import com.roobie.backend.repository.GroupRepository;
import com.roobie.backend.repository.StudentRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentService {
    @Autowired private StudentRepository studentRepository;
    @Autowired GroupRepository groupRepository;

    public Student createStudent(CreateStudentRequest request) {
        Group group = groupRepository.findByName(request.getGroupName())
                .orElseThrow(() -> new RuntimeException("Group not found: " + request.getGroupName()));

        Student student = Student.builder()
                .fullname(request.getFullname())
                .age(request.getAge())
                .phone(request.getPhone())
                .birthdate(request.getBirthdate())
                .group(group)
                .build();

        return studentRepository.save(student);
    }

    public void deleteStudent(Student student) {
        System.out.println(student.toString());
        studentRepository.delete(student);
    }

    public List<Student> getStudents() {
        System.out.println(studentRepository.findAll());
        return studentRepository.findAll();
    }

    public Student GetStudent(int id) {
        return studentRepository.findById(id).get();
    }
}
