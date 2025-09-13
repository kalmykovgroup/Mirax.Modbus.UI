import { NavLink } from "react-router-dom";
import styles from "./TopNav.module.css";
import {ROUTES} from "@app/constants/routes.ts";

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
    return (
        <header className={styles.bar}>
            <div className={styles.container}>
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
        </header>
    );
}
