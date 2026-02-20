package com.assxmblxr.backend.exceptions;

public class StudentException extends RuntimeException {
  public StudentException() {}

  public StudentException(String message) {
    super(message);
  }

  public StudentException(String message, Throwable cause) {
    super(message, cause);
  }

  public StudentException(String message, Long id) {
    super(message + "; id: " + id);
  }
}