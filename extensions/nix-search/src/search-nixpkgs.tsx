import { URL } from "node:url";
import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
} from "@vicinae/api";
import { useState } from "react";
import type { Preferences } from "./utils/lib";
import { useSearch } from "./utils/search";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { searchSize, branchName } = getPreferenceValues<Preferences>();
  const { isLoading, results } = useSearch({
    searchText,
    type: "packages",
    searchSize: Number(searchSize),
    branchName,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search nix packages..."
      isShowingDetail
      searchText={searchText}
    >
      <List.Section title="Results" subtitle={`${results.length}`}>
        {results.map((searchResult: PkgsSearchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );

  function SearchListItem({
    searchResult,
  }: {
    searchResult: PkgsSearchResult;
  }) {
    return (
      <List.Item
        title={searchResult.attrName}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Package Attr Name"
                content={searchResult.attrName}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              {searchResult.homepage[0] && (
                <Action.OpenInBrowser
                  title="Open Package Homepage"
                  url={searchResult.homepage[0]}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              )}
              {searchResult.source && (
                <Action.OpenInBrowser
                  title="Open Package Source Code"
                  url={searchResult.source}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={`## ${searchResult.attrName}\n\n${searchResult.description ? searchResult.description : ""}`}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Name"
                  text={searchResult.name}
                />
                <List.Item.Detail.Metadata.Label
                  title="Version"
                  text={searchResult.version}
                />

                {searchResult.homepage.map((url) =>
                  url ? (
                    <List.Item.Detail.Metadata.Link
                      key={url}
                      title="Homepage"
                      target={url}
                      text={new URL(url).host}
                    />
                  ) : (
                    <List.Item.Detail.Metadata.Label
                      key={url}
                      title="Homepage"
                      icon={Icon.Minus}
                      text="-"
                    />
                  ),
                )}

                {searchResult.source && (
                  <List.Item.Detail.Metadata.Link
                    title="Source"
                    target={searchResult.source}
                    text={new URL(searchResult.source).host}
                  />
                )}

                {searchResult.licenses.map((license) =>
                  license.url ? (
                    <List.Item.Detail.Metadata.Link
                      key={license.name}
                      title="License"
                      target={license.url}
                      text={license.name}
                    />
                  ) : (
                    <List.Item.Detail.Metadata.Label
                      key={license.name}
                      title="License"
                      text={license.name}
                    />
                  ),
                )}

                <List.Item.Detail.Metadata.TagList title="Outputs">
                  {searchResult.outputs.map((text) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={text}
                      text={text}
                      color={
                        text === searchResult.defaultOutput
                          ? Color.PrimaryText
                          : Color.SecondaryText
                      }
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>

                <List.Item.Detail.Metadata.TagList title="Platforms">
                  {searchResult.platforms.map((text) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={text}
                      text={text}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }
}

export interface PkgsSearchResult {
  id: string;
  name: string;
  attrName: string;
  description: string | null;
  version: string;
  homepage: string[];
  source: string | null;
  outputs: string[];
  defaultOutput: string | null;
  platforms: string[];
  licenses: { name: string; url: string | null }[];
}
