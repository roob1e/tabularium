package com.assxmblxr.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
public class TaskSchedulerConfig {
  @Bean
  public ThreadPoolTaskScheduler threadPoolTaskScheduler() {
    ThreadPoolTaskScheduler ts = new ThreadPoolTaskScheduler();
    ts.setPoolSize(2);
    ts.setThreadNamePrefix("dynamic-scheduler-");
    ts.initialize();
    return ts;
  }
}