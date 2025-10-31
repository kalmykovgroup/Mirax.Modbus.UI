import type { EdgeTypes } from '@xyflow/react';
import SmartStepEdge from "@scenario/core/ui/edges/SmartStepEdge/SmartStepEdge.tsx";
import JumpEdge from "@scenario/core/ui/edges/JumpEdge/JumpEdge.tsx";

export const edgeTypes: EdgeTypes = {
    step: SmartStepEdge,
    branchLink: SmartStepEdge, // Используем тот же компонент для branch links
    jump: JumpEdge, // Отдельный компонент для jump-связей
}