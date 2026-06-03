package com.assxmblxr.backend;

import static org.mockito.Mockito.*;

import com.assxmblxr.backend.components.AutoGradeUpdate;
import com.assxmblxr.backend.entity.Group;
import com.assxmblxr.backend.entity.Student;
import com.assxmblxr.backend.service.GroupService;
import com.assxmblxr.backend.service.StudentService;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;

public class AutoGradeUpdateTest {

    @Mock
    private StudentService studentService;

    @Mock
    private GroupService groupService;

    @InjectMocks
    private AutoGradeUpdate autoGradeUpdate;

    public AutoGradeUpdateTest() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testUpdateAllStudents() {
        Group group10A = new Group();
        group10A.setId(1L);
        group10A.setName("10А");

        Group group11A = new Group();
        group11A.setId(2L);
        group11A.setName("11А");

        Student student = new Student();
        student.setId(100L);
        student.setFullname("Иванов И.И.");
        student.setGroup(group10A);

        List<Student> students = List.of(student);

        when(studentService.getStudents()).thenReturn(students);
        when(groupService.getGroupByName("11А")).thenReturn(group11A);

        autoGradeUpdate.updateAllStudents();

        verify(studentService, times(1)).updateStudent(eq(100L), argThat(dto -> dto.getGroupId().equals(2L)));
    }

    @Test
    public void testStudentInNonexistentGroup_printResult() {
        Group group11A = new Group();
        group11A.setId(1L);
        group11A.setName("11А");

        Student student = new Student();
        student.setId(100L);
        student.setFullname("Иванов И.И.");
        student.setGroup(group11A);

        when(studentService.getStudents()).thenReturn(List.of(student));
        when(groupService.getGroupByName("12А")).thenReturn(null); // группы нет

        autoGradeUpdate.updateAllStudents();

        System.out.println("Студент: " + student.getFullname() +
                ", группа: " + student.getGroup().getName());
    }
}