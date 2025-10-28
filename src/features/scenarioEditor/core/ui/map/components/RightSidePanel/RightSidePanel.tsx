// src/features/scenarioEditor/core/ui/map/RightSidePanel/RightSidePanel.tsx

import { useState } from 'react';
import { History, Plus } from 'lucide-react';

import styles from './RightSidePanel.module.css';

import { HistoryPanel } from '@scenario/core/ui/map/components/HistoryPanel/HistoryPanel.tsx';
import ScenarioPanel from "@scenario/core/ui/map/components/ScenarioPanel/ScenarioPanel.tsx";
import {NewNodesPanel} from "@scenario/core/ui/map/components/NewNodesPanel/NewNodesPanel.tsx";

type Tab = 'create' | 'history' | 'scenarios';


export function RightSidePanel() {
    const [activeTab, setActiveTab] = useState<Tab | null>(null);

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
                    className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
                    onClick={() => handleTabClick('history')}
                    title="История изменений"
                >
                    <History size={18} />
                    <span>История</span>
                </button>
            </div>

            {activeTab && (
                <div className={styles.content}>
                    {activeTab === 'scenarios' && <ScenarioPanel />}
                    {activeTab === 'create' && <NewNodesPanel />}
                    {activeTab === 'history' && <HistoryPanel />}
                </div>
            )}
        </div>
    );
}