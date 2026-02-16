package com.assxmblxr.backend;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {
    public static void main(String[] args) {
        new SpringApplicationBuilder(BackendApplication.class)
                .properties("spring.config.additional-location=./application.yml")
                .run(args);
        System.out.println("Application started, application.yml is connected");
    }
}