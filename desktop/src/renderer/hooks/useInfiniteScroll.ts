import { useState, useEffect, useCallback } from 'react'

interface UseInfiniteScrollOptions {
    threshold: number // 0.8 for 80% threshold
    onLoadMore: () => void
    hasMore: boolean
    loading: boolean
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions) {
    const [isFetching, setIsFetching] = useState(false)

    const handleScroll = useCallback(() => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight

        if (scrollPercentage >= options.threshold && options.hasMore && !options.loading && !isFetching) {
            console.log('Infinite scroll triggered at', Math.round(scrollPercentage * 100) + '%')
            setIsFetching(true)
            options.onLoadMore()
        }
    }, [options.threshold, options.hasMore, options.loading, options.onLoadMore, isFetching])

    // Debounce scroll events for performance
    const debounce = (func: Function, wait: number) => {
        let timeout: NodeJS.Timeout
        return (...args: any[]) => {
            clearTimeout(timeout)
            timeout = setTimeout(() => func.apply(null, args), wait)
        }
    }

    const debouncedHandleScroll = useCallback(debounce(handleScroll, 100), [handleScroll])

    useEffect(() => {
        window.addEventListener('scroll', debouncedHandleScroll)
        return () => window.removeEventListener('scroll', debouncedHandleScroll)
    }, [debouncedHandleScroll])

    useEffect(() => {
        if (!options.loading && isFetching) {
            setIsFetching(false)
        }
    }, [options.loading, isFetching])

    return { isFetching, setIsFetching }
}
