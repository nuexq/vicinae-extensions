import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@vicinae/api";
import { PkgsSearchResult } from "../search-nixpkgs";
import { OptionsSearchResult } from "../search-nixos-options";
import { SearchEnum, useDebouncedValue } from "./lib";

export function useSearch({
  searchText,
  type,
}: {
  searchText: string;
  type: SearchEnum;
}) {
  const { Packages } = SearchEnum;
  const { searchSize, branchName } = getPreferenceValues<Preferences>();
  const debouncedSearchText = useDebouncedValue(searchText, 300);

  const url = `https://search.nixos.org/backend/latest-44-nixos-${branchName}/_search`;

  const isPackageSearch = type === Packages;
  let queryFields = isPackageSearch ? [
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
  ] : [
    "option_name^6",
    "option_name.*^3.6",
    "option_description^1",
    "option_description.*^0.6",
    "option_flake^0.5",
    "option_flake.*^0.3",
  ];

  const reversedSearchText = [...debouncedSearchText].reverse().join("");

  const query = {
    size: Math.max(1, Number(searchSize) || 10),
    query: {
      bool: {
        filter: [{ term: { type: { value: isPackageSearch ? "package" : "option" } } }],
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
                isPackageSearch
                  ? { wildcard: { package_attr_name: { value: `*${debouncedSearchText}*` } } }
                  : {
                    wildcard: {
                      option_name: { value: `*${debouncedSearchText}*`, case_insensitive: true },
                    },
                  },
              ],
            },
          },
        ],
      },
    },
    sort: isPackageSearch
      ? [{ _score: "desc" }, { package_attr_name: "desc" }, { package_pversion: "desc" }]
      : [{ _score: "desc" }, { option_name: "desc" }],
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

      return json.hits.hits.map(({ _source, _id }: any) => {
        if (isPackageSearch) {
          return {
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
          } as PkgsSearchResult;
        }
        return {
          id: _id,
          name: _source.option_name,
          description: _source.option_description,
          type: _source.option_type,
          default: _source.option_default,
          declaredIn: _source.option_source,
          example: _source.option_example,
        } as OptionsSearchResult;
      });
    },
    initialData: [],
    execute: debouncedSearchText.trim().length >= 2,
    failureToastOptions: { title: "Could not perform search" },
  });

  return { isLoading, results: debouncedSearchText.length ? data : [] };
}

interface Preferences {
  searchSize: string;
  branchName: string;
}

