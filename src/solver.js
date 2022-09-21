'use strict';

async function main() {
	const gameElement = document.querySelector("#wordle-app-game");
	const keyboard = Array.from(gameElement.querySelectorAll("button[data-key]"));
	const enter = keyboard.find(button => button.getAttribute("data-key") === "↵");
	const allTiles = gameElement.querySelectorAll("div[data-state]");

	function letterEvent(letter) { return new CustomEvent("game-key-press", {detail: {key: letter}}); }

	const MAX_ATTEMPTS = 6;
	const ATTEMPT_LENGTH = 5;
	const WEIGHT_GREEN = 1;
	const WEIGHT_YELLOW = 0.75;
	const WEIGHT_BLACK = 0;
	const WEIGHT_ENTROPY = 1;
	const WEIGHT_POPULARITY = 0.5;

	const ALL_WORDS = new Map();

	function arrayCompare(a, b) { return a == "" + b; }
	function arraySort(array, computeValue) { array.sort((a, b) => computeValue(a) - computeValue(b)); }
	function arrayRemove(array, element) {
		const index = array.indexOf(element);
		array.splice(index, 1);
	}

	async function loadWords() {
		/* Procedure: place all words  */
		const wordsUrl = chrome.runtime.getURL("data/words.txt");
		const wordsResponse = await fetch(wordsUrl);
		const words = (await wordsResponse.text()).split("\n");

		const popularityUrl = chrome.runtime.getURL("data/popularity.txt");
		const popularityResponse = await fetch(popularityUrl);
		const popularWords = (await popularityResponse.text()).split("\n");

		const ALL_WORDS_SET = new Set();
		for (const word of words) ALL_WORDS_SET.add(word);
		for (let index = 0; index < popularWords.length; index++) {
			const word = popularWords[index].trim();  // I don't know why, okay?
			if (!ALL_WORDS_SET.has(word)) continue;
			ALL_WORDS.set(word, index);
		}
		for (const word of ALL_WORDS_SET) {
			if (!ALL_WORDS.has(word)) ALL_WORDS.set(word, popularWords.length);
		}
	}

	function sleep(ms) {
	  return new Promise(resolve => setTimeout(resolve, ms || DEF_DELAY));
	}

	class Game {
		constructor() {
			this.guesser = new Guesser(this);
			this.codemaker = new WordleReader(this);
			this.attempts = [];
		}

		get didWin() {
			return this.attempts.length <= MAX_ATTEMPTS
				&& this.attempts[this.attempts.length - 1].response.every(status => status === "correct");
		}

		get didLose() {
			return this.attempts.length >= MAX_ATTEMPTS;
		}

		async playTurn() {
			const guess = this.guesser.getGuess();
			if (guess === undefined) return false;
			const response = await this.codemaker.getResponse(guess);
			this.attempts.push( {guess: guess, response: response} );
		}

		async loop() {
			while (true) {
				const canContinue = await this.playTurn();
				if (canContinue === false) return;
				if (this.didWin) break;
				else if (this.didLose) {
					alert("Sorry, I couldn't figure this one out"); 
					break;
				}
			}
		}
	}

	class Guesser {
		constructor(game) { this.game = game; }

		getGuess() {
			/* Computes a guess based on the previous responses. */
			if (this.game.attempts.length === 0) { return "aeros"; }
			const guesses = [];
			for (let possibleWord of ALL_WORDS.keys()) {
				if (this.game.attempts.includes(possibleWord)) continue;
				if (this.game.attempts.every(attempt => arrayCompare(attempt.response, WordleReader.simulateResponse(possibleWord, attempt.guess)))) {
					guesses.push(possibleWord);
				}
			}
			if (guesses.length === 0) {
				alert("No words found");
				return;
			}
			arraySort(guesses, function(word) {
				// duplicity = reverse of entropy (0-1): less is better
				let duplicity = word.length / new Set(word).size;
				// popularity = ranking: (0-1), less is better (eg, 1st place)
				let popularity = ALL_WORDS.get(word)/ALL_WORDS.size;
				// [0, 1] + [0, 1] = [0, 2]
				let result = duplicity*WEIGHT_ENTROPY + popularity*WEIGHT_POPULARITY;
				return result;
			});
			return guesses[0];
		}
	}

	class WordleReader {
		constructor(game) { this.game = game; }

		static simulateResponse(code, guess) {
			/* Returns a response for [guess] using Wordle's format, as if [code] is the word. */
			const result = Array(ATTEMPT_LENGTH);
			const mapping = new Map();

			for (let index = 0; index < code.length; index++) {
				const letter = code[index];
				if (!mapping.has(letter)) mapping.set(letter, new Array());
				mapping.get(letter).push(index);
			}

			const queue = [...Array(ATTEMPT_LENGTH).keys()];  // like range(ATTEMPT_LENGTH)
			for (let index of Array.from(queue)) {
				let letter = code[index];
				if (letter === guess[index]) {
					arrayRemove(mapping.get(letter), index);
					result[index] = "correct";
					arrayRemove(queue, index);
				}
			}

			for (let index of queue) {
				const letter = guess[index];
				if (!mapping.has(letter) || mapping.get(letter).length === 0) result[index] = "absent";
				else if (!mapping.get(letter).includes(index)) {
					result[index] = "present";
					mapping.get(letter).pop();
				}
			}
			return result;
		}

		async getResponse(guess) {
			/* Enters the word and reads the Wordle page for the response */
			// Enter each letter by pressing on the on-screen (GUI) keyboard
			const row = this.game.attempts.length;
			for (const letter of guess) {
				const key = keyboard.find(button => button.getAttribute("data-key") === letter);
				key.click();
			}
			enter.click();
			await sleep(2500);	

			// Read all the tiles that correspond to the response
			const response = [];
			for (let letter = 0; letter < guess.length; letter++) {
				const tile = allTiles[row*guess.length + letter];
				const tileResponse = tile.getAttribute("data-state");
				response.push(tileResponse);
			}
			return response;
		}
	}

	await loadWords();
	const game = new Game();
	await game.loop();
}
main();
