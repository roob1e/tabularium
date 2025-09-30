// SchedulerService.java
package com.roobie.backend.service;

import com.roobie.backend.components.AutoGradeUpdate;
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
    private String cronExpression = "0 0 0 30 7 *"; // дефолт: 30 июля

    public SchedulerService(ThreadPoolTaskScheduler scheduler, AutoGradeUpdate autoGradeUpdate) {
        this.scheduler = scheduler;
        scheduleTask(cronExpression);
        this.autoGradeUpdate = autoGradeUpdate;
    }

    public void setCronByDate(String dateString) {
        LocalDate date = parseDate(dateString);
        if (date == null) return;

        // Формируем новый CRON
        this.cronExpression = toCron(date);

        // Отменяем предыдущую задачу
        if (scheduledTask != null) {
            scheduledTask.cancel(false);
        }

        // Планируем новую задачу
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

            // убираем пробелы и кавычки
            dateString = dateString.trim().replace("\"", "");

            // добавляем текущий год
            String fullDate = dateString + "." + Year.now().getValue(); // "30.07.2025"

            // создаём форматтер
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy");

            // парсим и возвращаем LocalDate
            return LocalDate.parse(fullDate, formatter);

        } catch (Exception e) {
            System.out.println("Failed to parse date: '" + dateString + "'. Error: " + e.getMessage());
            return null;
        }
    }
}