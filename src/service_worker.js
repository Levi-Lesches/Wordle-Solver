chrome.action.onClicked.addListener((tab) => {
  console.log("Starting game");
	chrome.scripting.executeScript({
    target: {tabId: tab.id},
    files: ['src/solver.js']
  });
});
console.log("Initialized button");