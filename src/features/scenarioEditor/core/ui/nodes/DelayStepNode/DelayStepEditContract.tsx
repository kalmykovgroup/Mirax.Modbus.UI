// src/features/scenarioEditor/core/ui/nodes/DelayStepNode/DelayStepEditContract.tsx

import { useState, useEffect } from 'react';
import type { NodeEditContract, RenderContentParams } from '@scenario/core/ui/nodes/components/NodeEditModal/types.ts';
import type { DelayStepDto } from '@scenario/shared/contracts/server/remoteServerDtos/ScenarioDtos/Steps/StepBaseDto';
import { Block } from '@scenario/core/features/fieldLockSystem';
import DelayTimeInput, { parseDurationToMs, formatMsToNetTimeSpan } from './DelayTimeInput/DelayTimeInput';
import {StepBaseFieldsEditor} from "@scenario/core/ui/nodes/components/StepBaseFieldsEditor";


/**
 * Компонент содержимого для редактирования DelayStep
 */
function DelayStepEditContent({ node, dto, onChange }: RenderContentParams<DelayStepDto>) {
    const [timeSpan, setTimeSpan] = useState(dto.timeSpan);

    // Синхронизация с внешним dto (когда модалка открывается заново)
    useEffect(() => {
        console.log('[DelayStepEditContent] dto changed, syncing timeSpan:', dto.timeSpan);
        setTimeSpan(dto.timeSpan);
    }, [dto.timeSpan]);

    const handleTimeSpanChange = (newTimeSpan: string) => {
        console.log('[DelayStepEditContent] timeSpan changed - RAW from input:', newTimeSpan);

        // Конвертируем миллисекунды в .NET TimeSpan формат
        const ms = parseDurationToMs(newTimeSpan);
        console.log('[DelayStepEditContent] Parsed to milliseconds:', ms);

        const netTimeSpan = formatMsToNetTimeSpan(ms);
        console.log('[DelayStepEditContent] Formatted to .NET TimeSpan:', netTimeSpan);

        setTimeSpan(newTimeSpan);
        onChange({ timeSpan: netTimeSpan });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>
            {/* Базовые поля шага (name, description, taskQueue, defaultInput/Output, x, y, width, height, relations) */}
            <StepBaseFieldsEditor
                dto={dto}
                onChange={onChange}
                basicInfoGroup="delayStepBasicInfo"
                ioDataGroup="delayStepIOData"
                geometryGroup="delayStepGeometry"
                relationsGroup="delayStepRelations"
            />

            {/* Специфичные для DelayStep поля */}
            <Block
                group="delayStepTimeSettings"
                label="Настройки задержки"
                description="Длительность задержки выполнения"
                mode="wrap"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: 500, fontSize: '14px' }}>
                        Время задержки
                    </label>
                    <DelayTimeInput
                        id={`delay-time-input-edit-${node.id}`}
                        value={timeSpan}
                        onChange={handleTimeSpanChange}
                        minMs={0}
                        maxMs={Number.MAX_SAFE_INTEGER}
                    />
                    <span style={{ fontSize: '12px', color: '#666' }}>
                        Укажите время, на которое будет задержано выполнение следующего шага
                    </span>
                </div>
            </Block>
        </div>
    );
}

/**
 * Контракт редактирования для Delay Step (Задержка)
 */
export const DelayStepEditContract: NodeEditContract<DelayStepDto> = {
    title: 'Редактирование шага задержки',
    width: 700,

    renderContent: (params) => <DelayStepEditContent {...params} />,

    validate: (dto) => {
        const errors: string[] = [];

        if (!dto.name || dto.name.trim().length === 0) {
            errors.push('Название шага не может быть пустым');
        }

        if (!dto.timeSpan || dto.timeSpan.trim().length === 0) {
            errors.push('Время задержки должно быть указано');
        }

        // Валидация JSON для defaultInput
        if (dto.defaultInput && dto.defaultInput.trim().length > 0) {
            try {
                JSON.parse(dto.defaultInput);
            } catch (e) {
                errors.push('Входные данные должны быть валидным JSON');
            }
        }

        // Валидация JSON для defaultOutput
        if (dto.defaultOutput && dto.defaultOutput.trim().length > 0) {
            try {
                JSON.parse(dto.defaultOutput);
            } catch (e) {
                errors.push('Выходные данные должны быть валидным JSON');
            }
        }

        return errors;
    },
};
