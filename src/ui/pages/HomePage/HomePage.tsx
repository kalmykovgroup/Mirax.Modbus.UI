import { useSelector } from 'react-redux'
import styles from './HomePage.module.css'
import ScenarioCreatePage from "@app/scenario-designer/ScenarioEditorPage.tsx";
export const HomePage = () => {
    const username = useSelector((state: any) => state.auth.username)


    return (
        <div className={styles.container}>

            <h1 className={styles.welcome}>Добро пожаловать, {username}</h1>

            <ScenarioCreatePage />
        </div>
    )
}
