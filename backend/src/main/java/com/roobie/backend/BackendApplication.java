package com.roobie.backend;

import com.roobie.backend.funcs.AutoGradeUpdate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendApplication implements CommandLineRunner {
    @Autowired
    AutoGradeUpdate autoGradeUpdate;

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Override
    public void run(String... args) {
        System.out.println("Проверка групп:");
        System.out.println(autoGradeUpdate.autoGradeWithCheck("П-41"));
    }
}