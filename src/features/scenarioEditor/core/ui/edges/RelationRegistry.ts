// src/features/scenarioEditor/core/ui/edges/RelationRegistry.ts

import type { StepRelationContract } from './StepRelationContract';

class RelationRegistry {
    private readonly registry = new Map<string, StepRelationContract>();

    register(contract: StepRelationContract): void {
        if (this.registry.has(contract.type)) {
            throw new Error(`Relation type ${contract.type} уже зарегистрирован`);
        }

        this.registry.set(contract.type, contract);
        console.log(`[RelationRegistry] ✅ Registered: ${contract.type}`);
    }

    get(type: string): StepRelationContract | undefined {
        return this.registry.get(type);
    }

    has(type: string): boolean {
        return this.registry.has(type);
    }
}

export const relationRegistry = new RelationRegistry();