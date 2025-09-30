package com.assxmblxr.backend.exceptions;

public class GradeNotFoundException extends RuntimeException {
    public GradeNotFoundException(String message, Long id) {
        super(message + "; id: " + id);
    }
}