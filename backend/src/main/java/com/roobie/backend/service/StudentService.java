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

/**
 * @author assxmblxr
 */
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

    /**
     * Создаёт запись в таблице students, используя DTO; обновляет параметр amount в соответствующей группе.
     * @param request данные для создания объекта студента: { String fullname, int age, String phone, LocalDate birthdate, Group group }.
     * @return Созданный объект студента.
     * @exception GroupNotFoundException указано название несуществующей группы в запросе.
     */
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

        Student saved = studentRepository.save(student);
        updateGroupAmount(group);
        return saved;
    }

    /**
     * Удаляет студента из БД по его ID.
     * @param id ID студента.
     * @return true, если студент найден и удалён, иначе false.
     */
    public boolean deleteStudent(Long id) {
        return studentRepository.findById(id)
                .map(student -> {
                    Group group = student.getGroup();
                    studentRepository.delete(student);
                    updateGroupAmount(group);
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
        return studentRepository.findById(id).orElse(null);
    }

    /**
     * Обновляет параметры студента; обновляет значения amount в затронутых записях таблицы groups, если группа студента изменилась.
     * @param id ID студента, чьи параметры будут изменены.
     * @param dto новые значения параметров студента.
     * @return обновлённый объект студента
     * @exception RuntimeException указан несуществующий ID
     */
    public Student updateStudent(Long id, UpdateStudentRequest dto) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Студент с id " + id + " не найден"));

        Group oldGroup = student.getGroup();

        // Обновляем поля
        student.setFullname(dto.getFullname());
        student.setAge(dto.getAge());
        student.setPhone(dto.getPhone());
        student.setBirthdate(dto.getBirthdate());

        // Обновляем группу (группа не меняет имя, только присваиваем объект)
        Group newGroup = groupService.getGroup(dto.getGroupName());
        if (newGroup == null) {
            throw new RuntimeException("Группа " + dto.getGroupName() + " не найдена");
        }
        student.setGroup(newGroup);

        // Сохраняем в базе
        Student updated = studentRepository.save(student);

        if(!oldGroup.equals(newGroup)) {
            updateGroupAmount(oldGroup);
        }
        updateGroupAmount(newGroup);
        return updated;
    }

    private void updateGroupAmount(Group group) {
        long count = studentRepository.countByGroup(group);
        group.setAmount((int) count);
        groupRepository.save(group);
    }
}
