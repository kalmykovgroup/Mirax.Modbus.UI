// src/features/chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers.ts
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

/**
 * Типы сортировки для испытаний
 */
export const TechnicalRunSortType = {
    DATE_START_ASC: 'dateStartAsc',
    DATE_START_DESC: 'dateStartDesc',
    DATE_END_ASC: 'dateEndAsc',
    DATE_END_DESC: 'dateEndDesc',
    NAME_ASC: 'nameAsc',
    NAME_DESC: 'nameDesc',
    DURATION_ASC: 'durationAsc',
    DURATION_DESC: 'durationDesc',
} as const;

export type TechnicalRunSortType =
    (typeof TechnicalRunSortType)[keyof typeof TechnicalRunSortType];

/**
 * Метаданные для типов сортировки
 */
export interface TechnicalRunSortOption {
    readonly value: TechnicalRunSortType;
    readonly label: string;
}

export const TECHNICAL_RUN_SORT_OPTIONS: readonly TechnicalRunSortOption[] = [
    { value: TechnicalRunSortType.DATE_START_DESC, label: 'Дата начала: сначала новые' },
    { value: TechnicalRunSortType.DATE_START_ASC, label: 'Дата начала: сначала старые' },
    { value: TechnicalRunSortType.DATE_END_DESC, label: 'Дата окончания: сначала новые' },
    { value: TechnicalRunSortType.DATE_END_ASC, label: 'Дата окончания: сначала старые' },
    { value: TechnicalRunSortType.NAME_ASC, label: 'Имя: А → Я' },
    { value: TechnicalRunSortType.NAME_DESC, label: 'Имя: Я → А' },
    { value: TechnicalRunSortType.DURATION_ASC, label: 'Длительность: короткие → длинные' },
    { value: TechnicalRunSortType.DURATION_DESC, label: 'Длительность: длинные → короткие' },
] as const;

/**
 * Сортировка испытаний
 */
export function sortTechnicalRuns(
    runs: readonly TechnicalRunDto[],
    sortType: TechnicalRunSortType
): readonly TechnicalRunDto[] {
    const sorted = [...runs];

    switch (sortType) {
        case TechnicalRunSortType.DATE_START_ASC:
            return sorted.sort((a, b) => {
                const dateA = new Date(a.dateStarTime).getTime();
                const dateB = new Date(b.dateStarTime).getTime();
                return dateA - dateB;
            });

        case TechnicalRunSortType.DATE_START_DESC:
            return sorted.sort((a, b) => {
                const dateA = new Date(a.dateStarTime).getTime();
                const dateB = new Date(b.dateStarTime).getTime();
                return dateB - dateA;
            });

        case TechnicalRunSortType.DATE_END_ASC:
            return sorted.sort((a, b) => {
                const dateA = new Date(a.dateEndTime).getTime();
                const dateB = new Date(b.dateEndTime).getTime();
                return dateA - dateB;
            });

        case TechnicalRunSortType.DATE_END_DESC:
            return sorted.sort((a, b) => {
                const dateA = new Date(a.dateEndTime).getTime();
                const dateB = new Date(b.dateEndTime).getTime();
                return dateB - dateA;
            });

        case TechnicalRunSortType.NAME_ASC:
            return sorted.sort((a, b) => {
                const nameA = a.name ?? '';
                const nameB = b.name ?? '';
                return nameA.localeCompare(nameB, 'ru', { numeric: true, sensitivity: 'base' });
            });

        case TechnicalRunSortType.NAME_DESC:
            return sorted.sort((a, b) => {
                const nameA = a.name ?? '';
                const nameB = b.name ?? '';
                return nameB.localeCompare(nameA, 'ru', { numeric: true, sensitivity: 'base' });
            });

        case TechnicalRunSortType.DURATION_ASC:
            return sorted.sort((a, b) => {
                const durationA = calculateDuration(a);
                const durationB = calculateDuration(b);
                return durationA - durationB;
            });

        case TechnicalRunSortType.DURATION_DESC:
            return sorted.sort((a, b) => {
                const durationA = calculateDuration(a);
                const durationB = calculateDuration(b);
                return durationB - durationA;
            });

        default: {
            const exhaustiveCheck: never = sortType;
            throw new Error(`Неизвестный тип сортировки: ${exhaustiveCheck}`);
        }
    }
}


/**
 * Типы сортировки для устройств
 */
export const DeviceSortType = {
    FACTORY_NUMBER_ASC: 'factoryNumberAsc',
    FACTORY_NUMBER_DESC: 'factoryNumberDesc',
    NAME_ASC: 'nameAsc',
    NAME_DESC: 'nameDesc',
} as const;

export type DeviceSortType = (typeof DeviceSortType)[keyof typeof DeviceSortType];

/**
 * Метаданные для типов сортировки устройств
 */
export interface DeviceSortOption {
    readonly value: DeviceSortType;
    readonly label: string;
}

export const DEVICE_SORT_OPTIONS: readonly DeviceSortOption[] = [
    { value: DeviceSortType.FACTORY_NUMBER_ASC, label: 'Заводской номер: по возрастанию' },
    { value: DeviceSortType.FACTORY_NUMBER_DESC, label: 'Заводской номер: по убыванию' },
    { value: DeviceSortType.NAME_ASC, label: 'Имя: А → Я' },
    { value: DeviceSortType.NAME_DESC, label: 'Имя: Я → А' },
] as const;

/**
 * Сортировка устройств
 */
export function sortDevices(
    devices: readonly PortableDeviceDto[],
    sortType: DeviceSortType
): readonly PortableDeviceDto[] {
    const sorted = [...devices];

    switch (sortType) {
        case DeviceSortType.FACTORY_NUMBER_ASC:
            return sorted.sort((a, b) => {
                const factoryA = a.factoryNumber ?? '';
                const factoryB = b.factoryNumber ?? '';

                // Устройства без номера в конец
                if (!factoryA && factoryB) return 1;
                if (factoryA && !factoryB) return -1;
                if (!factoryA && !factoryB) return 0;

                // Попытка числовой сортировки
                const numA = parseInt(factoryA, 10);
                const numB = parseInt(factoryB, 10);

                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }

                // Алфавитная сортировка
                return factoryA.localeCompare(factoryB, 'ru', {
                    numeric: true,
                    sensitivity: 'base',
                });
            });

        case DeviceSortType.FACTORY_NUMBER_DESC:
            return sorted.sort((a, b) => {
                const factoryA = a.factoryNumber ?? '';
                const factoryB = b.factoryNumber ?? '';

                // Устройства без номера в конец
                if (!factoryA && factoryB) return 1;
                if (factoryA && !factoryB) return -1;
                if (!factoryA && !factoryB) return 0;

                // Попытка числовой сортировки
                const numA = parseInt(factoryA, 10);
                const numB = parseInt(factoryB, 10);

                if (!isNaN(numA) && !isNaN(numB)) {
                    return numB - numA;
                }

                // Алфавитная сортировка
                return factoryB.localeCompare(factoryA, 'ru', {
                    numeric: true,
                    sensitivity: 'base',
                });
            });

        case DeviceSortType.NAME_ASC:
            return sorted.sort((a, b) => {
                const nameA = a.name ?? '';
                const nameB = b.name ?? '';

                // Устройства без имени в конец
                if (!nameA && nameB) return 1;
                if (nameA && !nameB) return -1;
                if (!nameA && !nameB) return 0;

                return nameA.localeCompare(nameB, 'ru', { numeric: true, sensitivity: 'base' });
            });

        case DeviceSortType.NAME_DESC:
            return sorted.sort((a, b) => {
                const nameA = a.name ?? '';
                const nameB = b.name ?? '';

                // Устройства без имени в конец
                if (!nameA && nameB) return 1;
                if (nameA && !nameB) return -1;
                if (!nameA && !nameB) return 0;

                return nameB.localeCompare(nameA, 'ru', { numeric: true, sensitivity: 'base' });
            });

        default: {
            const exhaustiveCheck: never = sortType;
            throw new Error(`Неизвестный тип сортировки устройств: ${exhaustiveCheck}`);
        }
    }
}