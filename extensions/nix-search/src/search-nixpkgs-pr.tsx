import { useFetch } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  useNavigation,
} from "@vicinae/api";
import { useState } from "react";
import { type Preferences, useDebouncedValue } from "./utils/lib";
import moment from "moment";

interface Label {
  id: number;
  name: string;
  color?: string;
}

export interface FullPullRequest {
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
  reviewers?: string[];
  from_branch: string;
  to_branch: string;
}

export interface PullRequest {
  number: number;
  title: string;
  pr_url: string;
  state: "open" | "closed";
  username: string;
  created_at: string;
  merged_at?: string | null;
}

interface Arguments {
  pr: number;
}

export default function NixpkgsPRList(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { pr } = props.arguments;

  const { push } = useNavigation();
  const { githubToken, searchSize } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText, 300);
  if (pr) {
    return <PrDetailView prNumber={pr} githubToken={githubToken} />;
  }

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
                  onAction={() =>
                    push(
                      <PrDetailView
                        prNumber={pr.number}
                        githubToken={githubToken}
                      />,
                    )
                  }
                />
                <Action.OpenInBrowser title="Open PR" url={pr.pr_url} />
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

function PrDetailView({
  prNumber,
  githubToken,
}: {
  prNumber: number;
  githubToken: string;
}) {
  const { data, isLoading } = useFetch<FullPullRequest>(
    `https://api.github.com/repos/NixOS/nixpkgs/pulls/${prNumber}`,
    {
      headers: githubToken ? { Authorization: `Bearer ${githubToken}` } : {},
      mapResult: (result: any) => {
        const data: FullPullRequest = {
          number: result.number,
          title: result.title,
          pr_url: result.html_url,
          state: result.state,
          merged_at: result.merged_at ?? null,
          username: result.user?.login ?? "unknown",
          created_at: result.created_at,
          updated_at: result.updated_at,
          body: result.body ?? "",
          labels: result.labels?.map((l: any) => ({
            id: l.id,
            name: l.name,
            color: l.color,
          })),
          reviewers: result.requested_reviewers?.map((r: any) => r.login) ?? [],
          from_branch: result.head?.ref ?? "unknown",
          to_branch: result.base?.ref ?? "unknown",
        };

        return { data };
      },
    },
  );

  if (isLoading || !data) {
    return <List isLoading={true} />;
  }

  return (
    <Detail
      navigationTitle={`PR #${data.number}`}
      markdown={`\`NixOS:${data.to_branch}\` ← \`${data.username}:${data.from_branch}\`\n\nCreated at: ${new Date(data.created_at).toLocaleString()}, Updated ${moment(data.updated_at).fromNow()}\n# ${data.title}\n\n${data.body || "_No description provided._"}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link
            title="Author"
            target={`https://github.com/${data.username}`}
            text={data.username}
          />
          <Detail.Metadata.Label
            title="Status"
            text={
              data.state === "open"
                ? "🟢 Open"
                : data.merged_at
                  ? "✅ Merged"
                  : "🔴 Closed"
            }
          />
          {data.labels?.length ? (
            <Detail.Metadata.TagList title="Labels">
              {data.labels.map((l) => (
                <Detail.Metadata.TagList.Item
                  key={l.id}
                  text={l.name}
                  color={l.color}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {data.reviewers?.length ? (
            <Detail.Metadata.TagList title="Reviewers">
              {data.reviewers.map((r) => (
                <Detail.Metadata.TagList.Item
                  key={r}
                  text={r}
                  color={Color.PrimaryText}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Reviewers" text="No reviewers" />
          )}
          <Detail.Metadata.Label
            title="Created"
            text={new Date(data.created_at).toLocaleString()}
          />
          <Detail.Metadata.Label
            title="Updated"
            text={new Date(data.updated_at).toLocaleString()}
          />
          <Detail.Metadata.Link
            title="GitHub URL"
            target={data.pr_url}
            text="View on GitHub"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open PR" url={data.pr_url} />
          <Action.CopyToClipboard
            title="Copy PR Number"
            content={data.number.toString()}
          />
        </ActionPanel>
      }
    />
  );
}
