package com.assxmblxr.backend.exceptions;

public class TeacherNotFoundException extends RuntimeException {
    public TeacherNotFoundException() {}

    public TeacherNotFoundException(String message) {
        super(message);
    }

    public TeacherNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    public TeacherNotFoundException(String message, Long id) {
        super(message + "; id: " + id);
    }
}