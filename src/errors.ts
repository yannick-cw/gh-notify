
export type AppError = { kind: "ConfigError", message: string } |
{ kind: "AuthError", message: string } |
{ kind: "ApiError", message: string }

export const configError = (message: string): AppError => ({ kind: "ConfigError", message });
export const authError = (message: string): AppError => ({ kind: "AuthError", message });
export const apiError = (message: string): AppError => ({ kind: "ApiError", message });

export type Result<T> = { ok: true, value: T } | { ok: false, error: AppError }

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (error: AppError): Result<never> => ({ ok: false, error });