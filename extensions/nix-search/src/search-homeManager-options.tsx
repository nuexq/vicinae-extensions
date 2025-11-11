import { getPreferenceValues } from "@vicinae/api";
import { useState } from "react";
import OptionsList from "./components/OptionsList";
import {
	useFilteredHomeManagerOptions,
	useRawHomeManagerOptions,
} from "./utils/homeManager";
import type { Preferences } from "./utils/lib";

export default function Command() {
	const [searchText, setSearchText] = useState("");
	let { searchSize, branchName } = getPreferenceValues<Preferences>();
	branchName = branchName === "unstable" ? "master" : `release-${branchName}`;

	const { rawOptions, isLoading } = useRawHomeManagerOptions(branchName);
	const results = useFilteredHomeManagerOptions(
		searchText,
		rawOptions,
		Number(searchSize),
	);

	const getGHUrl = (decl: string, branch?: string) => {
		const cleanDecl = decl.replace(/<|>/g, "").replace(/^home-manager\//, "");
		return {
			text: cleanDecl,
			url: `https://github.com/nix-community/home-manager/blob/${branch}/${cleanDecl}`,
		};
	};

	return (
		<OptionsList
			results={results}
			isLoading={isLoading}
			searchText={searchText}
			onSearchTextChange={setSearchText}
			placeholder="Search Home-Manager options..."
			branchName={branchName}
			getGitHubUrl={getGHUrl}
		/>
	);
}
