import React, { useState } from 'react';
import { Play, Pause, RotateCcw, XCircle, AlertTriangle, Info } from 'lucide-react';
import styles from './ScenarioControlPanel.module.css';
import type { RunningScenarioData } from '@scenario/shared/contracts/server/localDtos/ScenarioEngine/RunningScenarioData.ts';

export interface ScenarioControlPanelProps {
    scenarioId: string;
    scenarioTitle?: string | undefined;
    isRunning: boolean;
    isPaused: boolean;
    runningData: RunningScenarioData | null;
    onPlay: (id: string) => void;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
    onCancel: (id: string) => void;
    onTerminate: (id: string) => void;
}

export const ScenarioControlPanel: React.FC<ScenarioControlPanelProps> = ({
    scenarioId,
    scenarioTitle,
    isRunning,
    isPaused,
    runningData,
    onPlay,
    onPause,
    onResume,
    onCancel,
    onTerminate,
}) => {
    const [showInfo, setShowInfo] = useState(false);

    if (!scenarioId) {
        return null;
    }

    return (
        <div className={styles.container}>
            {scenarioTitle && (
                <div className={styles.title}>
                    {scenarioTitle}
                </div>
            )}

            <div className={styles.controls}>
                {/* Показываем Play только если сценарий НЕ запущен */}
                {!isRunning && (
                    <button
                        className={`${styles.btn} ${styles.btnPlay}`}
                        onClick={() => onPlay(scenarioId)}
                        title="Запустить сценарий"
                    >
                        <Play size={16} />
                        <span>Запустить</span>
                    </button>
                )}

                {/* Показываем Pause только если сценарий запущен и НЕ на паузе */}
                {isRunning && !isPaused && (
                    <button
                        className={`${styles.btn} ${styles.btnPause}`}
                        onClick={() => onPause(scenarioId)}
                        title="Приостановить выполнение"
                    >
                        <Pause size={16} />
                        <span>Пауза</span>
                    </button>
                )}

                {/* Показываем Resume только если сценарий запущен и на паузе */}
                {isRunning && isPaused && (
                    <button
                        className={`${styles.btn} ${styles.btnResume}`}
                        onClick={() => onResume(scenarioId)}
                        title="Продолжить выполнение"
                    >
                        <RotateCcw size={16} />
                        <span>Продолжить</span>
                    </button>
                )}

                {/* Показываем Cancel и Terminate только если сценарий запущен */}
                {isRunning && (
                    <>
                        <button
                            className={`${styles.btn} ${styles.btnCancel}`}
                            onClick={() => onCancel(scenarioId)}
                            title="Отменить выполнение"
                        >
                            <XCircle size={16} />
                            <span>Отменить</span>
                        </button>

                        <button
                            className={`${styles.btn} ${styles.btnTerminate}`}
                            onClick={() => onTerminate(scenarioId)}
                            title="Принудительно завершить"
                        >
                            <AlertTriangle size={16} />
                            <span>Завершить</span>
                        </button>

                        <button
                            className={`${styles.btn} ${styles.btnInfo}`}
                            onClick={() => setShowInfo(true)}
                            title="Информация о сценарии"
                        >
                            <Info size={16} />
                            <span>Инфо</span>
                        </button>
                    </>
                )}
            </div>

            {/* Модальное окно с информацией */}
            {showInfo && runningData && (
                <div className={styles.modal} onClick={() => setShowInfo(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Информация о запущенном сценарии</h3>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowInfo(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Workflow ID:</span>
                                <span className={styles.infoValue}>{runningData.workflowId}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Run ID:</span>
                                <span className={styles.infoValue}>{runningData.runId}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Scenario ID:</span>
                                <span className={styles.infoValue}>{runningData.scenarioId}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span className={styles.infoLabel}>Статус:</span>
                                <span className={styles.infoValue}>
                                    {isPaused ? 'На паузе' : 'Выполняется'}
                                </span>
                            </div>
                            {runningData.sessions && runningData.sessions.length > 0 && (
                                <div className={styles.sessionsSection}>
                                    <h4>Сессии устройств ({runningData.sessions.length})</h4>
                                    {runningData.sessions.map((session, idx) => (
                                        <div key={idx} className={styles.sessionItem}>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>Session ID:</span>
                                                <span className={styles.infoValue}>{session.sessionId}</span>
                                            </div>
                                            {session.deviceAddress && (
                                                <>
                                                    <div className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>Slave ID:</span>
                                                        <span className={styles.infoValue}>{session.deviceAddress.slaveId}</span>
                                                    </div>
                                                    <div className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>COM Port:</span>
                                                        <span className={styles.infoValue}>{session.deviceAddress.comPort}</span>
                                                    </div>
                                                    <div className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>Baud Rate:</span>
                                                        <span className={styles.infoValue}>{session.deviceAddress.baudRate}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
