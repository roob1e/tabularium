package com.roobie.backend.exceptions;

public class TeacherNotFoundException extends RuntimeException {
    public TeacherNotFoundException(String message, Long id) {
        super(message + "; id: " + id);
    }
}
