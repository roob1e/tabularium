package com.assxmblxr.backend.exceptions;

public class GradeNotFoundException extends RuntimeException {
    public GradeNotFoundException() {}

    public GradeNotFoundException(String message) {
        super(message);
    }

    public GradeNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    public GradeNotFoundException(String message, Long id) {
        super(message + "; id: " + id);
    }
}