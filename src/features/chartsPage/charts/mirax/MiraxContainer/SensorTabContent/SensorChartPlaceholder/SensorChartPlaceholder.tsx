// src/features/mirax/components/SensorTabContent/SensorChartPlaceholder/SensorChartPlaceholder.tsx
import type { JSX } from 'react';

import styles from './SensorChartPlaceholder.module.css';
import type { TechnicalRunDto } from '@chartsPage/charts/mirax/contracts/TechnicalRunDto.ts';
import type { PortableDeviceDto } from '@chartsPage/charts/mirax/contracts/PortableDeviceDto.ts';
import type { SensorDto } from '@chartsPage/charts/mirax/contracts/SensorDto.ts';
import {formatTechnicalRunDate} from "@chartsPage/charts/mirax/MiraxContainer/utils/miraxHelpers.ts";

interface Props {
    readonly technicalRun: TechnicalRunDto;
    readonly device: PortableDeviceDto;
    readonly sensor: SensorDto;
}

export function SensorChartPlaceholder({ technicalRun, device, sensor }: Props): JSX.Element {
    return (
        <div className={styles.container}>
            <div className={styles.placeholder}>
                <div className={styles.icon}>📊</div>
                <h4 className={styles.title}>Место для графиков</h4>
                <p className={styles.description}>
                    Здесь будут отображаться графики данных с сенсора
                </p>
            </div>

            <div className={styles.debugInfo}>
                <h5 className={styles.debugTitle}>Доступные данные:</h5>

                <div className={styles.debugSection}>
                    <h6 className={styles.debugSubtitle}>Испытание:</h6>
                    <dl className={styles.debugList}>
                        <dt>ID:</dt>
                        <dd className={styles.code}>{technicalRun.id}</dd>
                        <dt>Название:</dt>
                        <dd>{technicalRun.name ?? 'Без названия'}</dd>
                        <dt>Начало:</dt>
                        <dd>{formatTechnicalRunDate(technicalRun.dateStarTime)}</dd>
                        <dt>Окончание:</dt>
                        <dd>{formatTechnicalRunDate(technicalRun.dateEndTime)}</dd>
                    </dl>
                </div>

                <div className={styles.debugSection}>
                    <h6 className={styles.debugSubtitle}>Устройство:</h6>
                    <dl className={styles.debugList}>
                        <dt>ID:</dt>
                        <dd className={styles.code}>{device.id}</dd>
                        <dt>Название:</dt>
                        <dd>{device.name ?? 'Не указано'}</dd>
                        <dt>Заводской номер:</dt>
                        <dd>№{device.factoryNumber}</dd>
                    </dl>
                </div>

                <div className={styles.debugSection}>
                    <h6 className={styles.debugSubtitle}>Сенсор:</h6>
                    <dl className={styles.debugList}>
                        <dt>Газ:</dt>
                        <dd>{sensor.gas}</dd>
                        <dt>Канал:</dt>
                        <dd>{sensor.channelNumber}</dd>
                        {sensor.modification && (
                            <>
                                <dt>Модификация:</dt>
                                <dd>{sensor.modification}</dd>
                            </>
                        )}
                    </dl>
                </div>

                <div className={styles.note}>
                    <strong>Примечание:</strong> Все данные загружены и готовы для построения графиков
                </div>
            </div>
        </div>
    );
}