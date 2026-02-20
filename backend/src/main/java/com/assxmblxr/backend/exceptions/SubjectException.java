package com.assxmblxr.backend.exceptions;

public class SubjectException extends RuntimeException {
  public SubjectException() {}

  public SubjectException(String message) {
    super(message);
  }

  public SubjectException(String message, Throwable cause) {
    super(message, cause);
  }

  public SubjectException(String message, Long id) {
    super(message + "; id: " + id);
  }
}