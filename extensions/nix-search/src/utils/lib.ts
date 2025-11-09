import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

export function useSearch({
  url,
  searchText,
  searchSize,
}: {
  url: string;
  searchText: string;
  searchSize: number;
}) {
  const debouncedSearchText = useDebouncedValue(searchText, 300);

  const queryFields = [
    "package_attr_name^9",
    "package_attr_name.*^5.4",
    "package_programs^9",
    "package_programs.*^5.4",
    "package_pname^6",
    "package_pname.*^3.6",
    "package_description^1.3",
    "package_description.*^0.78",
    "package_longDescription^1",
    "package_longDescription.*^0.6",
    "flake_name^0.5",
    "flake_name.*^0.3",
  ];

  const reversedSearchText = [...debouncedSearchText].reverse().join("");

  const query = {
    size: searchSize,
    query: {
      bool: {
        filter: [{ term: { type: { value: "package" } } }],
        must: [
          {
            dis_max: {
              tie_breaker: 0.7,
              queries: [
                {
                  multi_match: {
                    type: "cross_fields",
                    query: debouncedSearchText,
                    analyzer: "whitespace",
                    auto_generate_synonyms_phrase_query: false,
                    operator: "and",
                    fields: queryFields,
                  },
                },
                {
                  multi_match: {
                    type: "cross_fields",
                    query: reversedSearchText,
                    analyzer: "whitespace",
                    auto_generate_synonyms_phrase_query: false,
                    operator: "and",
                    fields: queryFields,
                  },
                },
                { wildcard: { package_attr_name: { value: `*${debouncedSearchText}*` } } },
              ],
            },
          },
        ],
      },
    },
    sort: [{ _score: "desc" }, { package_attr_name: "desc" }, { package_pversion: "desc" }],
  };

  const { isLoading, data } = useFetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa("aWVSALXpZv:X8gPHnzL52wFEekuxsfQ9cSh"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
    async parseResponse(response) {
      const json = await response.json();

      if ("code" in json) throw new Error(json.message);
      if ("error" in json) throw new Error(json.error.reason);
      if (!response.ok) throw new Error(response.statusText);

      return json.hits.hits.map(({ _source, _id }: any) => ({
        id: _id,
        name: _source.package_pname,
        attrName: _source.package_attr_name,
        description: _source.package_description,
        version: _source.package_pversion,
        homepage: _source.package_homepage,
        outputs: _source.package_outputs,
        defaultOutput: _source.package_default_output,
        platforms: _source.package_platforms.filter((p: string) =>
          ["x86_64-linux", "aarch64-linux", "i686-linux", "x86_64-darwin", "aarch64-darwin"].includes(p)
        ),
        source:
          _source.package_position &&
          `https://github.com/NixOS/nixpkgs/blob/unstable/${_source.package_position.replace(/:([0-9]+)$/, "")}`,
        licenses: (_source.package_license_set || []).map((name: string) => ({ name, url: null })),
      }));
    },
    initialData: [],
    execute: Boolean(debouncedSearchText.length),
    failureToastOptions: { title: "Could not perform search" },
  });

  return { isLoading, results: !debouncedSearchText.length ? [] : data };
}

