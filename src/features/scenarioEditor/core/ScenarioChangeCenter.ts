// src/app/scenario-designer/core/change/ScenarioChangeCenter.ts
// Единая точка: 3 метода (create/update/delete), каждый принимает ScenarioOperationDto и просто логирует изменение.

import type { Guid } from '@app/lib/types/Guid'
import type { ScenarioOperationDto } from '@shared/contracts/Dtos/RemoteDtos/ScenarioDtos/ScenarioOperationDto'
import {DbActionType} from "@shared/contracts/Types/Api.Shared/Scenario/DbActionType.ts";

export class ScenarioChangeCenter {
    private readonly scenarioId: Guid

    constructor(scenarioId: Guid) {
        this.scenarioId = scenarioId
    }

    private log(tag: string, op: ScenarioOperationDto) {
        // eslint-disable-next-line no-console
        console.log(`[ScenarioChangeCenter:${tag}]`, {
            scenarioId: this.scenarioId,
            opId: op.opId,
            entity: op.entity,
            action: op.action,
            payload: op.payload,
        })
    }

    /** CREATE: кто-то создал сущность/связь */
    create(op: ScenarioOperationDto): void {
        this.log('create', op)
    }

    /** UPDATE: кто-то обновил сущность/связь */
    update(op: ScenarioOperationDto): void {
        this.log('update', op)
    }

    /** DELETE: кто-то удалил сущность/связь */
    delete(op: ScenarioOperationDto): void {
        this.log('delete', op)
    }

    /** Опционально: роутер по action, если удобнее вызывать одним методом */
    handle(op: ScenarioOperationDto): void {
        switch (op.action) {
            case DbActionType.Create:
                this.create(op)
                break
            case DbActionType.Update:
                this.update(op)
                break
            case DbActionType.Delete:
                this.delete(op)
                break
            default:
                this.log('unknown', op)
                break
        }
    }
}
