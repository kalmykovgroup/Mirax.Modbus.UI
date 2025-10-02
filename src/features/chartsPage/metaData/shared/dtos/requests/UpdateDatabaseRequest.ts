import type {Guid} from "@app/lib/types/Guid.ts";
import type {DbProviderType} from "@chartsPage/metaData/shared/dtos/types/DbProviderType.ts";
import type {DatabaseStatus} from "@chartsPage/metaData/shared/dtos/types/DatabaseStatus.ts";

export type UpdateDatabaseRequest = {
    id: Guid;
    name: string;
    databaseVersion: string;
    connectionString: string;
    provider: DbProviderType;
    databaseStatus: DatabaseStatus;
};