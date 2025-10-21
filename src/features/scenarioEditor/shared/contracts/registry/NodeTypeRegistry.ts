// src/features/scenarioEditor/shared/registry/NodeTypeRegistry.ts

import type {NodeTypeContract} from "@scenario/shared/contracts/registry/NodeTypeContract.ts";
import type {FlowType} from "@scenario/shared/contracts/types/FlowType.ts";

class NodeTypeRegistry {
    // ✅ Храним без generic-параметра (NodeTypeContract<unknown>)
    private readonly registry = new Map<FlowType, NodeTypeContract<unknown>>();
    private readonly dbTypeMap = new Map<number, FlowType>();

    /**
     * Регистрирует контракт ноды.
     * @template TDto - Тип DTO (выводится автоматически из контракта)
     */
    register<TDto>(contract: NodeTypeContract<TDto>): void {
        if (this.registry.has(contract.type)) {
            throw new Error(`NodeType ${contract.type} уже зарегистрирован`);
        }

        // ✅ Приводим к базовому типу для хранения
        this.registry.set(contract.type, contract as NodeTypeContract<unknown>);

        if (contract.dbTypeId !== undefined) {
            this.dbTypeMap.set(contract.dbTypeId, contract.type);
        }
    }

    /**
     * Получает контракт по типу ноды
     */
    get<TDto = unknown>(type: FlowType): NodeTypeContract<TDto> | undefined {
        const contract = this.registry.get(type);
        return contract as NodeTypeContract<TDto> | undefined;
    }

    /**
     * Получает контракт по ID типа из БД
     */
    getByDbType<TDto = unknown>(dbTypeId: number): NodeTypeContract<TDto> | undefined {
        const flowType = this.dbTypeMap.get(dbTypeId);
        if (flowType === undefined) return undefined;

        const contract = this.registry.get(flowType);
        return contract as NodeTypeContract<TDto> | undefined;
    }

    /**
     * Возвращает все зарегистрированные контракты
     */
    getAll(): ReadonlyArray<NodeTypeContract<unknown>> {
        return Array.from(this.registry.values());
    }

    /**
     * Возвращает все зарегистрированные типы нод
     */
    getAllTypes(): ReadonlyArray<FlowType> {
        return Array.from(this.registry.keys());
    }

    /**
     * Проверяет, зарегистрирован ли тип
     */
    has(type: FlowType): boolean {
        return this.registry.has(type);
    }
}

export const nodeTypeRegistry = new NodeTypeRegistry();