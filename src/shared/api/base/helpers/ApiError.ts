export type ApiError = {
    status?: number;   // именно optional
    data: unknown;     // обязателен, чтобы всегда было что показать
};
