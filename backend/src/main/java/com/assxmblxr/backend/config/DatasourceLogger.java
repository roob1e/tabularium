package com.assxmblxr.backend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DatasourceLogger {

  @Value("${spring.datasource.url}")
  private String datasourceUrl;

  @Value("${spring.datasource.username}")
  private String datasourceUsername;

  @Value("${spring.datasource.password}")
  private String datasourcePassword;

  @PostConstruct
  public void logDatasourceUrl() {
    System.out.println("======================================");
    System.out.println("   USING DATASOURCE URL: " + datasourceUrl);
    System.out.println("   USING USERNAME: " + datasourceUsername);
    System.out.println("   USING PASSWORD: " + datasourcePassword);
    System.out.println("======================================");
  }
}
