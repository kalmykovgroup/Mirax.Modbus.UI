
import styles from './HomePage.module.css'
import ScenarioCreatePage from "@/features/scenarioEditor/ui/ScenarioEditorPage/ScenarioEditorPage.tsx";
import {useContext} from "react";
import {ThemeContext} from "@app/providers/theme/ThemeProvider.tsx";
export const HomePage = () => {
    const { theme } = useContext(ThemeContext);
    return (
        <div className={styles.homePageContainer} data-theme={theme}>
            <ScenarioCreatePage />
        </div>
    )
}
