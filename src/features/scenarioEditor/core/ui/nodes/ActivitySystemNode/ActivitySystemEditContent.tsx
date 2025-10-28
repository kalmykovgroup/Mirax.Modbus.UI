// src/features/scenarioEditor/core/ui/nodes/ActivitySystemNode/ActivitySystemEditContent.tsx

import type { ActivitySystemStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import type { NodeEditContract } from '../shared/NodeEditModal';
import styles from './ActivitySystemEditContent.module.css';

/**
 * Контракт редактирования для ActivitySystemNode
 */
export const ActivitySystemEditContract: NodeEditContract<ActivitySystemStepDto> = {
    title: 'Редактирование системного действия',
    width: 700,

    validate: (dto) => {
        const errors: string[] = [];

        if (!dto.name || dto.name.trim() === '') {
            errors.push('Название действия обязательно для заполнения');
        }

        if (!dto.systemActionId) {
            errors.push('Необходимо выбрать системное действие');
        }

        return errors;
    },

    renderContent: ({ dto, onChange }) => {
        return (
            <div>
                <div className={styles.infoBox}>
                    Заполните обязательные поля для сохранения изменений.
                    После нажатия "Сохранить" изменения попадут в историю и будут отправлены на сервер при общем сохранении.
                </div>

                {/* Название */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Название действия
                        <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        value={dto.name || ''}
                        onChange={(e) => onChange({ name: e.target.value })}
                        placeholder="Введите название..."
                    />
                </div>

                {/* System Action ID (временно текстовое поле, потом можно заменить на селект) */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        ID системного действия
                        <span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        value={dto.systemActionId || ''}
                        onChange={(e) => onChange({ systemActionId: e.target.value })}
                        placeholder="Введите GUID системного действия..."
                    />
                    <div className={styles.helpText}>
                        Укажите ID системного действия из справочника
                    </div>
                </div>

                {/* Task Queue */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Очередь задач
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        value={dto.taskQueue || ''}
                        onChange={(e) => onChange({ taskQueue: e.target.value })}
                        placeholder="default"
                    />
                    <div className={styles.helpText}>
                        Имя очереди для выполнения задачи (опционально)
                    </div>
                </div>

                {/* Default Input */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Входные данные по умолчанию (JSON)
                    </label>
                    <textarea
                        className={styles.textarea}
                        value={dto.defaultInput || ''}
                        onChange={(e) => onChange({ defaultInput: e.target.value })}
                        placeholder='{"key": "value"}'
                    />
                    <div className={styles.helpText}>
                        JSON-объект с входными параметрами
                    </div>
                </div>

                {/* Default Output */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Выходные данные по умолчанию (JSON)
                    </label>
                    <textarea
                        className={styles.textarea}
                        value={dto.defaultOutput || ''}
                        onChange={(e) => onChange({ defaultOutput: e.target.value })}
                        placeholder='{"result": "success"}'
                    />
                    <div className={styles.helpText}>
                        JSON-объект с выходными параметрами
                    </div>
                </div>
            </div>
        );
    },
};
