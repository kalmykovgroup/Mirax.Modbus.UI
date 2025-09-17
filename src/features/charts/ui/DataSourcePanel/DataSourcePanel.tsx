import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '@/store/types.ts'

import {
    fetchDatabases, fetchEntities, fetchEntityFields,
    setActiveDb, setActiveEntity,
    toggleFilterField, setFilterFields,
    selectDatabases, selectEntities, selectFields,
    selectLoading, selectErrors, selectEditEntity,
    clearBoundTemplate, setEditEntityName, setEditEntityDesc,
} from '@charts/store/chartsMetaSlice.ts'

import { createChartReqTemplate, updateChartReqTemplate } from '@charts/store/chartsTemplatesSlice.ts'
import type { ChartReqTemplateDto } from '@charts/shared/contracts/chartTemplate/Dtos/ChartReqTemplateDto.ts'
import type { DatabaseDto } from '@charts/shared/contracts/metadata/Dtos/DatabaseDto.ts'
import type { Guid } from '@app/lib/types/Guid.ts'

import type {
    UpdateChartReqTemplateRequest
} from "@charts/shared/contracts/chartTemplate/Dtos/Request/UpdateChartReqTemplateRequest.ts";
import type {FieldDto} from "@charts/shared/contracts/metadata/Dtos/FieldDto.ts";
import type {SqlFilter} from "@charts/shared/contracts/chartTemplate/Dtos/SqlFilter.ts";
import type {
    CreateChartReqTemplateRequest
} from "@charts/shared/contracts/chartTemplate/Dtos/Request/CreateChartReqTemplateRequest.ts";
import {DatabaseSection} from "@charts/ui/DataSourcePanel/DatabaseSection/DatabaseSection.tsx";
import {EntitySection} from "@charts/ui/DataSourcePanel/EntitySection/EntitySection.tsx";
import {TimeFieldSection} from "@charts/ui/DataSourcePanel/TimeFieldSection/TimeFieldSection.tsx";
import {FieldsSection} from "@charts/ui/DataSourcePanel/FieldsSection/FieldsSection.tsx";
import {TemplateMetaSection} from "@charts/ui/DataSourcePanel/TemplateMetaSection/TemplateMetaSection.tsx";
import {FooterActions} from "@charts/ui/DataSourcePanel/FooterActions/FooterActions.tsx";
import type {FilterClause} from "@charts/shared/contracts/chartTemplate/Dtos/FilterClause.ts";
import type {SqlParam} from "@charts/shared/contracts/chartTemplate/Dtos/SqlParam.ts";
import {FiltersAndSqlPanel} from "@charts/ui/DataSourcePanel/SqlAndFiltersSection";

export function DataSourcePanel({ onApply }: { onApply?: (args: ChartReqTemplateDto) => void } ) {
    const dispatch = useDispatch<AppDispatch>()

    const databases = useSelector(selectDatabases)
    const editEntity = useSelector(selectEditEntity)
    const entities = useSelector(selectEntities)
    const fields = useSelector(selectFields)
    const loading = useSelector(selectLoading)
    const errors = useSelector(selectErrors)

    const [tplExtras, setTplExtras] = useState({
        where: [] as FilterClause[],
        params: [] as SqlParam[],
        sql: null as SqlFilter | null,
    });

    const timeFields: FieldDto[] = useMemo(() => (fields ?? []).filter((f: any) => f?.isTime), [fields])

    const [timeField, setTimeFieldLocal] = useState<FieldDto | undefined>(undefined)


    const byId = useMemo(() => new Map<Guid, DatabaseDto>(databases.map(d => [d.id, d])), [databases])

    useEffect(() => {
        if (!timeField && timeFields.length) setTimeFieldLocal(timeFields[0])
        if (timeField && !timeFields.includes(timeField)) setTimeFieldLocal(timeFields[0])
    }, [timeFields, timeField])

    useEffect(() => { dispatch(fetchDatabases()) }, [dispatch])

    const handleDbChange = (databaseId: Guid) => {
        const db = byId.get(databaseId)
        if (!db) return
        dispatch(setActiveDb(db))
    }

    const validate = () => {
        const missing: string[] = []
        if (!editEntity.database) missing.push('База данных')
        if (!editEntity.entity) missing.push('Таблица (entity)')
        if (!timeField) missing.push('Поле времени (timeField)')
        if (!editEntity.name?.length) missing.push('Имя')
        if (missing.length) { alert(`Заполните: ${missing.join(', ')}`); return false }
        return true
    }

    const updateTemplate = () => {
        if (!editEntity.id) { alert('Не выбран шаблон для обновления'); return }
        if (!validate()) return

        const dto: UpdateChartReqTemplateRequest = {
            id: editEntity.id!,
            name: editEntity.name!,
            description: editEntity.description,
            databaseId: editEntity.databaseId!,
            entity: editEntity.entity!,
            timeField: timeField!,
            selectedFields: editEntity.selectedFields ?? [],
            where:  tplExtras.where.length ? tplExtras.where : undefined,
            params: tplExtras.params.length ? tplExtras.params : undefined,
            sql:    tplExtras.sql && tplExtras.sql.whereSql.trim() ? tplExtras.sql : undefined,
        }
        dispatch(updateChartReqTemplate(dto))
    }

    const createTemplate = () => {
        if (!validate()) return
        const dto: CreateChartReqTemplateRequest = {
            id: editEntity.id!,
            name: editEntity.name!,
            description: editEntity.description,
            databaseId: editEntity.databaseId!,
            entity: editEntity.entity!,
            timeField: timeField!,
            selectedFields: editEntity.selectedFields ?? [],
            where:  tplExtras.where.length ? tplExtras.where : undefined,
            params: tplExtras.params.length ? tplExtras.params : undefined,
            sql:    tplExtras.sql && tplExtras.sql.whereSql.trim() ? tplExtras.sql : undefined,
        }
        dispatch(createChartReqTemplate(dto))
    }

    const handleApply = () => {
        const dto: ChartReqTemplateDto = {
            id: editEntity.id!,
            name: editEntity.name!,
            description: editEntity.description,
            databaseId: editEntity.databaseId!,
            entity: editEntity.entity!,
            timeField: timeField!,
            selectedFields: editEntity.selectedFields ?? [],
            where:  tplExtras.where.length ? tplExtras.where : undefined,
            params: tplExtras.params.length ? tplExtras.params : undefined,
            sql:    tplExtras.sql && tplExtras.sql.whereSql.trim() ? tplExtras.sql : undefined,
        } as ChartReqTemplateDto

        if(onApply != undefined) onApply(dto)
    }


    return (
        <div style={{ display: 'grid', gap: 12, padding: 12, border: '1px solid #333', borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>Источник данных</div>

            <DatabaseSection
                databases={databases}
                activeDbId={editEntity?.databaseId}
                loading={loading.databases}
                error={errors.databases}
                onChange={(id: Guid) => handleDbChange(id)}
                onRefresh={() => dispatch(fetchDatabases())}
            />

            <EntitySection
                entities={entities ?? []}
                activeEntityName={editEntity.entity?.name}
                loading={loading.entities}
                error={errors.entities}
                onChange={(entity) => dispatch(setActiveEntity(entity))}
                onRefresh={() => dispatch(fetchEntities())}
                disabled={!databases.length}
            />

            <TimeFieldSection
                timeFields={timeFields}
                activeField={timeField}
                setTimeFieldActive={setTimeFieldLocal}
                loading={loading.fields}
                onRefresh={() => editEntity.entity && dispatch(fetchEntityFields({ entity: editEntity.entity }))}
                canRefresh={!!editEntity.entity}
            />

            <FieldsSection
                fields={fields || []}
                selected={editEntity.selectedFields}
                loading={loading.fields}
                error={errors.fields}
                onToggle={(name) => dispatch(toggleFilterField(name))}
                onSelectNumeric={() => dispatch(setFilterFields(fields?.filter(f => f.isNumeric) ?? []))}
                onClear={() => dispatch(setFilterFields([]))}
            />

            <FiltersAndSqlPanel
                availableFields={fields || []}
                value={tplExtras}
                onChange={setTplExtras}
            />

            <TemplateMetaSection
                name={editEntity.name}
                description={editEntity.description}
                onName={(v) => dispatch(setEditEntityName(v))}
                onDescription={(v) => dispatch(setEditEntityDesc(v))}
            />

            <FooterActions
                isEdit={!!editEntity.id}
                onUpdate={updateTemplate}
                onReset={() => dispatch(clearBoundTemplate())}
                onCreate={createTemplate}
                onApply={handleApply}
            />

        </div>
    )
}
