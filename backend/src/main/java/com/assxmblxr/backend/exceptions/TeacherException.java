package com.assxmblxr.backend.exceptions;

public class TeacherException extends RuntimeException {
  public TeacherException() {}

  public TeacherException(String message) {
    super(message);
  }

  public TeacherException(String message, Throwable cause) {
    super(message, cause);
  }

  public TeacherException(String message, Long id) {
    super(message + "; id: " + id);
  }
}