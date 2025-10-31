import styles from "./ScenarioItem.module.css"
import  {ScenarioLoadStatus} from "@scenario/store/scenarioSlice.ts";
import {useSelector} from "react-redux";
import type {RootState} from "@/baseStore/store.ts";
import {selectScenarioStatus} from "@scenario/store/scenarioSelectors.ts";
import React, {useCallback, useMemo} from "react";
import {RotateCw} from "lucide-react";
import {SimpleMenu} from "@scenario/core/ui/ScenarioMap/components/ScenarioPanel/HoverActionMenu/SimpleMenu.tsx";

interface ScenarioItemProps {
    scenarioId: string;
    title: string;
    isActive: boolean;
    isLoading: boolean;
    isRefreshing: boolean;
    onSelect: (id: string, status: ScenarioLoadStatus) => void;
    onRefresh: (id: string, event: React.MouseEvent) => void;
    onPlay: (id: string) => void;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
    onCancel: (id: string) => void;
    onTerminate: (id: string) => void;
}

export function ScenarioItem({
                          scenarioId,
                          title,
                          isActive,
                          isLoading,
                          isRefreshing,
                          onSelect,
                          onRefresh,
                          onPlay,
                          onPause,
                          onResume,
                          onCancel,
                          onTerminate,
                      }: ScenarioItemProps){
    const status = useSelector((state: RootState) => selectScenarioStatus(state, scenarioId));

    const statusIcon = useMemo(() => {
        if (isLoading || isRefreshing) return '⏳ ';
        switch (status) {
            case ScenarioLoadStatus.Loading:
                return '⏳ ';
            case ScenarioLoadStatus.Error:
                return '❌ ';
            case ScenarioLoadStatus.Loaded:
                return '✅ ';
            default:
                return '';
        }
    }, [status, isLoading, isRefreshing]);

    const handleClick = useCallback(() => {
        if (!isLoading && !isRefreshing) {
            onSelect(scenarioId, status);
        }
    }, [isLoading, isRefreshing, onSelect, scenarioId, status]);

    return (
        <div
            className={`${styles.scenarioItem} ${isActive ? styles.itemActive : ''} ${
                isLoading ? styles.itemLoading : ''
            }`}
            onClick={handleClick}
            title={title}
        >
            <div className={styles.itemTitle}>
                {statusIcon}
                {title}
            </div>

            <button
                className={`${styles.refreshBtn} ${isRefreshing ? styles.refreshBtnLoading : ''}`}
                title="Принудительно обновить"
                onClick={(e) => onRefresh(scenarioId, e)}
                disabled={isRefreshing}
            >
                <RotateCw size={14} />
            </button>

            <SimpleMenu
                label="Действия"
                placement="bottom"
                onAction={(action) => {
                    switch (action) {
                        case 'play':
                            onPlay(scenarioId);
                            break;
                        case 'pause':
                            onPause(scenarioId);
                            break;
                        case 'resume':
                            onResume(scenarioId);
                            break;
                        case 'cancel':
                            onCancel(scenarioId);
                            break;
                        case 'terminated':
                            onTerminate(scenarioId);
                            break;
                    }
                }}
            />
        </div>
    );
}