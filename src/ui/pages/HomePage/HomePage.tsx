
import styles from './HomePage.module.css'
import ScenarioCreatePage from "@/features/scenarioEditor/ui/ScenarioEditorPage/ScenarioEditorPage.tsx";
export const HomePage = () => {
    return (
        <div className={styles.homePageContainer}>
            <ScenarioCreatePage />
        </div>
    )
}
