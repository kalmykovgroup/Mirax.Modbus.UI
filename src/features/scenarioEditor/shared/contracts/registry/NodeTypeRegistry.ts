// src/features/scenarioEditor/shared/contracts/registry/NodeTypeRegistry.ts

import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { FlowType } from '@scenario/core/ui/nodes/types/flowType';
import { StepType } from '@scenario/shared/contracts/server/types/Api.Shared/StepType';

class NodeTypeRegistry {
    private readonly registry = new Map<FlowType, NodeTypeContract<unknown>>();
    private readonly stepTypeToFlowType = new Map<StepType, FlowType>();

    register<TDto>(contract: NodeTypeContract<TDto>): void {
        if (this.registry.has(contract.type)) {
            throw new Error(`NodeType ${contract.type} уже зарегистрирован`);
        }

        this.registry.set(contract.type, contract as NodeTypeContract<unknown>);

        // Если у контракта есть stepType, создаём маппинг StepType -> FlowType
        if ('stepType' in contract && contract.stepType != null) {
            this.stepTypeToFlowType.set(contract.stepType as StepType, contract.type);
        }
    }

    /**
     * Получает контракт по FlowType
     */
    get<TDto = unknown>(type: FlowType): NodeTypeContract<TDto> | undefined {
        const contract = this.registry.get(type);
        return contract as NodeTypeContract<TDto> | undefined;
    }



    getAll(): ReadonlyArray<NodeTypeContract<unknown>> {
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