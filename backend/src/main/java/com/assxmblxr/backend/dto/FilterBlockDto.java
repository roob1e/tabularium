package com.assxmblxr.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class FilterBlockDto {
  private String type;
  private String field;
  private String operator;
  private String value;
  private List<String> values;
}