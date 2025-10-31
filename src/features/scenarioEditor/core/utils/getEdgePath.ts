import {
    getBezierPath,
    getSmoothStepPath,
    getStraightPath,
    getSimpleBezierPath,
    type Position,
} from '@xyflow/react';
import EdgePathType from '@scenario/core/types/EdgePathType';

export interface EdgePathParams {
    sourceX: number;
    sourceY: number;
    sourcePosition: Position;
    targetX: number;
    targetY: number;
    targetPosition: Position;
    borderRadius?: number;
}

/**
 * Получить путь для edge в зависимости от типа
 */
export function getEdgePath(
    pathType: EdgePathType,
    params: EdgePathParams
): [path: string, labelX: number, labelY: number, offsetX: number, offsetY: number] {
    const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius = 8 } = params;

    switch (pathType) {
        case EdgePathType.SmoothStep:
            return getSmoothStepPath({
                sourceX,
                sourceY,
                sourcePosition,
                targetX,
                targetY,
                targetPosition,
                borderRadius,
            });

        case EdgePathType.Straight:
            return getStraightPath({
                sourceX,
                sourceY,
                targetX,
                targetY,
            });

        case EdgePathType.Bezier:
            return getBezierPath({
                sourceX,
                sourceY,
                sourcePosition,
                targetX,
                targetY,
                targetPosition,
            });

        case EdgePathType.SimpleBezier:
            return getSimpleBezierPath({
                sourceX,
                sourceY,
                sourcePosition,
                targetX,
                targetY,
                targetPosition,
            });

        case EdgePathType.Step:
            // Step - это SmoothStep без borderRadius
            return getSmoothStepPath({
                sourceX,
                sourceY,
                sourcePosition,
                targetX,
                targetY,
                targetPosition,
                borderRadius: 0,
            });

        default:
            // Fallback на SmoothStep
            return getSmoothStepPath({
                sourceX,
                sourceY,
                sourcePosition,
                targetX,
                targetY,
                targetPosition,
                borderRadius,
            });
    }
}
