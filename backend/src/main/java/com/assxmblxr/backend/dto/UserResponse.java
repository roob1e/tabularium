package com.assxmblxr.backend.dto;

import com.assxmblxr.backend.entity.Role;

public record UserResponse(
        Long id,
        String username,
        String fullname,
        Role role,
        boolean approved
) { }