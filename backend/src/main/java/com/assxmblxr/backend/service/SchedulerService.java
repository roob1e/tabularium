package com.assxmblxr.backend.service;

import com.assxmblxr.backend.components.AutoGradeUpdate;
import lombok.Getter;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ScheduledFuture;

@Service
public class SchedulerService {

  private final ThreadPoolTaskScheduler scheduler;
  private final AutoGradeUpdate autoGradeUpdate;
  private ScheduledFuture<?> scheduledTask;
  @Getter
  private String cronExpression = "0 0 0 30 7 *"; // 30 июля

  public SchedulerService(ThreadPoolTaskScheduler scheduler, AutoGradeUpdate autoGradeUpdate) {
    this.scheduler = scheduler;
    scheduleTask(cronExpression);
    this.autoGradeUpdate = autoGradeUpdate;
  }

  public void setCronByDate(String dateString) {
    LocalDate date = parseDate(dateString);
    if (date == null) return;

    this.cronExpression = toCron(date);

    if (scheduledTask != null) {
      scheduledTask.cancel(false);
    }

    scheduleTask(cronExpression);
  }

  private void scheduleTask(String cron) {
    scheduledTask = scheduler.schedule(this::executeTask, new CronTrigger(cron));
  }

  private void executeTask() {
    System.out.println("Task executed at: " + java.time.LocalDateTime.now());
    autoGradeUpdate.updateAllStudents();
  }

  private String toCron(LocalDate date) {
    // CRON: секунда, минута, час, день, месяц, день недели (*)
    System.out.println("Cron expression: " + String.format("0 0 0 %d %d *", date.getDayOfMonth(), date.getMonthValue()));
    return String.format("0 0 0 %d %d *", date.getDayOfMonth(), date.getMonthValue());
  }

  public LocalDate parseDate(String dateString) {
    try {
      if (dateString == null) return null;
      dateString = dateString.trim().replace("\"", "");
      String fullDate = dateString + "." + Year.now().getValue(); // "30.07.2025"

      DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy");
      return LocalDate.parse(fullDate, formatter);
    } catch (Exception e) {
      System.out.println("Failed to parse date: '" + dateString + "'. Error: " + e.getMessage());
      return null;
    }
  }
}