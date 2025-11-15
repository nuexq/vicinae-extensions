import { useFetch } from "@raycast/utils";
import { useDebouncedValue } from "./lib";

type SearchType = "packages" | "options";

const FIELDS = {
  packages: [
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
  ],
  options: [
    "option_name^6",
    "option_name.*^3.6",
    "option_description^1",
    "option_description.*^0.6",
    "option_flake^0.5",
    "option_flake.*^0.3",
  ],
};

function buildQuery({
  text,
  type,
  searchSize,
}: {
  text: string;
  type: SearchType;
  searchSize: number;
}) {
  const reversed = [...text].reverse().join("");
  const fields = FIELDS[type];
  const baseWildcard =
    type === "packages" ? "package_attr_name" : "option_name";

  const multiMatch = (query: string) => ({
    multi_match: {
      type: "cross_fields",
      query,
      analyzer: "whitespace",
      auto_generate_synonyms_phrase_query: false,
      operator: "and",
      fields,
    },
  });

  return {
    size: Math.max(1, searchSize || 10),
    query: {
      bool: {
        filter: [
          {
            term: {
              type: { value: type === "packages" ? "package" : "option" },
            },
          },
        ],
        must: [
          {
            dis_max: {
              tie_breaker: 0.7,
              queries: [
                multiMatch(text),
                multiMatch(reversed),
                {
                  wildcard: {
                    [baseWildcard]: {
                      value: `*${text}*`,
                      ...(type === "options" && { case_insensitive: true }),
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
    sort:
      type === "packages"
        ? [
          { _score: "desc" },
          { package_attr_name: "desc" },
          { package_pversion: "desc" },
        ]
        : [{ _score: "desc" }, { option_name: "desc" }],
  };
}

async function parseResponse(
  response: Response,
  isPackageSearch: boolean,
  branchName: string,
) {
  const json = await response.json();
  if (!response.ok || json.error || json.code) {
    throw new Error(json.message || json.error?.reason || response.statusText);
  }

  return json.hits.hits.map(({ _source, _id }: any) => {
    if (isPackageSearch) {
      const src = _source;
      return {
        id: _id,
        name: src.package_pname,
        attrName: src.package_attr_name,
        description: src.package_description,
        version: src.package_pversion,
        homepage: src.package_homepage,
        outputs: src.package_outputs,
        defaultOutput: src.package_default_output,
        platforms: src.package_platforms.filter((p: string) =>
          [
            "x86_64-linux",
            "aarch64-linux",
            "i686-linux",
            "x86_64-darwin",
            "aarch64-darwin",
          ].includes(p),
        ),
        source:
          src.package_position &&
          `https://github.com/NixOS/nixpkgs/blob/${branchName === "unstable" ? "master" : `release-${branchName}`}/${src.package_position.replace(/:([0-9]+)$/, "")}`,
        licenses: (src.package_license_set || []).map((name: string) => ({
          name,
          url: null,
        })),
      };
    }

    const src = _source;
    return {
      id: _id,
      name: src.option_name,
      description: src.option_description,
      type: src.option_type,
      default: src.option_default,
      declaredIn: src.option_source,
      example: src.option_example,
    };
  });
}

export function useSearch({
  searchText,
  type,
  searchSize,
  branchName,
}: {
  searchText: string;
  type: SearchType;
  searchSize: number;
  branchName: string;
}) {
  const debounced = useDebouncedValue(searchText, 300);

  const query = buildQuery({
    text: debounced,
    type,
    searchSize,
  });

  const url = `https://search.nixos.org/backend/latest-44-nixos-${branchName}/_search`;

  const { isLoading, data } = useFetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa("aWVSALXpZv:X8gPHnzL52wFEekuxsfQ9cSh"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
    parseResponse: (r) => parseResponse(r, type === "packages", branchName),
    initialData: [],
    execute: debounced.trim().length >= 2,
    failureToastOptions: { title: "Could not perform search" },
  });

  return { isLoading, results: debounced ? data : [] };
}
