package com.assxmblxr.backend.exceptions;

public class AttendanceException extends RuntimeException {
  public AttendanceException(String message) { super(message); }
  public AttendanceException(String message, Long id) { super(message + "; id: " + id); }
}