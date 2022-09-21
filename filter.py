WORDS = []

# read words
with open("popularity_raw.txt", "r") as file: 
	contents = file.readlines()
	for line in contents:
		word = line.strip()
		if len(word) != 5: continue
		WORDS.append(word)

# save filtered words
with open("popularity_raw.txt", "w") as file:
	file.write("\n".join(WORDS))
