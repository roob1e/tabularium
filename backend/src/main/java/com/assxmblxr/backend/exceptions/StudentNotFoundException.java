package com.assxmblxr.backend.exceptions;

public class StudentNotFoundException extends RuntimeException {
    public StudentNotFoundException(String message, Long id) {
        super(message + "; id: " + id);
    }
}