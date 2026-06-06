package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.dto.*;
import com.assxmblxr.backend.filter.EntityRegistry;
import com.assxmblxr.backend.repository.GenericFilterRepository;
import com.assxmblxr.backend.service.ExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/filters")
@RequiredArgsConstructor
public class FilterController {

  private final GenericFilterRepository filterRepository;
  private final ExportService exportService;

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

  /** POST /api/v1/filters/export/excel — экспорт результатов фильтрации в Excel */
  @PostMapping("/export/excel")
  public ResponseEntity<byte[]> exportExcel(@RequestBody FilterExecuteRequest request) {
    try {
      Class<?> entityClass = EntityRegistry.resolve(request.getRootEntity());
      Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
      Page<Object> result = filterRepository.filter(entityClass, request.getBlocks(), pageable);

      List<Map<String, Object>> rows = result.getContent().stream()
              .map(FilterController::flatten).toList();

      byte[] data = exportService.exportFilterResultsToExcel(request.getRootEntity(), rows);
      return ResponseEntity.ok()
              .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"filter_results.xlsx\"")
              .contentType(MediaType.parseMediaType(
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
              .body(data);
    } catch (Exception e) {
      log.error("Filter Excel export error: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }

  /** POST /api/v1/filters/export/pdf — экспорт результатов фильтрации в PDF */
  @PostMapping("/export/pdf")
  public ResponseEntity<byte[]> exportPdf(@RequestBody FilterExecuteRequest request) {
    try {
      Class<?> entityClass = EntityRegistry.resolve(request.getRootEntity());
      Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE);
      Page<Object> result = filterRepository.filter(entityClass, request.getBlocks(), pageable);

      List<Map<String, Object>> rows = result.getContent().stream()
              .map(FilterController::flatten).toList();

      byte[] data = exportService.exportFilterResultsToPdf(request.getRootEntity(), rows);
      return ResponseEntity.ok()
              .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"filter_results.pdf\"")
              .contentType(MediaType.APPLICATION_PDF)
              .body(data);
    } catch (Exception e) {
      log.error("Filter PDF export error: {}", e.getMessage(), e);
      return ResponseEntity.internalServerError().build();
    }
  }

  // ── flatten helpers ───────────────────────────────────────────────────────

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
            map.put(field.getName() + "_count", col.size());
          } else {
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
          if (value != null && isScalar(value)) result.put(field.getName(), value);
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