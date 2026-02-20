package com.assxmblxr.backend.dto;

public record AuthResponse(
        String username,
        String fullname,
        String accessToken,
        String refreshToken
) { }
