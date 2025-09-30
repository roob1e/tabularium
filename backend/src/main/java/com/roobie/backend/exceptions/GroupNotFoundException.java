package com.roobie.backend.exceptions;

public class GroupNotFoundException extends RuntimeException {
    public GroupNotFoundException(String message, Long id) {
        super(message + "; id: " + id);
    }
}
