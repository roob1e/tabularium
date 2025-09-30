// SchedulerController.java
package com.roobie.backend.controller;

import com.roobie.backend.service.SchedulerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/scheduler")
public class SchedulerController {

    private final SchedulerService schedulerService;

    public SchedulerController(SchedulerService schedulerService) {
        this.schedulerService = schedulerService;
    }

    @PostMapping("/date")
    public ResponseEntity<String> setDate(@RequestBody String dateString) {
        LocalDate date = schedulerService.parseDate(dateString);
        System.out.println(date);
        if (date == null) {
            return ResponseEntity.badRequest().body("Invalid date format. Allowed: dd.MM");
        }

        schedulerService.setCronByDate(dateString);
        return ResponseEntity.ok("Cron updated to: " + schedulerService.getCronExpression());
    }

    @GetMapping("/cron")
    public ResponseEntity<String> getCron() {
        return ResponseEntity.ok(schedulerService.getCronExpression());
    }
}
