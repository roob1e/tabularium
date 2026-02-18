package com.assxmblxr.backend.exceptions;

public class SubjectNotFoundException extends RuntimeException {
  public SubjectNotFoundException() {}

  public SubjectNotFoundException(String message) {
    super(message);
  }

  public SubjectNotFoundException(String message, Throwable cause) {
    super(message, cause);
  }

  public SubjectNotFoundException(String message, Long id) {
    super(message + "; id: " + id);
  }
}