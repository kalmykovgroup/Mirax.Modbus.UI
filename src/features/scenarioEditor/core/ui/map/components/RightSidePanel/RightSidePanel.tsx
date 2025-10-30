// src/features/scenarioEditor/core/ui/map/RightSidePanel/RightSidePanel.tsx

import { useState } from 'react';
import { Plus, Settings } from 'lucide-react';

import styles from './RightSidePanel.module.css';

import { HistoryPanel } from '@scenario/core/ui/map/components/HistoryPanel/HistoryPanel.tsx';
import ScenarioPanel from "@scenario/core/ui/map/components/ScenarioPanel/ScenarioPanel.tsx";
import {NewNodesPanel} from "@scenario/core/ui/map/components/NewNodesPanel/NewNodesPanel.tsx";
import { SettingsPanel } from '@scenario/core/ui/map/components/SettingsPanel';

type Tab = 'create' | 'settings' | 'scenarios';

interface RightSidePanelProps {
    activeTab?: Tab | null;
    onTabChange?: (tab: Tab | null) => void;
}

export function RightSidePanel({ activeTab: externalActiveTab, onTabChange }: RightSidePanelProps = {}) {
    const [internalActiveTab, setInternalActiveTab] = useState<Tab | null>(null);

    // Используем внешнее состояние, если оно передано, иначе внутреннее
    const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
    const setActiveTab = onTabChange || setInternalActiveTab;

    const handleTabClick = (tab: Tab) => {
        setActiveTab((current) => (current === tab ? null : tab));
    };

    return (
        <div className={styles.rightSidePanelContainer}>
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'scenarios' ? styles.active : ''}`}
                    onClick={() => handleTabClick('scenarios')}
                    title="Сценарии"
                >
                    <Plus size={18} />
                    <span>Сценарии</span>
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'create' ? styles.active : ''}`}
                    onClick={() => handleTabClick('create')}
                    title="Создание элементов"
                >
                    <Plus size={18} />
                    <span>Создание</span>
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
                    onClick={() => handleTabClick('settings')}
                    title="Настройки"
                >
                    <Settings size={18} />
                    <span>Настройки</span>
                </button>
            </div>

            {activeTab && (
                <div className={styles.content}>
                    {activeTab === 'scenarios' && <ScenarioPanel />}
                    {activeTab === 'create' && <NewNodesPanel />}
                    {activeTab === 'settings' && <SettingsPanel />}
                </div>
            )}
        </div>
    );
}
