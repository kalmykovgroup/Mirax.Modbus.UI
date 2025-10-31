// src/features/scenarioEditor/shared/contracts/registry/NodeTypeRegistry.ts

import type { NodeTypeContract, BaseNodeDto } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { FlowType } from '@scenario/core/types/flowType';

class NodeTypeRegistry {
    private readonly registry = new Map<FlowType, NodeTypeContract<any>>();

    //  ИСПРАВЛЕНО: Принимаем контракт как unknown, затем кастуем
    register(contract: unknown): void {
        const typedContract = contract as NodeTypeContract<any>;

        if (this.registry.has(typedContract.type)) {
            throw new Error(`NodeType ${typedContract.type} уже зарегистрирован`);
        }

        this.registry.set(typedContract.type, typedContract);
    }

    registerMany(...contracts: unknown[]): void {
        for (const contract of contracts) {
            this.register(contract);
        }
    }

    get<TDto extends BaseNodeDto = BaseNodeDto>(
        type: FlowType
    ): NodeTypeContract<TDto> | undefined {
        return this.registry.get(type) as NodeTypeContract<TDto> | undefined;
    }

    getAll(): ReadonlyArray<NodeTypeContract<any>> {
        return Array.from(this.registry.values());
    }

    getAllTypes(): ReadonlyArray<FlowType> {
        return Array.from(this.registry.keys());
    }

    has(type: FlowType): boolean {
        return this.registry.has(type);
    }
}

export const nodeTypeRegistry = new NodeTypeRegistry();