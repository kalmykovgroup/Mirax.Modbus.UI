// src/features/scenario/commands/useCommandDispatcher.ts

import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/baseStore/store';
import type { Guid } from '@app/lib/types/Guid';
import { CommandDispatcher } from './CommandDispatcher';
import {useHistory} from "@scenario/core/features/historySystem/useHistory.ts";

/**
 * Хук для создания CommandDispatcher с интегрированной историей
 */
export function useCommandDispatcher(scenarioId: Guid | null): CommandDispatcher | null {
    const dispatch = useDispatch<AppDispatch>();

    // Инициализируем историю для сценария
    const history = useHistory(scenarioId ?? 'no-scenario', {
        autoInit: !!scenarioId,
        config: {
            maxHistorySize: 100,
            enableBatching: true,
        },
    });

    // Создаём dispatcher с историей
    const dispatcher = useMemo(() => {
        if (!scenarioId) return null;
        return new CommandDispatcher(scenarioId, dispatch, history);
    }, [scenarioId, dispatch, history]);

    return dispatcher;
}