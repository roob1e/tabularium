package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.service.SchedulerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/scheduler")
@RequiredArgsConstructor
public class SchedulerController {

  private final SchedulerService schedulerService;

  @PostMapping("/date")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<String> setDate(@RequestBody String dateString) {
    log.info("Setting scheduler date: {}", dateString);
    var date = schedulerService.parseDate(dateString);
    if (date == null) {
      return ResponseEntity.badRequest().body("Invalid date format. Expected: dd.MM");
    }
    schedulerService.setCronByDate(dateString);
    log.info("Scheduler cron updated to: {}", schedulerService.getCronExpression());
    return ResponseEntity.ok(schedulerService.getCronExpression());
  }

  @GetMapping("/cron")
  public ResponseEntity<String> getCron() {
    return ResponseEntity.ok(schedulerService.getCronExpression());
  }
}