package com.roobie.backend.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/")
public class RootController {
    @GetMapping
    public ResponseEntity<String> root() {
        log.info("Someone triggered the root controller :)");
        return ResponseEntity.ok("Server is up");
    }
}
