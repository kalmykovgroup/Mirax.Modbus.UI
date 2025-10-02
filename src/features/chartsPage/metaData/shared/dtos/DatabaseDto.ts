import type {Guid} from "@app/lib/types/Guid.ts";
import type {DbProviderType} from "@chartsPage/metaData/shared/dtos/types/DbProviderType.ts";
import type {DatabaseStatus} from "@chartsPage/metaData/shared/dtos/types/DatabaseStatus.ts";
import type {DatabaseAvailability} from "@chartsPage/metaData/shared/dtos/types/DatabaseAvailability.ts";
import type {EntityDto} from "@chartsPage/metaData/shared/dtos/EntityDto.ts";
import type {ChartReqTemplateDto} from "@chartsPage/template/shared//dtos/ChartReqTemplateDto.ts";

export type DatabaseDto = {
    id: Guid;
    name: string;
    databaseVersion: string;
    connectionString: string;
    provider: DbProviderType;
    databaseStatus: DatabaseStatus;
    availability: DatabaseAvailability;
    lastConnectivityAt?: Date | undefined;
    LastConnectivityError?: string | undefined;

    entities: EntityDto[]
    chartReqTemplates: ChartReqTemplateDto[]
};