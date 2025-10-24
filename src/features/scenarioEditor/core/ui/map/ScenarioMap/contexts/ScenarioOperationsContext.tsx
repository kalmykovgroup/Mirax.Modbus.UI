// src/features/scenarioEditor/core/ui/map/ScenarioMap/contexts/ScenarioOperationsContext.tsx

import React, { createContext, useContext } from 'react';
import type { useScenarioOperations } from '@scenario/core/hooks/useScenarioOperations';

type ScenarioOperations = ReturnType<typeof useScenarioOperations>;

const ScenarioOperationsContext = createContext<ScenarioOperations | null>(null);

export const ScenarioOperationsProvider: React.FC<{
    children: React.ReactNode;
    operations: ScenarioOperations;
}> = ({ children, operations }) => {
    return (
        <ScenarioOperationsContext.Provider value={operations}>
            {children}
        </ScenarioOperationsContext.Provider>
    );
};

export function useScenarioOperationsContext(): ScenarioOperations {
    const context = useContext(ScenarioOperationsContext);
    if (!context) {
        throw new Error('useScenarioOperationsContext must be used within ScenarioOperationsProvider');
    }
    return context;
}