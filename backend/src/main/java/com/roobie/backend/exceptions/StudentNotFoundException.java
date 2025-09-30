package com.roobie.backend.exceptions;

public class StudentNotFoundException extends RuntimeException {
    public StudentNotFoundException(String message, Long id) {
        super(message + " " + id);
    }
}
