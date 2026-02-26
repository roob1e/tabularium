import { useEffect, useRef, useState } from "react";

/**
 * Хук для динамической подсветки строк по поисковому запросу.
 * @param items - массив данных таблицы
 * @param searchQuery - строка поиска
 * @param matcher - функция, возвращающая true если запись подходит под запрос
 * @param tableRef - ref на контейнер таблицы для скролла
 */
export function useSearchHighlight<T extends { id: number }>(
    items: T[],
    searchQuery: string,
    matcher: (item: T, query: string) => boolean,
    tableRef: React.RefObject<HTMLDivElement | null>
) {
    const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set());
    const scrolledRef = useRef(false);

    useEffect(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            setHighlightedIds(new Set());
            scrolledRef.current = false;
            return;
        }

        const matched = items.filter(item => matcher(item, query));
        setHighlightedIds(new Set(matched.map(item => item.id)));

        // Скролл к первой найденной строке
        if (matched.length > 0) {
            scrolledRef.current = false;
            setTimeout(() => {
                if (scrolledRef.current) return;
                const firstId = matched[0].id;
                const row = tableRef.current?.querySelector(`[data-row-key="${firstId}"]`);
                if (row) {
                    row.scrollIntoView({ behavior: "smooth", block: "center" });
                    scrolledRef.current = true;
                }
            }, 50);
        } else {
            setHighlightedIds(new Set());
        }
    }, [searchQuery, items]);

    const getRowClassName = (record: T) =>
        highlightedIds.has(record.id) ? "row-highlighted" : "";

    return { highlightedIds, getRowClassName };
}