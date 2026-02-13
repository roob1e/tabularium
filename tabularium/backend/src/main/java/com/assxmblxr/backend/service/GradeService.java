package com.assxmblxr.backend.service;

import com.assxmblxr.backend.dto.GradeRequest;
import com.assxmblxr.backend.dto.GradeResponse;
import com.assxmblxr.backend.entity.Grade;
import com.assxmblxr.backend.entity.Student;
import com.assxmblxr.backend.entity.Subject;
import com.assxmblxr.backend.entity.Teacher;
import com.assxmblxr.backend.exceptions.GradeNotFoundException;
import com.assxmblxr.backend.exceptions.StudentNotFoundException;
import com.assxmblxr.backend.exceptions.SubjectNotFoundException;
import com.assxmblxr.backend.exceptions.TeacherNotFoundException;
import com.assxmblxr.backend.repository.GradeRepository;
import com.assxmblxr.backend.repository.StudentRepository;
import com.assxmblxr.backend.repository.SubjectRepository;
import com.assxmblxr.backend.repository.TeacherRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GradeService {
    private final GradeRepository gradeRepository;
    private final StudentRepository studentRepository;
    private final SubjectRepository subjectRepository;
    private final TeacherRepository teacherRepository;


    public GradeService(
            GradeRepository gradeRepository,
            StudentRepository studentRepository,
            SubjectRepository subjectRepository,
            TeacherRepository teacherRepository
    ) {
        this.gradeRepository = gradeRepository;
        this.studentRepository = studentRepository;
        this.subjectRepository = subjectRepository;
        this.teacherRepository = teacherRepository;
    }

    @Transactional
    public GradeResponse createGrade(GradeRequest request) {
        Grade grade = new Grade();
        grade.setStudent(getStudentById(request.getStudentId()));
        grade.setSubject(getSubjectById(request.getSubjectId()));
        grade.setTeacher(getTeacherById(request.getTeacherId()));
        grade.setGrade(request.getGrade());

        Grade saved = gradeRepository.save(grade);
        return toResponse(saved);
    }

    @Transactional
    public GradeResponse updateGrade(Long id, GradeRequest request) {
        Grade grade = gradeRepository.findById(id)
                .orElseThrow(() -> new GradeNotFoundException("Оценка не найдена", id));

        grade.setStudent(getStudentById(request.getStudentId()));
        grade.setSubject(getSubjectById(request.getSubjectId()));
        grade.setTeacher(request.getTeacherId() != null ? getTeacherById(request.getTeacherId()) : null);
        grade.setGrade(request.getGrade());

        Grade updated = gradeRepository.save(grade);
        return toResponse(updated);
    }

    @Transactional
    public boolean deleteGrade(Long id) {
        return gradeRepository.findById(id)
                .map(grade -> {
                    gradeRepository.delete(grade);
                    return true;
                })
                .orElse(false);
    }

    public List<GradeResponse> getAllGrades() {
        return gradeRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public GradeResponse getGrade(Long id) {
        return gradeRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new GradeNotFoundException("Оценка не найдена", id));
    }

    private GradeResponse toResponse(Grade grade) {
        GradeResponse response = new GradeResponse();
        response.setId(grade.getId());
        response.setStudentId(grade.getStudent().getId());
        response.setSubjectId(grade.getSubject().getId());
        response.setTeacherId(grade.getTeacher().getId());
        response.setGrade(grade.getGrade());
        return response;
    }

    private Teacher getTeacherById(Long id) {
        return teacherRepository.findById(id)
                .orElseThrow(() -> new TeacherNotFoundException("Учитель не найден", id));
    }

    private Subject getSubjectById(Long id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new SubjectNotFoundException("Предмет не найден", id));
    }

    private Student getStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new StudentNotFoundException("Студент не найден", id));
    }
}