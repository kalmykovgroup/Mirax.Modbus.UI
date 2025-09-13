import type {Guid} from "@app/lib/types/Guid.ts";

export type CreateDatabaseRequest = {
    id?: Guid | undefined;
    name: string;
    databaseVersion: string;
    connectionString: string;
};