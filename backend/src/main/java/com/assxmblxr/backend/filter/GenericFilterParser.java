package com.assxmblxr.backend.filter;

import com.assxmblxr.backend.dto.FilterBlockDto;
import jakarta.persistence.criteria.*;
import java.time.LocalDate;
import java.util.*;

public class GenericFilterParser {

  private final CriteriaBuilder cb;
  private final CriteriaQuery<?> query;
  private final UniversalPathResolver resolver;

  public GenericFilterParser(CriteriaBuilder cb, CriteriaQuery<?> query, Root<?> root) {
    this.cb = cb;
    this.query = query;
    this.resolver = new UniversalPathResolver(root);
    query.distinct(true);
  }

  public Predicate parse(List<FilterBlockDto> blocks) {
    Deque<List<Predicate>> ctxStack   = new ArrayDeque<>();
    Deque<String>          logicStack = new ArrayDeque<>();
    List<Predicate>        current    = new ArrayList<>();
    String                 pending    = null;

    for (FilterBlockDto b : blocks) {
      switch (b.getType()) {
        case "IF" -> {
          Predicate p = buildPredicate(b);
          if (pending != null && !current.isEmpty()) {
            p = applyLogic(pending, flatten(current), p);
            current.clear();
          }
          pending = null;
          current.add(p);
        }
        case "AND" -> pending = "AND";
        case "OR"  -> pending = "OR";
        case "NOT" -> pending = "NOT";
        case "END" -> {
          Predicate combined = flatten(current);
          ctxStack.push(current);
          logicStack.push(pending != null ? pending : "AND");
          current = new ArrayList<>();
          current.add(combined);
          pending = null;
        }
      }
    }

    return flatten(current);
  }

  private Predicate applyLogic(String logic, Predicate left, Predicate right) {
    return switch (logic) {
      case "AND" -> cb.and(left, right);
      case "OR"  -> cb.or(left, right);
      case "NOT" -> cb.and(left, cb.not(right));
      default    -> cb.and(left, right);
    };
  }

  private Predicate flatten(List<Predicate> list) {
    if (list.isEmpty())  return cb.conjunction();
    if (list.size() == 1) return list.get(0);
    return cb.and(list.toArray(new Predicate[0]));
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private Predicate buildPredicate(FilterBlockDto b) {
    Path path = resolver.resolve(b.getField());
    String op  = b.getOperator();
    String val = b.getValue();

    return switch (op) {
      case "EQUAL"                 -> cb.equal(path, castValue(path, val));
      case "NOT_EQUAL"             -> cb.notEqual(path, castValue(path, val));
      case "GREATER_THAN"          -> cb.greaterThan(path, (Comparable) castValue(path, val));
      case "LESS_THAN"             -> cb.lessThan(path, (Comparable) castValue(path, val));
      case "GREATER_THAN_OR_EQUAL" -> cb.greaterThanOrEqualTo(path, (Comparable) castValue(path, val));
      case "LESS_THAN_OR_EQUAL"    -> cb.lessThanOrEqualTo(path, (Comparable) castValue(path, val));
      case "STRING_EQUAL"          -> cb.equal(cb.lower(path.as(String.class)), val.toLowerCase());
      case "CONTAINS"              -> cb.like(cb.lower(path.as(String.class)), "%" + val.toLowerCase() + "%");
      case "STARTS_WITH"           -> cb.like(cb.lower(path.as(String.class)), val.toLowerCase() + "%");
      case "ENDS_WITH"             -> cb.like(cb.lower(path.as(String.class)), "%" + val.toLowerCase());
      case "LENGTH_EQUAL"          -> cb.equal(cb.length(path.as(String.class)), Integer.parseInt(val));
      case "LENGTH_GREATER_THAN"   -> cb.greaterThan(cb.length(path.as(String.class)), Integer.parseInt(val));
      case "LENGTH_LESS_THAN"      -> cb.lessThan(cb.length(path.as(String.class)), Integer.parseInt(val));
      case "DATE_EQUAL"            -> cb.equal(path, LocalDate.parse(val));
      case "BEFORE"                -> cb.lessThan(path, (Comparable) LocalDate.parse(val));
      case "AFTER"                 -> cb.greaterThan(path, (Comparable) LocalDate.parse(val));
      case "IN_LIST"               -> path.in(b.getValues() != null ? b.getValues() : List.of(val));
      default -> throw new IllegalArgumentException("Unknown operator: " + op);
    };
  }

  private Object castValue(Path<?> path, String val) {
    Class<?> t = path.getJavaType();
    if (t == Integer.class   || t == int.class)  return Integer.parseInt(val);
    if (t == Long.class      || t == long.class) return Long.parseLong(val);
    if (t == LocalDate.class)                    return LocalDate.parse(val);
    return val;
  }
}