package com.assxmblxr.backend.exceptions;

public class StudentNotFoundException extends RuntimeException {
    public StudentNotFoundException() {}

    public StudentNotFoundException(String message) {
        super(message);
    }

    public StudentNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    public StudentNotFoundException(String message, Long id) {
        super(message + "; id: " + id);
    }
}