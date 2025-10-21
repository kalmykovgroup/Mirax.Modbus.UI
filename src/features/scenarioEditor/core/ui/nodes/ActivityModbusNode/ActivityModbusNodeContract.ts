// src/features/scenarioEditor/nodes/activityModbus/ActivityModbusNodeContract.ts
import { FlowType } from '@scenario/core/ui/nodes/types/flowType.ts';
import type { NodeTypeContract } from '@scenario/shared/contracts/registry/NodeTypeContract';
import type { FlowNode } from '@scenario/shared/contracts/models/FlowNode';
import type { ActivityModbusStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { ActivityModbusNode } from '@scenario/core/ui/nodes/ActivityModbusNode/ActivityModbusNode';

export const ActivityModbusNodeContract: NodeTypeContract<ActivityModbusStepDto> = {
    type: FlowType.ActivityModbus,
    displayName: 'Действие Modbus',
    Component: ActivityModbusNode,

    mapFromDto(dto, parentId) {
        return {
            id: dto.id,
            type: FlowType.ActivityModbus,
            position: { x: dto.x, y: dto.y },
            parentId,
            data: {
                object: dto,
                x: dto.x,
                y: dto.y,
                __persisted: true,
            },
            style: { zIndex: 1 },
            extent: 'parent',
            expandParent: true,
        } as FlowNode<ActivityModbusStepDto>;
    },

    mapToDto(node) {
        return {
            ...node.data.object,
            id: node.id,
            x: node.data.x,
            y: node.data.y,
        };
    },
};