// src/features/scenarioEditor/shared/utils/generateNodeTypes.ts
import type { NodeTypes } from '@xyflow/react';
import {nodeTypeRegistry} from "@scenario/shared/contracts/registry/NodeTypeRegistry.ts";

export function generateNodeTypes(): NodeTypes {
    const types: Record<string, any> = {};
    for (const contract of nodeTypeRegistry.getAll()) {
        types[contract.type] = contract.Component;
    }
    return types;
}