package com.roobie.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateStudentRequest {
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name should be from 2 to 100 symbols")
    private String fullname;

    @NotNull(message = "Age is required")
    @Min(value = 5, message = "Age can't be less than 5")
    private Integer age;

    @NotBlank(message = "Phone is required")
    @Pattern(
            regexp = "^\\+375(25|29|33|44|17|23)\\d{7}$",
            message = "Phone format should be +375(25|29|33|44|17|23)XXXXXXX"
    )
    private String phone;


    @NotBlank(message = "Birthdate is required")
    @JsonFormat(pattern = "dd.MM.yyyy")
    private LocalDate birthdate;

    @NotBlank(message = "Group is required")
    private Long groupId;
}