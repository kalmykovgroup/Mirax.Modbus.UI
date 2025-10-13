import type {useAppDispatch} from "@/store/hooks.ts";
import type {TechnicalRunDto} from "@chartsPage/mirax/contracts/TechnicalRunDto.ts";
import type {PortableDeviceDto} from "@chartsPage/mirax/contracts/PortableDeviceDto.ts";
import type {ChartReqTemplateDto} from "@chartsPage/template/shared/dtos/ChartReqTemplateDto.ts";
import {Guid} from "@app/lib/types/Guid.ts";
import {addContextToTab, createTab, setActiveTab} from "@chartsPage/charts/core/store/tabsSlice.ts";
import {resolveTemplateForServer} from "@chartsPage/template/ui/templateResolve.ts";
import type {ResolvedCharReqTemplate} from "@chartsPage/template/shared/dtos/ResolvedCharReqTemplate.ts";
import {createContext} from "@chartsPage/charts/core/store/chartsSlice.ts";
import type { SensorDto } from '@chartsPage/mirax/contracts/SensorDto';

/**
 * Метод для построения графиков: базовый шаблон + шаблоны для каждого сенсора
 */
export async function buildCharts(
    dispatch: ReturnType<typeof useAppDispatch>,
    technicalRun: TechnicalRunDto,
    device: PortableDeviceDto,
    sensors: readonly SensorDto[],
    allTemplates: readonly ChartReqTemplateDto[],
    defaultBaseTemplateId: string,
    defaultSensorTemplateId: string,
): Promise<void> {
    console.group('📊 Построение графиков для устройства');
    try {
        // 1. Получить дефолтные шаблоны по ID
        const baseTemplate = allTemplates.find(t => t.id === defaultBaseTemplateId);
        const sensorTemplate = allTemplates.find(t => t.id === defaultSensorTemplateId);

        if (!baseTemplate) {
            console.error(' Базовый шаблон не найден:', defaultBaseTemplateId);
            alert('Базовый шаблон не найден. Проверьте конфигурацию.');
            return;
        }

        if (!sensorTemplate) {
            console.error(' Шаблон сенсора не найден:', defaultSensorTemplateId);
            alert('Шаблон сенсора не найден. Проверьте конфигурацию.');
            return;
        }

        // 2. Получить параметры для заполнения шаблонов
        const deviceId = device.factoryNumber ?? '';
        const technicalRunToStartId = technicalRun.id;

        /* // 3. Получить временной диапазон из испытания
         const fromMs = technicalRun.dateStarTime
             ? new Date(technicalRun.dateStarTime).getTime()
             : Date.now() - 24 * 60 * 60 * 1000; // По умолчанию: последние 24 часа

         const toMs = technicalRun.dateEndTime
             ? new Date(technicalRun.dateEndTime).getTime()
             : Date.now();*/

        // 4. Создать новую вкладку
        const newTabId = Guid.NewGuid();
        dispatch(
            createTab({
                id: newTabId,
                name: `${device.name ?? 'Устройство'} - ${device.factoryNumber}`,
            })
        );
        dispatch(setActiveTab(newTabId));

        console.log(' Создана вкладка:', { tabId: newTabId });

        // 5. Запустить базовый шаблон (BatteryVoltage, BatteryLevel, Temperature)
        const baseParams = {
            deviceId,
            technicalRunToStartId,
        };

        const baseResolved = resolveTemplateForServer(baseTemplate, baseParams) as ResolvedCharReqTemplate;
        /*baseResolved.resolvedFromMs = fromMs;
        baseResolved.resolvedToMs = toMs;*/

        const baseContextId = Guid.NewGuid();
        dispatch(
            createContext({
                contextId: baseContextId,
                template: baseResolved,
            })
        );
        dispatch(addContextToTab({ tabId: newTabId, contextId: baseContextId }));

        console.log(' Базовый шаблон запущен:', {
            templateId: baseTemplate.id,
            templateName: baseTemplate.name,
            contextId: baseContextId,
            params: baseParams,
        });

        // 6. Запустить шаблоны для каждого сенсора (Concentration)
        for (const sensor of sensors) {
            const sensorParams = {
                deviceId,
                technicalRunToStartId,
                channelNumber: sensor.channelNumber ?? 0,
            };

            const sensorResolved = resolveTemplateForServer(
                sensorTemplate,
                sensorParams
            ) as ResolvedCharReqTemplate;
            /*sensorResolved.resolvedFromMs = fromMs;
            sensorResolved.resolvedToMs = toMs;*/

            // Изменяем имя шаблона для удобства (добавляем номер канала и газ)
            sensorResolved.name = `${sensorTemplate.name} - Канал ${sensor.channelNumber} (${sensor.gas ?? 'N/A'})`;

            const sensorContextId = Guid.NewGuid();
            dispatch(
                createContext({
                    contextId: sensorContextId,
                    template: sensorResolved,
                })
            );
            dispatch(addContextToTab({ tabId: newTabId, contextId: sensorContextId }));

            console.log(' Шаблон сенсора запущен:', {
                templateId: sensorTemplate.id,
                templateName: sensorResolved.name,
                contextId: sensorContextId,
                channelNumber: sensor.channelNumber,
                gas: sensor.gas,
            });
        }

        console.log('🎉 Все графики успешно созданы!');
        console.log('📈 Всего контекстов:', 1 + sensors.length);

    } catch (error) {
        console.error(' Ошибка при построении графиков:', error);
        alert('Ошибка при построении графиков. См. консоль для деталей.');
    } finally {
        console.groupEnd();
    }
}