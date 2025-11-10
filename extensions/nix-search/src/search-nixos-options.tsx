import { useState } from "react";
import { OptionsSearchResult, Preferences } from "./utils/lib";
import { useSearch } from "./utils/search";
import { Action, ActionPanel, getPreferenceValues, List } from "@vicinae/api";
import TurndownService from "turndown";

const turndownService = new TurndownService();

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { searchSize, branchName } = getPreferenceValues<Preferences>();
  const { isLoading, results } = useSearch({ searchText, type: "options", searchSize: Number(searchSize), branchName });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search NixOS options..."
      isShowingDetail
      searchText={searchText}
    >
      <List.Section title="Results" subtitle={`${results.length}`}>
        {results.map((searchResult: OptionsSearchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: OptionsSearchResult }) {
  const safeName = searchResult.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const markdown = `## ${safeName}

${searchResult.description ? htmlToMarkdown(searchResult.description) : ""}

${searchResult.example ? `### Example\n\`\`\`nix\n${searchResult.example}\n\`\`\`` : ""}`;


  return (
    <List.Item
      title={searchResult.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Option Name"
              content={searchResult.name}
            />
            {searchResult.example && (
              <Action.CopyToClipboard
                title="Copy Example"
                content={searchResult.example}
              />
            )}
          </ActionPanel.Section>

          {searchResult.declaredIn && (
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open Definition on GitHub"
                url={`https://github.com/NixOS/nixpkgs/blob/nixos-25.05/${searchResult.declaredIn}`}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={searchResult.name} />
              <List.Item.Detail.Metadata.Label title="Type" text={searchResult.type} />
              {searchResult.default && (
                <List.Item.Detail.Metadata.Label title="Default" text={searchResult.default} />
              )}
              {searchResult.declaredIn && (
                <List.Item.Detail.Metadata.Link
                  title="Declared in"
                  target={`https://github.com/NixOS/nixpkgs/blob/nixos-25.05/${searchResult.declaredIn}`}
                  text={searchResult.declaredIn[0]}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function htmlToMarkdown(html: string) {
  return turndownService.turndown(html);
}
