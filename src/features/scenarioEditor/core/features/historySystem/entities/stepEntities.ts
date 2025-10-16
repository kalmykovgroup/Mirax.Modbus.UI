// src/features/history/entities/stepEntities.ts

import type {
    ModbusActivityStepDto,
    SystemActivityStepDto,
    DelayStepDto,
    SignalStepDto,
    JumpStepDto,
    ParallelStepDto,
    ConditionStepDto,
} from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { Entity } from '../types.ts';

// ============================================================================
// ENTITY WRAPPERS
// ============================================================================

export interface ModbusActivityStepEntity extends ModbusActivityStepDto, Entity {
    readonly entityType: 'ModbusActivityStep';
}

export interface SystemActivityStepEntity extends SystemActivityStepDto, Entity {
    readonly entityType: 'SystemActivityStep';
}

export interface DelayStepEntity extends DelayStepDto, Entity {
    readonly entityType: 'DelayStep';
}

export interface SignalStepEntity extends SignalStepDto, Entity {
    readonly entityType: 'SignalStep';
}

export interface JumpStepEntity extends JumpStepDto, Entity {
    readonly entityType: 'JumpStep';
}

export interface ParallelStepEntity extends ParallelStepDto, Entity {
    readonly entityType: 'ParallelStep';
}

export interface ConditionStepEntity extends ConditionStepDto, Entity {
    readonly entityType: 'ConditionStep';
}

// ============================================================================
// TYPE UNION
// ============================================================================

export type AnyStepEntity =
    | ModbusActivityStepEntity
    | SystemActivityStepEntity
    | DelayStepEntity
    | SignalStepEntity
    | JumpStepEntity
    | ParallelStepEntity
    | ConditionStepEntity;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isModbusActivityStepEntity(entity: Entity): entity is ModbusActivityStepEntity {
    return entity.entityType === 'ModbusActivityStep';
}

export function isSystemActivityStepEntity(entity: Entity): entity is SystemActivityStepEntity {
    return entity.entityType === 'SystemActivityStep';
}

export function isDelayStepEntity(entity: Entity): entity is DelayStepEntity {
    return entity.entityType === 'DelayStep';
}

export function isSignalStepEntity(entity: Entity): entity is SignalStepEntity {
    return entity.entityType === 'SignalStep';
}

export function isJumpStepEntity(entity: Entity): entity is JumpStepEntity {
    return entity.entityType === 'JumpStep';
}

export function isParallelStepEntity(entity: Entity): entity is ParallelStepEntity {
    return entity.entityType === 'ParallelStep';
}

export function isConditionStepEntity(entity: Entity): entity is ConditionStepEntity {
    return entity.entityType === 'ConditionStep';
}