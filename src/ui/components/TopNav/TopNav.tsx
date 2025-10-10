import { NavLink } from "react-router-dom";
import styles from "./TopNav.module.css";
import {ROUTES} from "@app/constants/routes.ts";
import {useTheme} from "@app/providers/theme/useTheme.ts";

type LinkItem = {
    to: "/" | "/charts" | "/error";
    label: string;
    /** Точное совпадение для корня — опционально, но строго true (не boolean) */
    end?: true;
};

const links: LinkItem[] = [
    { to: ROUTES.HOME, label: "Главная", end: true },
    { to: ROUTES.CHARTS, label: "Графики" },
] as const;

export default function TopNav() {

    const {theme} = useTheme();

    return (
        <nav className={styles.topNav} data-theme={theme}>
            <div className={styles.topNav__content}>
                <nav className={styles.nav} aria-label="Главная навигация">
                    {links.map(({ to, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            // ВАЖНО: не передаём undefined — либо end: true, либо ничего
                            {...(end ? { end: true } : {})}
                            className={({ isActive }) =>
                                isActive ? `${styles.link} ${styles.active}` : styles.link
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </nav>
    );
}
