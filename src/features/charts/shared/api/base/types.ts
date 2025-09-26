import type {Guid} from "@app/lib/types/Guid.ts";

export type RequestWithDb<T> = { body: T; dbId?: string | undefined };

export const withDb = <T>(body: T, dbId: Guid): RequestWithDb<T> => ({ body: body, dbId:dbId  });


