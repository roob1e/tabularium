package com.assxmblxr.backend.exceptions;

public class GroupException extends RuntimeException {
  public GroupException() {}

  public GroupException(String message) {
    super(message);
  }

  public GroupException(String message, Throwable cause) {
    super(message, cause);
  }

  public GroupException(String message, Long id) {
    super(message + "; id: " + id);
  }
}