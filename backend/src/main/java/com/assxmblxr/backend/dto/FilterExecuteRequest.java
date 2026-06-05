package com.assxmblxr.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class FilterExecuteRequest {
  private String rootEntity;
  private List<FilterBlockDto> blocks;
  private int page;
  private int size;
}