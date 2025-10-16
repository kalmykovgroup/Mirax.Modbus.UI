// src/features/scenario/commands/types/scenarioCommands.ts

import type { Guid } from '@app/lib/types/Guid.ts';
import type { AnyStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto.ts';
import type { BranchDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Branch/BranchDto.ts';
import type { StepRelationDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/StepRelations/StepRelationDto.ts';

/**
 * Базовый интерфейс команды
 */
export interface ScenarioCommand<TPayload = unknown> {
    readonly type: string;
    readonly scenarioId: Guid;
    readonly payload: TPayload;
    readonly metadata?: CommandMetadata | undefined;
}

/**
 * Метаданные команды (для истории и отладки)
 */
export interface CommandMetadata {
    readonly timestamp: number;
    readonly description?: string | undefined;
    readonly userId?: string | undefined;
    readonly batch?: boolean | undefined;
}

// ============================================================================
// STEP COMMANDS
// ============================================================================

export interface CreateStepPayload {
    readonly step: AnyStepDto;
    readonly branchId: Guid;
}

export interface UpdateStepPayload {
    readonly stepId: Guid;
    readonly changes: Partial<AnyStepDto>;
    readonly previousState?: AnyStepDto | undefined; // Для истории
}

export interface DeleteStepPayload {
    readonly stepId: Guid;
    readonly previousState?: AnyStepDto | undefined; // Для восстановления
}

export interface MoveStepPayload {
    readonly stepId: Guid;
    readonly branchId: Guid;
    readonly x: number;
    readonly y: number;
    readonly previousBranchId?: Guid | undefined;
    readonly previousX?: number | undefined;
    readonly previousY?: number | undefined;
}

export type CreateStepCommand = ScenarioCommand<CreateStepPayload> & { type: 'CREATE_STEP' };
export type UpdateStepCommand = ScenarioCommand<UpdateStepPayload> & { type: 'UPDATE_STEP' };
export type DeleteStepCommand = ScenarioCommand<DeleteStepPayload> & { type: 'DELETE_STEP' };
export type MoveStepCommand = ScenarioCommand<MoveStepPayload> & { type: 'MOVE_STEP' };

// ============================================================================
// BRANCH COMMANDS
// ============================================================================

export interface CreateBranchPayload {
    readonly branch: BranchDto;
    readonly parentStepId?: Guid | null;
}

export interface UpdateBranchPayload {
    readonly branchId: Guid;
    readonly changes: Partial<BranchDto>;
    readonly previousState?: Partial<BranchDto> | undefined;
}

export interface DeleteBranchPayload {
    readonly branchId: Guid;
    readonly previousState?: BranchDto | undefined;
}

export interface ResizeBranchPayload {
    readonly branchId: Guid;
    readonly width: number;
    readonly height: number;
    readonly previousWidth?: number | undefined;
    readonly previousHeight?: number | undefined;
}

export type CreateBranchCommand = ScenarioCommand<CreateBranchPayload> & { type: 'CREATE_BRANCH' };
export type UpdateBranchCommand = ScenarioCommand<UpdateBranchPayload> & { type: 'UPDATE_BRANCH' };
export type DeleteBranchCommand = ScenarioCommand<DeleteBranchPayload> & { type: 'DELETE_BRANCH' };
export type ResizeBranchCommand = ScenarioCommand<ResizeBranchPayload> & { type: 'RESIZE_BRANCH' };

// ============================================================================
// RELATION COMMANDS
// ============================================================================

export interface CreateRelationPayload {
    readonly relation: StepRelationDto;
}

export interface UpdateRelationPayload {
    readonly relationId: Guid;
    readonly changes: Partial<StepRelationDto>;
    readonly previousState?: Partial<StepRelationDto> | undefined;
}

export interface DeleteRelationPayload {
    readonly relationId: Guid;
    readonly previousState?: StepRelationDto | undefined;
}

export type CreateRelationCommand = ScenarioCommand<CreateRelationPayload> & { type: 'CREATE_RELATION' };
export type UpdateRelationCommand = ScenarioCommand<UpdateRelationPayload> & { type: 'UPDATE_RELATION' };
export type DeleteRelationCommand = ScenarioCommand<DeleteRelationPayload> & { type: 'DELETE_RELATION' };

// ============================================================================
// BATCH COMMAND
// ============================================================================

export interface BatchCommandPayload {
    readonly commands: readonly AnyScenarioCommand[];
    readonly description?: string | undefined;
}

export type BatchCommand = ScenarioCommand<BatchCommandPayload> & { type: 'BATCH' };

// ============================================================================
// UNION TYPE
// ============================================================================

export type AnyScenarioCommand =
    | CreateStepCommand
    | UpdateStepCommand
    | DeleteStepCommand
    | MoveStepCommand
    | CreateBranchCommand
    | UpdateBranchCommand
    | DeleteBranchCommand
    | ResizeBranchCommand
    | CreateRelationCommand
    | UpdateRelationCommand
    | DeleteRelationCommand
    | BatchCommand;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isCreateStepCommand(cmd: AnyScenarioCommand): cmd is CreateStepCommand {
    return cmd.type === 'CREATE_STEP';
}

export function isUpdateStepCommand(cmd: AnyScenarioCommand): cmd is UpdateStepCommand {
    return cmd.type === 'UPDATE_STEP';
}

export function isDeleteStepCommand(cmd: AnyScenarioCommand): cmd is DeleteStepCommand {
    return cmd.type === 'DELETE_STEP';
}

export function isMoveStepCommand(cmd: AnyScenarioCommand): cmd is MoveStepCommand {
    return cmd.type === 'MOVE_STEP';
}

export function isCreateBranchCommand(cmd: AnyScenarioCommand): cmd is CreateBranchCommand {
    return cmd.type === 'CREATE_BRANCH';
}

export function isUpdateBranchCommand(cmd: AnyScenarioCommand): cmd is UpdateBranchCommand {
    return cmd.type === 'UPDATE_BRANCH';
}

export function isDeleteBranchCommand(cmd: AnyScenarioCommand): cmd is DeleteBranchCommand {
    return cmd.type === 'DELETE_BRANCH';
}

export function isResizeBranchCommand(cmd: AnyScenarioCommand): cmd is ResizeBranchCommand {
    return cmd.type === 'RESIZE_BRANCH';
}

export function isCreateRelationCommand(cmd: AnyScenarioCommand): cmd is CreateRelationCommand {
    return cmd.type === 'CREATE_RELATION';
}

export function isUpdateRelationCommand(cmd: AnyScenarioCommand): cmd is UpdateRelationCommand {
    return cmd.type === 'UPDATE_RELATION';
}

export function isDeleteRelationCommand(cmd: AnyScenarioCommand): cmd is DeleteRelationCommand {
    return cmd.type === 'DELETE_RELATION';
}

export function isBatchCommand(cmd: AnyScenarioCommand): cmd is BatchCommand {
    return cmd.type === 'BATCH';
}