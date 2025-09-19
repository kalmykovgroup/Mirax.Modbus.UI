import { useState } from 'react';
import s from './SettingsBlock.module.css';
import Collapse from "@charts/ui/Collapse/Collapse.tsx";

export default function SettingsBlock({className}: {className? : string | undefined}   ) {
    const [open, setOpen] = useState(true);

    return (
        <section className={`${className} ${s.wrap}`}>
            <button
                type="button"
                className={s.toggle}
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                aria-controls="settings-panel"
            >
                {open ? 'Спрятать настройки' : 'Показать настройки'}
            </button>

            <Collapse open={open} duration={220} className={s.panel} >
                <div id="settings-panel" className={s.content}>
                    {/* ваши поля настроек */}
                    <div className={s.row}>
                        <label>Параметр A</label>
                        <input type="text" placeholder="..." />
                    </div>
                    <div className={s.row}>
                        <label>Параметр B</label>
                        <input type="number" />
                    </div>
                    <div className={s.row}>
                        <label>Параметр B</label>
                        <input type="number" />
                    </div>
                    <div className={s.row}>
                        <label>Параметр B</label>
                        <input type="number" />
                    </div>
                    <div className={s.row}>
                        <label>Параметр B</label>
                        <input type="number" />
                    </div>
                    <div className={s.row}>
                        <label>Параметр B</label>
                        <input type="number" />
                    </div>
                    <div className={s.row}>
                        <label>Параметр B</label>
                        <input type="number" />
                    </div>
                    <div className={s.row}>
                        <label>Параметр B</label>
                        <input type="number" />
                    </div>
                </div>
            </Collapse>
        </section>
    );
}
