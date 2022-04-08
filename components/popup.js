function main() {
	const WORDLE_URL = "https://www.nytimes.com/games/wordle/index.html";

	let solveButton = document.getElementById("solve");
	const errorText = document.getElementById("error-text");

	solveButton.addEventListener("click", async () => {
		const activeTabs = await chrome.tabs.query({active:true, currentWindow: true})
		const activeTab = activeTabs[0];
		chrome.scripting.executeScript({
			target: {tabId: activeTab.id}, 
			files: ["src/solver.js"]}
		);
	});

	async function checkPage() {
		const activeTabs = await chrome.tabs.query({active:true, currentWindow: true})
		const activeTab = activeTabs[0];
		if (activeTab.url === WORDLE_URL) {
			solveButton.disabled = false;
			errorText.remove();
		}	
	}
	checkPage();
}
main();