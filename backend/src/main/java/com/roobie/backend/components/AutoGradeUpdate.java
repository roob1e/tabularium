package com.roobie.backend.components;

import com.roobie.backend.entity.Group;
import com.roobie.backend.entity.Student;
import com.roobie.backend.service.GroupService;
import com.roobie.backend.service.StudentService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

        // Если цифр нет, возвращаем исходную строку
        return grade;
    }

    /**
     * Проверяет существование группы в БД после инкремента.
     * Возвращает новое название группы, если она есть в БД, иначе null.
     */
    public String autoGradeWithCheck(String grade) {
        String result = autoGrade(grade);
        boolean exists = groupService.getGroup(result) != null;
        log.info("Group '{}' {}", result, exists ? "FOUND" : "NOT FOUND");
        return exists ? result : null;
    }

    /**
     * Обновляет всех студентов в базе.
     * Для каждого студента проверяет инкрементированное название группы
     * и, если такая группа существует, обновляет его.
     *
     * @return Map<Student, Group> соответствие старый студент -> новая группа
     */
    @Transactional
    @Scheduled(cron = "0 0 0 30 7 *")
    // TODO: сделать настройку даты обновления через интерфейс
    public Map<Student, Group> updateAllStudents() {
        Map<Student, Group> map = new HashMap<>();
        List<Student> students = studentService.getStudents();

        for (Student student : students) {
            String newGradeName = autoGradeWithCheck(student.getGroup().getName());
            if (newGradeName != null) {
                Group newGroup = groupService.getGroup(newGradeName);
                student.setGroup(newGroup);
                map.put(student, newGroup);
                log.info("Студент '{}' перемещён в группу '{}'", student.getFullname(), newGradeName);
            }
        }

        return map;
    }
}
