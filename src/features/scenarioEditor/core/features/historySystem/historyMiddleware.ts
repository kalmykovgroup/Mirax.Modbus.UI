// src/features/history/historyMiddleware.ts

import type { Middleware } from '@reduxjs/toolkit';

import { undo, redo } from './historySlice';
import { historyRegistry } from './historyRegistry';
import type { RootState } from '@/baseStore/store';
import type { HistoryRecord } from './types.ts';
import { isBatchCommand, isCreateCommand, isUpdateCommand, isDeleteCommand } from './types.ts';

/**
 * Middleware для автоматического применения команд при undo/redo
 */
export const historyMiddleware: Middleware<object, RootState> = (store) => (next) => (action) => {
    // Пропускаем action в reducer сначала
    const result = next(action);

    // Обрабатываем undo
    if (undo.match(action)) {
        const contextId = action.payload;
        const state = store.getState();
        const context = state.history.contexts[contextId];

        if (!context || !context.present) {
            return result;
        }

        const command = context.present;

        try {
            if (isBatchCommand(command)) {
                // Для батча выполняем все команды в обратном порядке
                for (let i = command.commands.length - 1; i >= 0; i--) {
                    const cmd = command.commands[i];
                    if (cmd) {
                        executeUndo(cmd);
                    }
                }
            } else {
                executeUndo(command);
            }
        } catch (error) {
            console.error('[HistoryMiddleware] Error executing undo:', error);
        }
    }

    // Обрабатываем redo
    if (redo.match(action)) {
        const contextId = action.payload;
        const state = store.getState();
        const context = state.history.contexts[contextId];

        if (!context || !context.present) {
            return result;
        }

        const command = context.present;

        try {
            if (isBatchCommand(command)) {
                // Для батча выполняем все команды в прямом порядке
                for (const cmd of command.commands) {
                    executeRedo(cmd);
                }
            } else {
                executeRedo(command);
            }
        } catch (error) {
            console.error('[HistoryMiddleware] Error executing redo:', error);
        }
    }

    return result;
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Выполнить отмену команды
 */
function executeUndo(command: HistoryRecord): void {
    if (isBatchCommand(command)) {
        // Рекурсивно для вложенных батчей (если они есть)
        for (let i = command.commands.length - 1; i >= 0; i--) {
            const cmd = command.commands[i];
            if (cmd) {
                executeUndo(cmd);
            }
        }
        return;
    }

    const handler = historyRegistry.getHandler(command.entityType);
    if (!handler) {
        console.warn(`[executeUndo] No handler for type "${command.entityType}"`);
        return;
    }

    if (isCreateCommand(command)) {
        // Отменить создание = удалить сущность
        if (command.after) {
            handler.delete(command.entityId);
        }
    } else if (isUpdateCommand(command)) {
        // Отменить обновление = восстановить previous состояние
        if (command.before) {
            handler.revert(command.before);
        }
    } else if (isDeleteCommand(command)) {
        // Отменить удаление = создать сущность заново
        if (command.before) {
            handler.create(command.before);
        }
    }
}

/**
 * Выполнить повтор команды
 */
function executeRedo(command: HistoryRecord): void {
    if (isBatchCommand(command)) {
        // Рекурсивно для вложенных батчей
        for (const cmd of command.commands) {
            executeRedo(cmd);
        }
        return;
    }

    const handler = historyRegistry.getHandler(command.entityType);
    if (!handler) {
        console.warn(`[executeRedo] No handler for type "${command.entityType}"`);
        return;
    }

    if (isCreateCommand(command)) {
        // Повторить создание
        if (command.after) {
            handler.create(command.after);
        }
    } else if (isUpdateCommand(command)) {
        // Повторить обновление
        if (command.after) {
            handler.apply(command.after);
        }
    } else if (isDeleteCommand(command)) {
        // Повторить удаление
        handler.delete(command.entityId);
    }
}