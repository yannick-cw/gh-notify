
export type AppError = { kind: "ConfigError", message: string } |
{ kind: "AuthError", message: string } |
{ kind: "ApiError", message: string }

export type Result<T> = { ok: true, value: T } | { ok: false, error: AppError }