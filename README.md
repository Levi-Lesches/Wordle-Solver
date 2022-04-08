# Wordle Solver 

An extension to solve Wordles for you. Only works on the NYTimes Wordle page.
Have you ever wanted to play Wordle without playing Wordle? Well do I have news for you! This extension will play Wordle for you so you can sit back and relax while your friends stress out. You can totally brag about your superhuman scores too!

**Note**: Only works on the official [NYTimes Wordle page](https://www.nytimes.com/games/wordle/index.html)

## Explanation: 
This algorithm works by going through the dictionary and, for each word: 
  1. Assume that is the correct word
  2. Go back and judge all previous guesses based on that assumption
  3. Compare its judgements against the results from Wordle

If they match, then this word can be the Wordle word. Otherwise, it must be wrong. Possible matches are scored on entropy (number of unique letters) and popularity (based on the most commonly-used 1,000 words) and the most likely word is chosen. Because I only have data on the top 1,000 words, this ranking isn't foolproof. 

Sometimes, a Wordle is unsolvable without some luck. This can happen when the algorithm gets most of the letters green and is left with one or two letters that it isn't getting right. For example, if you get STO_E, that could mean: stole, stove, store, stoke, or stone, and there aren't enough guesses to figure out which. What some people do is guess a completely different word like "ranks" to see if the r, k, or n would turn up black or yellow. But Wordle has a "hard mode" that forbids this strategy. The algorithm plays by the hard mode rules, so it is possible to lose sometimes. 

This extension does not collect, store, or transmit your personal data.