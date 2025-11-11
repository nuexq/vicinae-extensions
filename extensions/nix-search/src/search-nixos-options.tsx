import { getPreferenceValues } from "@vicinae/api";
import { useState } from "react";
import OptionsList from "./components/OptionsList";
import type { Preferences } from "./utils/lib";
import { useSearch } from "./utils/search";

export default function Command() {
	const [searchText, setSearchText] = useState("");
	const { searchSize, branchName } = getPreferenceValues<Preferences>();
	const { isLoading, results } = useSearch({
		searchText,
		type: "options",
		searchSize: Number(searchSize),
		branchName,
	});

	return (
		<OptionsList
			results={results}
			isLoading={isLoading}
			searchText={searchText}
			onSearchTextChange={setSearchText}
			branchName={
				branchName === "unstable" ? "master" : `release-${branchName}`
			}
			placeholder="Search NixOS options..."
		/>
	);
}
