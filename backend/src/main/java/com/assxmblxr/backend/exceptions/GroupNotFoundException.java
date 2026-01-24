package com.assxmblxr.backend.exceptions;

public class GroupNotFoundException extends RuntimeException {
    public GroupNotFoundException() {}

    public GroupNotFoundException(String message) {
        super(message);
    }

    public GroupNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    public GroupNotFoundException(String message, Long id) {
        super(message + "; id: " + id);
    }
}