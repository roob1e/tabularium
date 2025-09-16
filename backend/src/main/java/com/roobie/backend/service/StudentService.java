package com.roobie.backend.service;

import com.roobie.backend.dto.CreateStudentRequest;
import com.roobie.backend.dto.UpdateStudentRequest;
import com.roobie.backend.entity.Group;
import com.roobie.backend.entity.Student;
import com.roobie.backend.exceptions.GroupNotFoundException;
import com.roobie.backend.repository.GroupRepository;
import com.roobie.backend.repository.StudentRepository;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class StudentService {
    private final StudentRepository studentRepository;
    private final GroupService groupService;
    private final GroupRepository groupRepository;

    public StudentService(StudentRepository studentRepository, GroupService groupService, GroupRepository groupRepository) {
        this.studentRepository = studentRepository;
        this.groupService = groupService;
        this.groupRepository = groupRepository;
    }

    public Student createStudent(CreateStudentRequest request) {
        Group group = groupRepository.findByName(request.getGroupName())
                .orElseThrow(() -> new GroupNotFoundException("Group not found: " + request.getGroupName()));

        Student student = Student.builder()
                .fullname(request.getFullname())
                .age(request.getAge())
                .phone(request.getPhone())
                .birthdate(request.getBirthdate())
                .group(group)
                .build();

        return studentRepository.save(student);
    }

    public boolean deleteStudent(Long id) {
        return studentRepository.findById(id)
                .map(student -> {
                    studentRepository.delete(student);
                    return true;
                })
                .orElse(false);
    }

    public List<Student> getStudents() {
        return studentRepository.findAll();
    }

    public Student getStudent(Long id) {
        return studentRepository.findById(id).orElse(null);
    }

    public Student updateStudent(Long id, UpdateStudentRequest dto) {
        Optional<Student> optionalStudent = studentRepository.findById(id);
        if (optionalStudent.isEmpty()) {
            throw new RuntimeException("Студент с id " + id + " не найден");
        }

        Student student = optionalStudent.get();

        // Обновляем поля
        student.setFullname(dto.getFullname());
        student.setAge(dto.getAge());
        student.setPhone(dto.getPhone());
        student.setBirthdate(dto.getBirthdate());

        // Обновляем группу (группа не меняет имя, только присваиваем объект)
        Group group = groupService.getGroup(dto.getGroupName());
        if (group == null) {
            throw new RuntimeException("Группа " + dto.getGroupName() + " не найдена");
        }
        student.setGroup(group);

        // Сохраняем в базе
        return studentRepository.save(student);
    }
}
