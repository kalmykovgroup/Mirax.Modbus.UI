import type {Guid} from "@app/lib/types/Guid.ts";

export type UpdateDatabaseRequest = {
    id: Guid;
    name: string;
    databaseVersion: string;
    connectionString: string;
};