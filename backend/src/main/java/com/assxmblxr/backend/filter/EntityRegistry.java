package com.assxmblxr.backend.filter;

import com.assxmblxr.backend.entity.*;
import java.util.Map;

public final class EntityRegistry {

  private EntityRegistry() {}

  private static final Map<String, Class<?>> ENTITY_MAP = Map.of(
          "Student",    Student.class,
          "Group",      Group.class,
          "Grade",      Grade.class,
          "Attendance", Attendance.class,
          "Schedule",   Schedule.class,
          "Subject",    Subject.class,
          "Teacher",    Teacher.class
  );

  public static Class<?> resolve(String name) {
    Class<?> cls = ENTITY_MAP.get(name);
    if (cls == null) throw new IllegalArgumentException("Unknown entity: " + name);
    return cls;
  }

  public static Map<String, Class<?>> all() {
    return ENTITY_MAP;
  }
}