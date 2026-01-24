package com.assxmblxr.backend.controller;

import com.assxmblxr.backend.service.SchedulerService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Slf4j
@RestController
@RequestMapping("/scheduler")
public class SchedulerController {

  private final SchedulerService schedulerService;

  public SchedulerController(SchedulerService schedulerService) {
    this.schedulerService = schedulerService;
  }

  @PostMapping("/date")
  public ResponseEntity<String> setDate(
          @RequestBody String dateString
  ) {
    LocalDate date = schedulerService.parseDate(dateString);
    System.out.println(date);
    if (date == null) {
      log.info("Date is null");
      return ResponseEntity.badRequest().body("Invalid date format. Allowed: dd.MM");
    }

    schedulerService.setCronByDate(dateString);
    log.info("Date set");
    return ResponseEntity.ok("Cron updated to: " + schedulerService.getCronExpression());
  }

  @GetMapping("/cron")
  public ResponseEntity<String> getCron() {
    log.info("Getting cron");
    return ResponseEntity.ok(schedulerService.getCronExpression());
  }
}