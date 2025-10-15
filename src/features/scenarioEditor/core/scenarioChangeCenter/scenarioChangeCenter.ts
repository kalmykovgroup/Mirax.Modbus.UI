/**
 * ФАЙЛ: src/features/scenarioEditor/core/ScenarioChangeCenter.ts
 *
 * Мост между ScenarioOperationDto и универсальной системой отслеживания изменений
 */

import type { Guid } from '@app/lib/types/Guid';
import type { ScenarioOperationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/ScenarioOperationDto';
import { DbActionType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbActionType';
import { DbEntityType } from '@scenario/shared/contracts/server/types/Api.Shared/Scenario/DbEntityType';

import { addChange } from '@scenario/store/scenarioChangesSlice';
import type {AppDispatch} from "@/baseStore/store.ts";

export class ScenarioChangeCenter {
    private readonly scenarioId: Guid;
    private readonly dispatch: AppDispatch | undefined;

    constructor(scenarioId: Guid, dispatch?: AppDispatch) {
        this.scenarioId = scenarioId;
        this.dispatch = dispatch;
    }

    private log(tag: string, op: ScenarioOperationDto): void {
        console.log(`[ScenarioChangeCenter:${tag}]`, {
            scenarioId: this.scenarioId,
            opId: op.opId,
            entity: op.entity,
            action: op.action,
            payload: op.payload,
        });
    }

    /**
     * Извлекает entity из payload для отслеживания изменений
     */
    private extractEntity(op: ScenarioOperationDto): { id: string } {
        // Если payload это строка - это ID
        if (typeof op.payload === 'string') {
            return { id: op.payload };
        }

        // Если payload это объект с id
        if (op.payload !== null && typeof op.payload === 'object') {
            const obj = op.payload as Record<string, unknown>;
            if ('id' in obj && typeof obj.id === 'string') {
                return op.payload as { id: string };
            }
        }

        // Fallback - создаём временный объект
        return { id: op.opId };
    }

    /**
     * Преобразует DbActionType в ChangeAction
     */
    private toChangeAction(action: DbActionType): 'create' | 'update' | 'delete' {
        switch (action) {
            case DbActionType.Create:
                return 'create';
            case DbActionType.Update:
                return 'update';
            case DbActionType.Delete:
                return 'delete';
        }
    }

    /**
     * Преобразует DbEntityType в строку
     */
    private toEntityType(entity: DbEntityType): string {
        return entity as string;
    }

    /**
     * Пробрасывает операцию в систему отслеживания изменений
     */
    private track(op: ScenarioOperationDto): void {
        if (this.dispatch === undefined) {
            this.log('no-dispatch', op);
            return;
        }

        const entity = this.extractEntity(op);
        const action = this.toChangeAction(op.action);
        const entityType = this.toEntityType(op.entity);

        this.dispatch(
            addChange({
                contextId: this.scenarioId,
                entityType,
                entity,
                action,
            })
        );

        this.log('tracked', op);
    }

    /** CREATE: кто-то создал сущность/связь */
    public create(op: ScenarioOperationDto): void {
        this.track(op);
    }

    /** UPDATE: кто-то обновил сущность/связь */
    public update(op: ScenarioOperationDto): void {
        this.track(op);
    }

    /** DELETE: кто-то удалил сущность/связь */
    public delete(op: ScenarioOperationDto): void {
        this.track(op);
    }

    /** Роутер по action */
    public handle(op: ScenarioOperationDto): void {
        switch (op.action) {
            case DbActionType.Create:
                this.create(op);
                break;
            case DbActionType.Update:
                this.update(op);
                break;
            case DbActionType.Delete:
                this.delete(op);
                break;
            default:
                this.log('unknown', op);
                break;
        }
    }
}