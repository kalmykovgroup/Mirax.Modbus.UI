// src/features/mirax/utils/miraxHelpers.ts
import type { TechnicalRunDto } from '@chartsPage/charts/mirax/contracts/TechnicalRunDto';
import type { PortableDeviceDto } from '@chartsPage/charts/mirax/contracts/PortableDeviceDto';

/**
 * Форматирование даты испытания
 */
export function formatTechnicalRunDate(dateString: string): string {
    try {
        return new Date(dateString).toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateString;
    }
}

/**
 * Получить отображаемое имя устройства
 */
export function getDeviceDisplayName(device: PortableDeviceDto): string {
    if (device.name) return device.name;
    if (device.factoryNumber) return `Устройство ${device.factoryNumber}`;
    return `Безымянное устройство ID: ${device.id}`;
}

/**
 * Проверить, нужна ли кнопка копирования ID
 */
export function shouldShowCopyId(device: PortableDeviceDto): boolean {
    return !device.name && !device.factoryNumber;
}

/**
 * Вычисление длительности испытания
 */
export function calculateDuration(run: TechnicalRunDto): number {
    const start = new Date(run.dateStarTime).getTime();
    const end = new Date(run.dateEndTime).getTime();
    return end - start;
}

/**
 * Форматирование длительности
 */
export function formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ч ${minutes}м`;
}

/**
 * Сортировка устройств по заводскому номеру
 */
export function sortDevicesByFactoryNumber(
    devices: readonly PortableDeviceDto[]
): readonly PortableDeviceDto[] {
    return [...devices].sort((a, b) => {
        const factoryA = a.factoryNumber ?? '';
        const factoryB = b.factoryNumber ?? '';

        if (!factoryA && factoryB) return 1;
        if (factoryA && !factoryB) return -1;
        if (!factoryA && !factoryB) return 0;

        const numA = parseInt(factoryA, 10);
        const numB = parseInt(factoryB, 10);

        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }

        return factoryA.localeCompare(factoryB, 'ru', { numeric: true, sensitivity: 'base' });
    });
}