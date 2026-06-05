package com.assxmblxr.backend.filter;

import jakarta.persistence.criteria.*;
import java.util.*;

public class UniversalPathResolver {

  private final Root<?> root;
  private final Map<String, Join<?, ?>> joinCache = new LinkedHashMap<>();

  public UniversalPathResolver(Root<?> root) {
    this.root = root;
  }

  @SuppressWarnings({"rawtypes"})
  public Path<?> resolve(String fieldPath) {
    String[] segments = fieldPath.split("\\.");

    if (segments.length == 1) {
      return root.get(segments[0]);
    }

    String joinKey = "";
    for (int i = 0; i < segments.length - 1; i++) {
      String segment = segments[i];
      String parentKey = joinKey;
      joinKey = joinKey.isEmpty() ? segment : joinKey + "." + segment;
      String currentKey = joinKey;

      joinCache.computeIfAbsent(currentKey, k -> {
        if (parentKey.isEmpty()) {
          return root.join(segment, JoinType.LEFT);
        }
        Join<?, ?> parentJoin = joinCache.get(parentKey);
        return ((Join) parentJoin).join(segment, JoinType.LEFT);
      });
    }

    return joinCache.get(joinKey).get(segments[segments.length - 1]);
  }
}