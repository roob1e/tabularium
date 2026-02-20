package com.assxmblxr.backend.exceptions;

public class GradeException extends RuntimeException {
  public GradeException() {}

  public GradeException(String message) {
    super(message);
  }

  public GradeException(String message, Throwable cause) {
    super(message, cause);
  }

  public GradeException(String message, Long id) {
    super(message + "; id: " + id);
  }
}