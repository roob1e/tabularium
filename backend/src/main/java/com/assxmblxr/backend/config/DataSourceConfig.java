package com.assxmblxr.backend.config;

import com.zaxxer.hikari.HikariDataSource;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Slf4j
@Configuration
public class DataSourceConfig {

  @Bean
  @Primary
  public DataSource dataSource(
          @Value("${spring.datasource.url}") String url,
          @Value("${spring.datasource.username}") String username,
          @Value("${spring.datasource.password}") String password
  ) {
    HikariDataSource dataSource = new HikariDataSource();
    dataSource.setJdbcUrl(url);
    dataSource.setUsername(username);
    dataSource.setPassword(password);
    dataSource.setDriverClassName("org.postgresql.Driver"); // драйвер фиксируем

    log.info("application.yml is configured");
    return dataSource;
  }
}
