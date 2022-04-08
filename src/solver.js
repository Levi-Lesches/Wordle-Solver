'use strict';

async function main() {
	const gameElement = document.querySelector("game-app").shadowRoot.querySelector("game-theme-manager").querySelector("#game");
	const rows = gameElement.querySelector("#board").children;
	const ENTER = new CustomEvent("game-key-press", {detail: {key: "Enter"}});

	function letterEvent(letter) { return new CustomEvent("game-key-press", {detail: {key: letter}}); }

	const MAX_ATTEMPTS = 6;
	const ATTEMPT_LENGTH = 5;
	const WEIGHT_GREEN = 1;
	const WEIGHT_YELLOW = 0.75;
	const WEIGHT_BLACK = 0;
	const WEIGHT_ENTROPY = 1;
	const WEIGHT_POPULARITY = 0.9;

	const ALL_WORDS = new Map();

	function arrayCompare(a, b) { return a == "" + b; }
	function arraySort(array, computeValue) { array.sort((a, b) => computeValue(a) - computeValue(b)); }
	function arrayRemove(array, element) {
		const index = array.indexOf(element);
		array.splice(index, 1);
	}

	async function loadWords() {
		const wordsUrl = chrome.runtime.getURL("data/words.txt");
		const wordsResponse = await fetch(wordsUrl);
		const words = await wordsResponse.text();

		const popularityUrl = chrome.runtime.getURL("data/popularity.txt");
		const popularityResponse = await fetch(popularityUrl);
		const popularity = await popularityResponse.text();
		const popularWords = popularity.split("\n");

		const ALL_WORDS_SET = new Set();
		for (const word of words.split("\n")) ALL_WORDS_SET.add(word);
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

		playTurn() {
			const guess = this.guesser.getGuess();
			if (guess === undefined) return false;
			const response = this.codemaker.getResponse(guess);
			this.attempts.push( {guess: guess, response: response} );
		}

		async loop() {
			while (true) {
				const canContinue = this.playTurn();
				if (canContinue === false) return;
				if (this.didWin) break;
				else if (this.didLose) {
					alert("Sorry, I couldn't figure this one out"); 
					break;
				}
				await sleep(2000);
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
			// guesses.sort((a, b) => (new Set(a).length / a.length) - (new Set(b).length / b.length));
			// guesses.sort((a, b) => ALL_WORDS.get(a) - ALL_WORDS.get(b));
			arraySort(guesses, (word) => (new Set(word).size / word.length)*WEIGHT_ENTROPY + (ALL_WORDS.get(word))*WEIGHT_POPULARITY);
			return guesses[0];
		}
	}

	class WordleReader {
		constructor(game) { this.game = game; }

		static simulateResponse(code, guess) {
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

		getResponse(guess) {
			/* Enters the word and reads the Wordle page for the response */
			const row = rows[this.game.attempts.length];
			for (const letter of guess) {
				gameElement.dispatchEvent(letterEvent(letter));
			}
			gameElement.dispatchEvent(ENTER);
			const response = Array.from(row.shadowRoot.children[1].children).map(tile => tile.attributes["evaluation"].value);
			return response;
		}
	}

	await loadWords();
	const game = new Game();
	await game.loop();
}
main();