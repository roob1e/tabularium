package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.*;
import com.assxmblxr.backend.filter.EntityRegistry;
import com.assxmblxr.backend.repository.GenericFilterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/v1/filters")
@RequiredArgsConstructor
public class FilterController {

  private final GenericFilterRepository filterRepository;

  @PostMapping("/execute")
  public ResponseEntity<PageResponse<Map<String, Object>>> execute(
          @RequestBody FilterExecuteRequest request
  ) {
    Class<?> entityClass = EntityRegistry.resolve(request.getRootEntity());
    int size = request.getSize() > 0 ? request.getSize() : 50;
    Pageable pageable = PageRequest.of(request.getPage(), size);

    Page<Object> result = filterRepository.filter(entityClass, request.getBlocks(), pageable);

    List<Map<String, Object>> content = result.getContent().stream()
            .map(FilterController::flatten)
            .toList();

    return ResponseEntity.ok(new PageResponse<>(
            content,
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.getTotalPages(),
            result.isLast()
    ));
  }

  /** Рекурсивно разворачивает JPA-сущность в плоский Map без циклических ссылок */
  private static Map<String, Object> flatten(Object entity) {
    return flatten(entity, new HashSet<>());
  }

  private static Map<String, Object> flatten(Object obj, Set<Integer> visited) {
    if (obj == null) return Map.of();
    int identity = System.identityHashCode(obj);
    if (visited.contains(identity)) return Map.of();
    visited.add(identity);

    Map<String, Object> map = new LinkedHashMap<>();
    Class<?> cls = obj.getClass();

    while (cls != null && cls != Object.class) {
      for (Field field : cls.getDeclaredFields()) {
        if (field.getName().startsWith("$$") || field.getName().equals("serialVersionUID")) continue;
        field.setAccessible(true);
        try {
          Object value = field.get(obj);
          if (value == null) {
            map.put(field.getName(), null);
          } else if (isScalar(value)) {
            map.put(field.getName(), value);
          } else if (value instanceof Collection<?> col) {
            // Коллекции не разворачиваем — только count
            map.put(field.getName() + "_count", col.size());
          } else {
            // Вложенный объект — берём только его id и displayName
            Map<String, Object> nested = flattenNested(value, visited);
            nested.forEach((k, v) -> map.put(field.getName() + "_" + k, v));
          }
        } catch (Exception ignored) {}
      }
      cls = cls.getSuperclass();
    }
    return map;
  }

  private static Map<String, Object> flattenNested(Object obj, Set<Integer> visited) {
    Map<String, Object> result = new LinkedHashMap<>();
    int identity = System.identityHashCode(obj);
    if (visited.contains(identity)) return result;
    visited.add(identity);

    Class<?> cls = obj.getClass();
    while (cls != null && cls != Object.class) {
      for (Field field : cls.getDeclaredFields()) {
        if (field.getName().startsWith("$$") || field.getName().equals("serialVersionUID")) continue;
        field.setAccessible(true);
        try {
          Object value = field.get(obj);
          if (value != null && isScalar(value)) {
            result.put(field.getName(), value);
          }
        } catch (Exception ignored) {}
      }
      cls = cls.getSuperclass();
    }
    return result;
  }

  private static boolean isScalar(Object v) {
    return v instanceof Number || v instanceof String
            || v instanceof Boolean || v instanceof LocalDate
            || v instanceof Enum<?>;
  }
}