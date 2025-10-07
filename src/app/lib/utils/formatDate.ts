export function formatRuDateTime(d: number): string {
    if (isNaN(d)) return '—';

    const s = new Intl.DateTimeFormat('ru-RU', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);

    // Убираем "г." и выравниваем запятые/пробелы
    return s.replace(/\s?г\./g, '').replace(/\s*,\s*/g, ', ');
}