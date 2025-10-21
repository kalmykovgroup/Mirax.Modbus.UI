// src/features/scenarioEditor/nodes/activityModbus/ActivityModbusNodeContract.ts
import { FlowType } from '@/features/scenarioEditor/shared/contracts/types/FlowType';
import type {
    NodeTypeContract,
    NodeMappingResult,
} from '@/features/scenarioEditor/shared/contracts/registry/NodeTypeContract';
import type { ModbusActivityStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { ActivityModbusNode } from '@scenario/core/ui/nodes/ActivityModbusNode/ActivityModbusNode';

export const ActivityModbusNodeContract: NodeTypeContract<ModbusActivityStepDto> = {
    type: FlowType.activityModbusNode,
    dbTypeId: 1,
    displayName: 'Действие Modbus',
    description: 'Взаимодействие с Modbus устройством',
    Component: ActivityModbusNode,

    mapFromDto(dto, parentId): NodeMappingResult<ModbusActivityStepDto> {
        return {
            id: dto.id,
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
        };
    },

    mapToDto(data, nodeId): ModbusActivityStepDto {
        return {
            ...data.object,
            id: nodeId,
            x: data.x,
            y: data.y,
        };
    },

    handles: {
        sources: [{ id: 's1' }],
        targets: [{ id: 't1' }],
    },

    extent: 'parent',
    expandParent: true,
} as const;