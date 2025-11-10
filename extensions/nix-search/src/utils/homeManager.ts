import { useFetch } from "@raycast/utils";
import { OptionsSearchResult, useDebouncedValue } from "./lib";
import { useEffect, useState } from "react";

export function useRawHomeManagerOptions(branchName: string) {
  const url = `https://home-manager-options.extranix.com/data/options-${branchName}.json`;
  const { data, isLoading } = useFetch(url, {
    parseResponse: async (res) => (await res.json()).options,
    initialData: [],
  });

  return { rawOptions: data, isLoading };
}

export function useFilteredHomeManagerOptions(
  searchText: string,
  rawOptions: any[],
  searchSize: number,
) {
  const debounced = useDebouncedValue(searchText, 300);
  const [results, setResults] = useState<OptionsSearchResult[]>([]);

  useEffect(() => {
    if (!rawOptions || debounced.trim() === "") {
      setResults([]);
      return;
    }

    const lower = debounced.toLowerCase();

    const filtered = rawOptions
      .filter(
        (opt: any) =>
          opt.title.toLowerCase().includes(lower) ||
          (opt.description?.toLowerCase().includes(lower) ?? false)
      )
      .slice(0, searchSize)
      .map((opt: any, index: number): OptionsSearchResult => ({
        id: String(index),
        name: opt.title,
        description: opt.description || null,
        type: opt.type,
        default: opt.default || null,
        declaredIn: opt.declarations?.map((d: any) => d.name).filter(Boolean) || null,
        example: opt.example || null,
      }));

    setResults(filtered);
  }, [rawOptions, debounced, searchSize]);

  return results;
}
