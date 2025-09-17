
import type {Guid} from "@app/lib/types/Guid.ts";

export type GetRawRequest = {
    templateId: Guid

    from: string;
    to: string;
    maxPoints?: number | undefined; // ограничитель на всякий случай, чтобы не сломать сервер

    values?: Record<string, unknown> | undefined;
}