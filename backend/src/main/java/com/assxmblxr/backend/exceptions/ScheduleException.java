package com.assxmblxr.backend.exceptions;

public class ScheduleException extends RuntimeException {
  public ScheduleException(String message) { super(message); }
  public ScheduleException(String message, Long id) { super(message + "; id: " + id); }
}