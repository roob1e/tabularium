package com.assxmblxr.backend.exceptions;

public class SubjectNotFoundException extends RuntimeException {
    public SubjectNotFoundException(String message, Long id) {
        super(message + "; id: " + id);
    }
}