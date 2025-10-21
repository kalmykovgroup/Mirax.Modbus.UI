// src/features/history/entities/stepEntities.ts

import type {
    ActivityModbusStepDto,
    ActivitySystemStepDto,
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

export interface ActivityModbusStepEntity extends ActivityModbusStepDto, Entity {
    readonly entityType: 'ActivityModbusStep';
}

export interface ActivitySystemStepEntity extends ActivitySystemStepDto, Entity {
    readonly entityType: 'ActivitySystemStep';
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
    | ActivityModbusStepEntity
    | ActivitySystemStepEntity
    | DelayStepEntity
    | SignalStepEntity
    | JumpStepEntity
    | ParallelStepEntity
    | ConditionStepEntity;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isActivityModbusStepEntity(entity: Entity): entity is ActivityModbusStepEntity {
    return entity.entityType === 'ActivityModbusStep';
}

export function isActivitySystemStepEntity(entity: Entity): entity is ActivitySystemStepEntity {
    return entity.entityType === 'ActivitySystemStep';
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