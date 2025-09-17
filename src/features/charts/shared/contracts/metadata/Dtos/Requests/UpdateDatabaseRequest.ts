import type {Guid} from "@app/lib/types/Guid.ts";
import {DbProviderType} from "@charts/shared/contracts/metadata/Types/DbProviderType.ts";
import {DatabaseStatus} from "@charts/shared/contracts/metadata/Types/DatabaseStatus.ts";

export type UpdateDatabaseRequest = {
    id: Guid;
    name: string;
    databaseVersion: string;
    connectionString: string;
    provider: DbProviderType;
    databaseStatus: DatabaseStatus;
};