import { useFetch } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  useNavigation,
} from "@vicinae/api";
import { useState } from "react";
import { Preferences, useDebouncedValue } from "./utils/lib";

interface Label {
  id: number;
  name: string;
  color?: string;
}

export interface PullRequest {
  number: number;
  title: string;
  pr_url: string;
  state: "open" | "closed";
  username: string;
  created_at: string;
  updated_at: string;
  body: string;
  labels?: Label[];
  merged_at?: string | null;
}

export default function NixpkgsPRList() {
  const { push } = useNavigation();
  const { githubToken, searchSize } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, 300);

  const apiUrl = debouncedSearch
    ? `https://api.github.com/search/issues?q=${debouncedSearch}+repo:NixOS/nixpkgs+type:pr&per_page=${searchSize}`
    : `https://api.github.com/repos/NixOS/nixpkgs/pulls?state=open&per_page=${searchSize}`;

  const { data, isLoading } = useFetch<PullRequest[]>(apiUrl, {
    headers: githubToken ? { Authorization: `Bearer ${githubToken}` } : {},
    keepPreviousData: true,
    mapResult: (result: any) => {
      const items: any[] = debouncedSearch ? result.items : result;

      const prs: PullRequest[] = items
        .filter((item) => item.pull_request || !debouncedSearch)
        .map((item) => ({
          number: item.number,
          title: item.title,
          pr_url: item.html_url,
          state: item.state,
          merged_at: item.pull_request?.merged_at ?? item.merged_at ?? null,
          username: item.user?.login ?? "unknown",
          created_at: item.created_at,
          updated_at: item.updated_at,
          body: item.body ?? "",
          labels: item.labels?.map((l: any) => ({
            id: l.id,
            name: l.name,
            color: l.color,
          })),
        }));

      return { data: prs };
    },
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search PR by number or title"
      navigationTitle="Nixpkgs Pull Requests"
    >
      {data?.map((pr) => {
        const statusIcon =
          pr.state === "open"
            ? { source: "../assets/PROpen.svg", tintColor: Color.Green }
            : pr.merged_at
              ? { source: "../assets/PRMerge.svg", tintColor: Color.Purple }
              : { source: "../assets/PRClosed.svg", tintColor: Color.Red };

        return (
          <List.Item
            key={pr.number}
            title={pr.title}
            subtitle={`#${pr.number} • ${pr.username}`}
            icon={statusIcon}
            accessories={[
              { text: new Date(pr.created_at).toLocaleDateString() },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Sidebar}
                  onAction={() => push(<PrDetailView pr={pr} />)}
                />
                <Action.OpenInBrowser title="Open in Browser" url={pr.pr_url} />
                <Action.CopyToClipboard
                  title="Copy PR Number"
                  content={pr.number.toString()}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function PrDetailView({ pr }: { pr: PullRequest }) {
  return (
    <Detail
      navigationTitle={`PR #${pr.number}`}
      markdown={`# ${pr.title}\n\n${pr.body || "_No description provided._"}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link
            title="Author"
            target={`https://github.com/${pr.username}`}
            text={pr.username}
          />
          <Detail.Metadata.Label
            title="Status"
            text={
              pr.state === "open"
                ? "🟢 Open"
                : pr.merged_at
                  ? "✅ Merged"
                  : "🔴 Closed"
            }
          />
          {pr.labels?.length ? (
            <Detail.Metadata.TagList title="Labels">
              {pr.labels.map((l) => (
                <Detail.Metadata.TagList.Item
                  key={l.id}
                  text={l.name}
                  color={l.color}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Label
            title="Created"
            text={new Date(pr.created_at).toLocaleString()}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={new Date(pr.updated_at).toLocaleString()}
          />
          <Detail.Metadata.Link
            title="GitHub URL"
            target={pr.pr_url}
            text="View on GitHub"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open PR" url={pr.pr_url} />
          <Action.CopyToClipboard
            title="Copy PR Number"
            content={pr.number.toString()}
          />
        </ActionPanel>
      }
    />
  );
}
