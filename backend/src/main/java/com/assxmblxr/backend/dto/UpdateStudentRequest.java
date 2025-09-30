package com.assxmblxr.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateStudentRequest {
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name should be from 2 to 100 symbols")
    private String fullname;

    @NotBlank(message = "Phone is required")
    @Pattern(
            regexp = "^\\+375(25|29|33|44|17|23)\\d{7}$",
            message = "Phone format should be +375(25|29|33|44|17|23)XXXXXXX"
    )
    private String phone;


    @NotNull(message = "Birthdate is required")
    @JsonFormat(pattern = "dd.MM.yyyy")
    private LocalDate birthdate;

    @NotNull(message = "Group is required")
    private Long groupId;
}