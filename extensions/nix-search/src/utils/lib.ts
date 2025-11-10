import { useState, useEffect } from "react";

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

export interface Preferences {
  searchSize: string;
  branchName: string;
}

export interface OptionsSearchResult {
  id: string;
  name: string;
  description: string | null;
  type: string;
  default: string | null;
  declaredIn: string[] | null;
  example: string | null;
}
