package com.roobie.backend.components;

import com.roobie.backend.dto.UpdateStudentRequest;
import com.roobie.backend.entity.Group;
import com.roobie.backend.entity.Student;
import com.roobie.backend.service.GroupService;
import com.roobie.backend.service.StudentService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class AutoGradeUpdate {

    private static final Logger log = LoggerFactory.getLogger(AutoGradeUpdate.class);

    private final GroupService groupService;
    private final StudentService studentService;

    public AutoGradeUpdate(GroupService groupService, StudentService studentService) {
        this.groupService = groupService;
        this.studentService = studentService;
    }

    /**
     * Инкрементирует первую числовую часть строки.
     * Пример: "11 Б" -> "12 Б"
     */
    public String autoGrade(String grade) {
        Pattern pattern = Pattern.compile("(\\d+)");
        Matcher matcher = pattern.matcher(grade);

        if (matcher.find()) {
            int number = Integer.parseInt(matcher.group());

            int updated;
            if (grade.matches(".*\\p{L}-?\\d+.*")) {
                // Вузовские группы вида "П-41", "ИВТ-32"
                updated = number + 10;
            } else {
                // Школьные классы вида "10А", "9Б"
                updated = number + 1;
            }

            return matcher.replaceFirst(String.valueOf(updated));
        }

        return grade; // Если цифр нет, возвращаем исходное значение
    }

    /**
     * Обновляет всех студентов в базе.
     * Для каждого студента проверяет инкрементированное название группы
     * и, если такая группа существует, обновляет его через StudentService.
     */
    @Transactional
    public void updateAllStudents() {
        List<Student> students = studentService.getStudents();

        for (Student student : students) {
            String newGradeName = autoGrade(student.getGroup().getName());

            Group newGroup = groupService.getGroupByName(newGradeName);
            if (newGroup != null && !student.getGroup().getId().equals(newGroup.getId())) {
                // Обновляем студента через сервис, чтобы пересчитать amount
                UpdateStudentRequest dto = new UpdateStudentRequest();
                dto.setFullname(student.getFullname());
                dto.setAge(student.getAge());
                dto.setPhone(student.getPhone());
                dto.setBirthdate(student.getBirthdate());
                dto.setGroupId(newGroup.getId());

                studentService.updateStudent(student.getId(), dto);

                log.info("Студент '{}' перемещён в группу '{}'", student.getFullname(), newGradeName);
            } else {
                log.info("Студен '{}' - выпускник, группы '{}' не существует", student.getFullname(), newGradeName);
            }
        }
    }
}
