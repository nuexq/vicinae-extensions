import { List } from "@vicinae/api";
import type { OptionsSearchResult } from "../utils/lib";
import OptionsListItem from "./OptionsListItem";

interface OptionsListProps {
	results: OptionsSearchResult[];
	isLoading: boolean;
	searchText: string;
	onSearchTextChange: (text: string) => void;
	placeholder?: string;
	branchName: string;
	getGitHubUrl?: (
		decl: string,
		branchName?: string,
	) => { url: string; text: string };
}

export default function OptionsList({
	results,
	isLoading,
	searchText,
	onSearchTextChange,
	placeholder,
	branchName,
	getGitHubUrl,
}: OptionsListProps) {
	return (
		<List
			isLoading={isLoading}
			onSearchTextChange={onSearchTextChange}
			searchText={searchText}
			searchBarPlaceholder={placeholder}
			isShowingDetail
		>
			<List.Section title="Results" subtitle={`${results.length}`}>
				{results.map((res) => (
					<OptionsListItem
						key={res.id}
						searchResult={res}
						branchName={branchName}
						getGitHubUrl={getGitHubUrl}
					/>
				))}
			</List.Section>
		</List>
	);
}
