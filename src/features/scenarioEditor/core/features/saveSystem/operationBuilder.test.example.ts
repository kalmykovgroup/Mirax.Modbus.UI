// Пример тестов для демонстрации логики объединения операций
// Это не jest тесты, а просто примеры для понимания

import type { HistoryRecord } from '@scenario/core/features/historySystem/types';
import { buildOperationsFromHistory } from './operationBuilder';

// ============================================================================
// ПРИМЕР 1: Множественные Update одной ноды
// ============================================================================

const example1_History: HistoryRecord[] = [
    {
        id: 'op1',
        type: 'update',
        entityId: 'node-123',
        entityType: 'DelayStepNode',
        timestamp: 1000,
        before: {
            entityId: 'node-123',
            entityType: 'DelayStepNode',
            data: { id: 'node-123', x: 100, y: 100, name: 'Step 1' },
            timestamp: 999,
        },
        after: {
            entityId: 'node-123',
            entityType: 'DelayStepNode',
            data: { id: 'node-123', x: 150, y: 100, name: 'Step 1' },
            timestamp: 1000,
        },
    },
    {
        id: 'op2',
        type: 'update',
        entityId: 'node-123',
        entityType: 'DelayStepNode',
        timestamp: 1100,
        before: {
            entityId: 'node-123',
            entityType: 'DelayStepNode',
            data: { id: 'node-123', x: 150, y: 100, name: 'Step 1' },
            timestamp: 1000,
        },
        after: {
            entityId: 'node-123',
            entityType: 'DelayStepNode',
            data: { id: 'node-123', x: 150, y: 120, name: 'Step 1' },
            timestamp: 1100,
        },
    },
    {
        id: 'op3',
        type: 'update',
        entityId: 'node-123',
        entityType: 'DelayStepNode',
        timestamp: 1200,
        before: {
            entityId: 'node-123',
            entityType: 'DelayStepNode',
            data: { id: 'node-123', x: 150, y: 120, name: 'Step 1' },
            timestamp: 1100,
        },
        after: {
            entityId: 'node-123',
            entityType: 'DelayStepNode',
            data: { id: 'node-123', x: 150, y: 120, name: 'New Step' },
            timestamp: 1200,
        },
    },
];

// Результат: 1 операция Update с финальными данными
// { action: 'Update', payload: { id: 'node-123', x: 150, y: 120, name: 'New Step' } }

// ============================================================================
// ПРИМЕР 2: Create + Update
// ============================================================================

const example2_History: HistoryRecord[] = [
    {
        id: 'op1',
        type: 'create',
        entityId: 'node-456',
        entityType: 'DelayStepNode',
        timestamp: 2000,
        before: null,
        after: {
            entityId: 'node-456',
            entityType: 'DelayStepNode',
            data: { id: 'node-456', x: 200, y: 200, name: 'New Node' },
            timestamp: 2000,
        },
    },
    {
        id: 'op2',
        type: 'update',
        entityId: 'node-456',
        entityType: 'DelayStepNode',
        timestamp: 2100,
        before: {
            entityId: 'node-456',
            entityType: 'DelayStepNode',
            data: { id: 'node-456', x: 200, y: 200, name: 'New Node' },
            timestamp: 2000,
        },
        after: {
            entityId: 'node-456',
            entityType: 'DelayStepNode',
            data: { id: 'node-456', x: 250, y: 250, name: 'Updated Node' },
            timestamp: 2100,
        },
    },
];

// Результат: 1 операция Create с финальными данными
// { action: 'Create', payload: { id: 'node-456', x: 250, y: 250, name: 'Updated Node' } }

// ============================================================================
// ПРИМЕР 3: Create + Delete
// ============================================================================

const example3_History: HistoryRecord[] = [
    {
        id: 'op1',
        type: 'create',
        entityId: 'node-789',
        entityType: 'DelayStepNode',
        timestamp: 3000,
        before: null,
        after: {
            entityId: 'node-789',
            entityType: 'DelayStepNode',
            data: { id: 'node-789', x: 300, y: 300, name: 'Temp Node' },
            timestamp: 3000,
        },
    },
    {
        id: 'op2',
        type: 'delete',
        entityId: 'node-789',
        entityType: 'DelayStepNode',
        timestamp: 3100,
        before: {
            entityId: 'node-789',
            entityType: 'DelayStepNode',
            data: { id: 'node-789', x: 300, y: 300, name: 'Temp Node' },
            timestamp: 3000,
        },
        after: null,
    },
];

// Результат: 0 операций (нода создана и удалена, не отправляем на сервер)

// ============================================================================
// ПРИМЕР 4: Update + Delete
// ============================================================================

const example4_History: HistoryRecord[] = [
    {
        id: 'op1',
        type: 'update',
        entityId: 'node-999',
        entityType: 'DelayStepNode',
        timestamp: 4000,
        before: {
            entityId: 'node-999',
            entityType: 'DelayStepNode',
            data: { id: 'node-999', x: 400, y: 400, name: 'Old Name' },
            timestamp: 3999,
        },
        after: {
            entityId: 'node-999',
            entityType: 'DelayStepNode',
            data: { id: 'node-999', x: 450, y: 400, name: 'New Name' },
            timestamp: 4000,
        },
    },
    {
        id: 'op2',
        type: 'delete',
        entityId: 'node-999',
        entityType: 'DelayStepNode',
        timestamp: 4100,
        before: {
            entityId: 'node-999',
            entityType: 'DelayStepNode',
            data: { id: 'node-999', x: 450, y: 400, name: 'New Name' },
            timestamp: 4000,
        },
        after: null,
    },
];

// Результат: 1 операция Delete с изначальными данными (before первого Update)
// { action: 'Delete', payload: { id: 'node-999', x: 400, y: 400, name: 'Old Name' } }

// ============================================================================
// Функция для тестирования
// ============================================================================

function testOperationBuilder() {
    console.log('=== EXAMPLE 1: Multiple Updates ===');
    const result1 = buildOperationsFromHistory(example1_History);
    console.log('Input: 3 updates');
    console.log('Output:', result1.length, 'operations');
    console.log(result1);

    console.log('\n=== EXAMPLE 2: Create + Update ===');
    const result2 = buildOperationsFromHistory(example2_History);
    console.log('Input: 1 create + 1 update');
    console.log('Output:', result2.length, 'operations (should be Create with final data)');
    console.log(result2);

    console.log('\n=== EXAMPLE 3: Create + Delete ===');
    const result3 = buildOperationsFromHistory(example3_History);
    console.log('Input: 1 create + 1 delete');
    console.log('Output:', result3.length, 'operations (should be 0)');
    console.log(result3);

    console.log('\n=== EXAMPLE 4: Update + Delete ===');
    const result4 = buildOperationsFromHistory(example4_History);
    console.log('Input: 1 update + 1 delete');
    console.log('Output:', result4.length, 'operations (should be Delete with before data)');
    console.log(result4);
}

// Чтобы запустить: testOperationBuilder();
