package com.roobie.backend.service;

import com.roobie.backend.dto.CreateStudentRequest;
import com.roobie.backend.dto.UpdateStudentRequest;
import com.roobie.backend.entity.Group;
import com.roobie.backend.entity.Student;
import com.roobie.backend.exceptions.GroupNotFoundException;
import com.roobie.backend.exceptions.StudentNotFoundException;
import com.roobie.backend.repository.GroupRepository;
import com.roobie.backend.repository.StudentRepository;

import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * @author assxmblxr
 */
@Service
public class StudentService {
    private final StudentRepository studentRepository;
    private final GroupRepository groupRepository;

    public StudentService(StudentRepository studentRepository, GroupRepository groupRepository) {
        this.studentRepository = studentRepository;
        this.groupRepository = groupRepository;
    }

    /**
     * Создаёт запись в таблице students, используя DTO; обновляет параметр amount в соответствующей группе.
     * @param request данные для создания объекта студента: { String fullname, int age, String phone, LocalDate birthdate, Group group }.
     * @return Созданный объект студента.
     * @exception GroupNotFoundException указано название несуществующей группы в запросе.
     */
    @Transactional
    public Student createStudent(CreateStudentRequest request) {
        Group group = groupRepository.findById(request.getGroupId())
                .orElseThrow(() -> new GroupNotFoundException("Группа не найдена", request.getGroupId()));

        Student student = Student.builder()
                .fullname(request.getFullname())
                .age(request.getAge())
                .phone(request.getPhone())
                .birthdate(request.getBirthdate())
                .group(group)
                .build();

        studentRepository.save(student);
        updateGroupAmount(List.of(group));
        return student;
    }

    /**
     * Удаляет студента из БД по его ID.
     * @param id ID студента.
     * @return true, если студент найден и удалён, иначе false.
     */
    @Transactional
    public boolean deleteStudent(Long id) {
        return studentRepository.findById(id)
                .map(student -> {
                    Group group = student.getGroup();
                    studentRepository.delete(student);
                    updateGroupAmount(List.of(group));
                    return true;
                })
                .orElse(false);
    }

    /**
     * Возвращает список из всех студентов.
     * @return список всех студентов.
     */
    public List<Student> getStudents() {
        return studentRepository.findAll();
    }

    /**
     * Ищет студента в БД по его ID.
     * @param id ID искомого студента.
     * @return объект студента, если найден, иначе null.
     */
    public Student getStudent(Long id) {
        return studentRepository.findById(id).orElseThrow(() -> new StudentNotFoundException("Студент не найден", id));
    }

    /**
     * Обновляет параметры студента; обновляет значения amount в затронутых записях таблицы groups, если группа студента изменилась.
     * @param id ID студента, чьи параметры будут изменены.
     * @param dto новые значения параметров студента.
     * @return обновлённый объект студента
     * @exception StudentNotFoundException указан несуществующий ID
     */
    @Transactional
    public Student updateStudent(Long id, UpdateStudentRequest dto) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new StudentNotFoundException("Студент с id " + id + " не найден", id));

        Group oldGroup = student.getGroup();

        student.setFullname(dto.getFullname());
        student.setAge(dto.getAge());
        student.setPhone(dto.getPhone());
        student.setBirthdate(dto.getBirthdate());

        Group newGroup = groupRepository.findById(dto.getGroupId())
                .orElseThrow(() -> new GroupNotFoundException("Группа не найдена", dto.getGroupId()));
        student.setGroup(newGroup);

        if (!oldGroup.getId().equals(newGroup.getId())) {
            updateGroupAmount(List.of(oldGroup, newGroup));
        } else {
            updateGroupAmount(List.of(newGroup));
        }

        return student;
    }

    private void updateGroupAmount(List<Group> groups) {
        if (!groups.isEmpty()) {
            groupRepository.updateGroupAmount(groups);
        }
    }
}