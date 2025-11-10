import { useEffect, useRef, useState } from "react";
import { OptionsSearchResult, Preferences } from "./utils/lib";
import { Action, ActionPanel, getPreferenceValues, List } from "@vicinae/api";
import { useFilteredHomeManagerOptions, useRawHomeManagerOptions } from "./utils/homeManager";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  let { searchSize, branchName } = getPreferenceValues<Preferences>();
  const optionsRef = useRef<OptionsSearchResult[]>([]);
  branchName = branchName === "unstable" ? "master" : `release-${branchName}`;

  const { rawOptions, isLoading } = useRawHomeManagerOptions(branchName);

  useEffect(() => {
    if (rawOptions.length > 0) {
      optionsRef.current = rawOptions;
    }
  }, [rawOptions]);
  const results = useFilteredHomeManagerOptions(searchText, optionsRef.current, Number(searchSize));

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Home-Manager options..."
      isShowingDetail
      searchText={searchText}
    >
      <List.Section title="Results" subtitle={`${results.length}`}>
        {results.map((searchResult: OptionsSearchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} branchName={branchName} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  searchResult,
  branchName,
}: {
  searchResult: OptionsSearchResult;
  branchName: string;
}) {
  const safeName = searchResult.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const markdown = `## ${safeName}

${searchResult.description || ""}

${searchResult.example ? `### Example\n\`\`\`nix\n${searchResult.example}\n\`\`\`` : ""}`;

  const getGitHubUrl = (decl: string) => {
    const cleanDecl = decl.replace(/<|>/g, "").replace(/^home-manager\//, "");
    return {
      text: cleanDecl,
      url: `https://github.com/nix-community/home-manager/blob/${branchName}/${cleanDecl}`,
    };
  };

  return (
    <List.Item
      title={searchResult.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Option Name" content={searchResult.name} />
            {searchResult.example && (
              <Action.CopyToClipboard title="Copy Example" content={searchResult.example} />
            )}
          </ActionPanel.Section>

          {searchResult.declaredIn && searchResult.declaredIn.length > 0 && (
            <ActionPanel.Section>
              {searchResult.declaredIn.map((decl, i) => {
                if (!decl) return null;
                const { url } = getGitHubUrl(decl);
                return <Action.OpenInBrowser key={i} title={`Open Declaration ${i + 1}`} url={url} />;
              })}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
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
              {searchResult.declaredIn && searchResult.declaredIn.length > 0 && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  {searchResult.declaredIn!.map((decl, i) => {
                    if (!decl) return null;
                    const { text, url } = getGitHubUrl(decl);
                    return (
                      <List.Item.Detail.Metadata.Link key={i} title={`Declared in ${i + 1}`} text={text} target={url} />
                    );
                  })}
                </>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
