// src/features/scenarioEditor/core/ui/map/RightSidePanel/RightSidePanel.tsx

import React, { useState, useEffect } from 'react';
import { Plus, Settings } from 'lucide-react';

import styles from './RightSidePanel.module.css';

import ScenarioPanel from "@scenario/core/ui/map/components/ScenarioPanel/ScenarioPanel.tsx";
import {NewNodesPanel} from "@scenario/core/ui/map/components/NewNodesPanel/NewNodesPanel.tsx";
import { SettingsPanel } from '@scenario/core/ui/map/components/SettingsPanel';
import { FitViewButton } from '@scenario/core/ui/map/components/FitViewButton';
import { FullscreenButton } from '@scenario/core/ui/map/components/FullscreenButton';

type Tab = 'create' | 'settings' | 'scenarios';

interface RightSidePanelProps {
    activeTab?: Tab | null;
    onTabChange?: (tab: Tab | null) => void;
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function RightSidePanel({
    activeTab: externalActiveTab,
    onTabChange,
    containerRef
}: RightSidePanelProps) {
    const [internalActiveTab, setInternalActiveTab] = useState<Tab | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [displayedTab, setDisplayedTab] = useState<Tab | null>(null);

    // Используем внешнее состояние, если оно передано, иначе внутреннее
    const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;

    useEffect(() => {
        if (activeTab === displayedTab) {
            // Вкладка не изменилась
            return undefined;
        }

        if (activeTab && displayedTab && activeTab !== displayedTab) {
            // Переключение между вкладками - сначала закрываем текущую
            setIsClosing(true);
            const timer = setTimeout(() => {
                setDisplayedTab(activeTab);
                setIsClosing(false);
            }, 300); // Длительность анимации закрытия
            return () => clearTimeout(timer);
        } else if (activeTab && !displayedTab) {
            // Открываем новую вкладку (не было открытых)
            setIsClosing(false);
            setDisplayedTab(activeTab);
        } else if (!activeTab && displayedTab) {
            // Закрываем текущую вкладку
            setIsClosing(true);
            const timer = setTimeout(() => {
                setDisplayedTab(null);
                setIsClosing(false);
            }, 300); // Длительность анимации
            return () => clearTimeout(timer);
        }

        return undefined;

    }, [activeTab, displayedTab]);

    const handleTabClick = (tab: Tab) => {
        if (onTabChange) {
            // Внешнее управление состоянием
            const newTab = activeTab === tab ? null : tab;
            onTabChange(newTab);
        } else {
            // Внутреннее управление состоянием
            setInternalActiveTab((current) => (current === tab ? null : tab));
        }
    };

    return (
        <div className={styles.rightSidePanelContainer}>
            <div className={styles.tabsRow}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'scenarios' ? styles.active : ''}`}
                        onClick={() => handleTabClick('scenarios')}
                        title="Сценарии"
                    >
                        <span className={styles.btnScenarios}>Сценарии</span>
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'create' ? styles.active : ''}`}
                        onClick={() => handleTabClick('create')}
                        title="Создание элементов"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
                        onClick={() => handleTabClick('settings')}
                        title="Настройки"
                    >
                        <Settings size={18} />
                    </button>
                </div>

                <div className={styles.actionButtons}>
                    <FitViewButton />
                    {containerRef && <FullscreenButton targetRef={containerRef} />}
                </div>
            </div>

            {displayedTab && (
                <div className={`${styles.content} ${isClosing ? styles.closing : ''}`}>
                    {displayedTab === 'scenarios' && <ScenarioPanel />}
                    {displayedTab === 'create' && <NewNodesPanel />}
                    {displayedTab === 'settings' && <SettingsPanel />}
                </div>
            )}
        </div>
    );
}
