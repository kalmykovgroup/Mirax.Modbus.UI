// src/features/scenarioEditor/core/ui/nodes/shared/NodeEditModal/contracts/PlaceholderEditContract.tsx

import type { NodeEditContract } from '../types';

/**
 * Временный контракт-заглушка для нод, для которых еще не реализована форма редактирования.
 * Показывает сообщение о том, что функционал в разработке.
 */
export function createPlaceholderContract(nodeTypeName: string): NodeEditContract<any> {
    return {
        title: `Редактирование ${nodeTypeName}`,
        width: 500,
        renderContent: () => (
            <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#888'
            }}>
                <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                    Форма редактирования для "{nodeTypeName}" находится в разработке
                </p>
                <p style={{ fontSize: '14px' }}>
                    Этот функционал будет добавлен позже
                </p>
            </div>
        ),
    };
}
