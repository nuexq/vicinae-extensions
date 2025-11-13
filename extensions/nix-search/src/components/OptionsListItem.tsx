import { Action, ActionPanel, List } from "@vicinae/api";
import TurndownService from "turndown";
import type { OptionsSearchResult } from "../utils/lib";

const turndownService = new TurndownService();

interface SearchListItemProps {
	searchResult: OptionsSearchResult;
	branchName: string;
	getGitHubUrl?: (
		decl: string,
		branchName?: string,
	) => { url: string; text: string };
}

export default function SearchListItem({
	searchResult,
	branchName,
	getGitHubUrl,
}: SearchListItemProps) {
	const safeName = searchResult.name
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
	const markdown = `## ${safeName}\n\n${searchResult.description ? searchResult.description : ""}\n\n${searchResult.example ? `### Example\n\`\`\`nix\n${searchResult.example}\n\`\`\`` : ""}`;

	const declaredInArray = Array.isArray(searchResult.declaredIn)
		? searchResult.declaredIn
		: searchResult.declaredIn
			? [searchResult.declaredIn]
			: [];

	const defaultGetGitHubUrl = (decl: string, branch: string) => {
		if (decl.startsWith("<") && decl.endsWith(">")) {
			const cleanDecl = decl.slice(1, -1).replace(/^home-manager\//, "");
			return {
				text: cleanDecl,
				url: `https://github.com/nix-community/home-manager/blob/${branch}/${cleanDecl}`,
			};
		} else {
			return {
				text: decl,
				url: `https://github.com/NixOS/nixpkgs/blob/${branch}/${decl}`,
			};
		}
	};

	const urlGetter = getGitHubUrl || defaultGetGitHubUrl;

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

					{declaredInArray.length > 0 && (
						<ActionPanel.Section>
							{declaredInArray.map((decl, i) => {
								if (!decl) return null;
								const { url } = urlGetter(decl, branchName);
								return (
									<Action.OpenInBrowser
										key={url}
										title={`Open Declaration ${i + 1} `}
										url={url}
									/>
								);
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
							<List.Item.Detail.Metadata.Label
								title="Name"
								text={searchResult.name}
							/>
							<List.Item.Detail.Metadata.Label
								title="Type"
								text={searchResult.type}
							/>
							{searchResult.default && (
								<List.Item.Detail.Metadata.Label
									title="Default"
									text={searchResult.default}
								/>
							)}
							{declaredInArray.length > 0 &&
								declaredInArray.map((decl, i) => {
									if (!decl) return null;
									const { text, url } = urlGetter(decl, branchName);
									return (
										<List.Item.Detail.Metadata.Link
											key={text}
											title={`Declared in ${i + 1} `}
											text={text}
											target={url}
										/>
									);
								})}
						</List.Item.Detail.Metadata>
					}
				/>
			}
		/>
	);
}
