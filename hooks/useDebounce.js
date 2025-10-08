// src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

/**
 * A custom hook that debounces a value.
 * @param {any} value The value to be debounced.
 * @param {number} delay The delay in milliseconds.
 * @returns {any} The debounced value.
 */
export const useDebounce = (value, delay) => {
    // State to store the debounced value
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set up a timer to update the debounced value after the specified delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clean up the timer if the value changes (e.g., user keeps typing)
        // or if the component unmounts. This is how we prevent the debounced
        // value from updating while the original value is still changing.
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Only re-call effect if value or delay changes

    return debouncedValue;
};