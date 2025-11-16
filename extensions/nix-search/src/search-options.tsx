import { getPreferenceValues, List, Action, ActionPanel } from "@vicinae/api";
import { useMemo, useState } from "react";
import TurndownService from "turndown";
import { useSearch } from "./utils/search";
import {
  useRawHomeManagerOptions,
  useFilteredHomeManagerOptions,
} from "./utils/homeManager";
import { type Preferences } from "./utils/lib";

type Source = "nixos" | "home-manager";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [source, setSource] = useState<Source>("nixos");

  const { searchSize, branchName } = getPreferenceValues<Preferences>();
  const branch = branchName === "unstable" ? "master" : `release-${branchName}`;
  console.log("re-render");

  const hmEnabled = source === "home-manager";
  const nixEnabled = source === "nixos";

  // home-manager
  const { rawOptions: hmRaw, isLoading: hmLoading } = useRawHomeManagerOptions(
    branch,
    hmEnabled,
  );
  const hmFiltered = useFilteredHomeManagerOptions(
    searchText,
    hmRaw,
    Number(searchSize),
    hmEnabled,
  );

  // nixos
  const { results: nixResults, isLoading: nixLoading } = useSearch({
    searchText,
    type: "options",
    searchSize: Number(searchSize),
    branchName,
    enabled: nixEnabled,
  });

  const results = source === "home-manager" ? hmFiltered : (nixResults ?? []);
  const isLoading = source === "home-manager" ? hmLoading : nixLoading;

  const turndown = useMemo(() => new TurndownService(), []);

  const getHMGitHubUrl = (decl: string, branch?: string) => {
    const cleanDecl = decl.replace(/<|>/g, "").replace(/^home-manager\//, "");
    return {
      text: cleanDecl,
      url: `https://github.com/nix-community/home-manager/blob/${branch}/${cleanDecl}`,
    };
  };

  const defaultGetGitHubUrl = (decl: string) => {
    return {
      text: decl,
      url: `https://github.com/NixOS/nixpkgs/blob/${branch}/${decl}`,
    };
  };

  const renderItem = (item: OptionsSearchResult) => {
    const safeName = item.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const markdown = `## ${safeName}\n\n${item.description
        ? source === "home-manager"
          ? item.description
          : turndown.turndown(item.description)
        : ""
      }\n\n${item.example ? `### Example\n\`\`\`nix\n${item.example}\n\`\`\`` : ""}`;

    const declaredInArray = Array.isArray(item.declaredIn)
      ? item.declaredIn
      : item.declaredIn
        ? [item.declaredIn]
        : [];

    const urlGetter =
      source === "home-manager" ? getHMGitHubUrl : defaultGetGitHubUrl;

    return (
      <List.Item
        key={item.id}
        title={item.name}
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Name"
                  text={item.name}
                />
                <List.Item.Detail.Metadata.Label
                  title="Type"
                  text={item.type}
                />
                {item.default && (
                  <List.Item.Detail.Metadata.Label
                    title="Default"
                    text={item.default}
                  />
                )}
                {declaredInArray.map((decl, i) => {
                  if (!decl) return null;
                  const { text, url } = urlGetter(decl, branch);
                  return (
                    <List.Item.Detail.Metadata.Link
                      key={text}
                      title={`Declared in ${i + 1}`}
                      text={text}
                      target={url}
                    />
                  );
                })}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Option Name"
                content={item.name}
              />
              {item.example && (
                <Action.CopyToClipboard
                  title="Copy Example"
                  content={item.example}
                />
              )}
            </ActionPanel.Section>
            {declaredInArray.length > 0 && (
              <ActionPanel.Section>
                {declaredInArray.map((decl, i) => {
                  if (!decl) return null;
                  const { url } = urlGetter(decl, branch);
                  return (
                    <Action.OpenInBrowser
                      key={url}
                      title={`Open Declaration ${i + 1}`}
                      url={url}
                    />
                  );
                })}
              </ActionPanel.Section>
            )}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={`Search ${source === "nixos" ? "NixOS" : "Home-Manager"} options...`}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Source"
          defaultValue={source}
          onChange={(newValue) => setSource(newValue as Source)}
        >
          <List.Dropdown.Item title="NixOS Options" value="nixos" />
          <List.Dropdown.Item
            title="Home-Manager Options"
            value="home-manager"
          />
        </List.Dropdown>
      }
    >
      <List.Section title="Results" subtitle={`${results.length}`}>
        {results.map(renderItem)}
      </List.Section>
    </List>
  );
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
