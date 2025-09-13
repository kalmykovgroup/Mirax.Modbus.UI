// src/shared/contracts/Dtos/Templates/ChartReqTemplateDto.ts


import type {Guid} from "@app/lib/types/Guid.ts";
import type {DatabaseDto} from "@/charts/shared/contracts/metadata/Dtos/DatabaseDto.ts";

export type ChartReqTemplateDto = {
    id: Guid
    name: string
    description?: string | undefined

    // настройки графиков
    databaseId : Guid
    database?: DatabaseDto | undefined
    entity: string
    timeField: string
    fields: string[]

    // JSON-объект фильтров, в значениях можно использовать {{paramName}}
    // пример: { "DeviceId__eq": "{{deviceId}}", "BatteryVoltage__gte": 10 }
    filters: Record<string, unknown>
}

export type EditChartReqTemplate = {
    id: Guid | undefined
    name: string | undefined
    description?: string | undefined

    // настройки графиков
    databaseId? : Guid| undefined
    database?: DatabaseDto | undefined
    entity: string | undefined
    timeField: string | undefined
    fields: string[]

    // JSON-объект фильтров, в значениях можно использовать {{paramName}}
    // пример: { "DeviceId__eq": "{{deviceId}}", "BatteryVoltage__gte": 10 }
    filters: Record<string, unknown>
}

