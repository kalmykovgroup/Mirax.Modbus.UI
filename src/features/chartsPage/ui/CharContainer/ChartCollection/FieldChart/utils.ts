
/**
 * Форматирует размер bucket в человекочитаемый вид
 */
export function formatBucketSize(bucketMs: number): string {
    const seconds = Math.floor(bucketMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} год${years > 1 ? 'а' : ''}`;
    if (months > 0) return `${months} мес.`;
    if (weeks > 0) return `${weeks} нед.`;
    if (days > 0) return `${days} д.`;
    if (hours > 0) return `${hours} ч.`;
    if (minutes > 0) return `${minutes} мин.`;
    if (seconds > 0) return `${seconds} сек.`;
    return `${bucketMs} мс`;
}

/**
 * Форматирует время в зависимости от размера bucket
 */
export function formatTimeByBucket(date: Date, bucketMs: number): string {
    const seconds = Math.floor(bucketMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        // Для дней и больше - показываем дату без времени
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } else if (hours > 0) {
        // Для часов - показываем дату и часы
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        // Для минут и секунд - полное время
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

