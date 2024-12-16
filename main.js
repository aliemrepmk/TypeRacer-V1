const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let words = [];
let fetchedWords = []; // Store words fetched from the API
let lastSpawnedWords = []; // Store the last 20 spawned words
let speed = 2;
let currentWordIndex = 0;
let gameActive = false; // Tracks if the game is active
let score = 0; // Tracks the score
let highScore = loadHighScore(); // Load high score from local storage
let spawnInterval = 3000; // Initial spawn interval in milliseconds
let lastSpawnTime = 0; // Tracks the last spawn time

// Load High Score from Local Storage
function loadHighScore() {
    const storedHighScore = localStorage.getItem('highScore');
    return storedHighScore ? parseInt(storedHighScore, 10) : 0;
}

// Save High Score to Local Storage
function saveHighScore() {
    localStorage.setItem('highScore', highScore);
}

// Fetch Words from API
async function fetchWords() {
    try {
        const response = await fetch('https://api.datamuse.com/words?ml=life&max=50'); // Fetch diverse words
        const data = await response.json();
        fetchedWords = shuffleArray(data.map(word => word.word)); // Extract and shuffle words
        console.log('Fetched Words:', fetchedWords);
    } catch (error) {
        console.error('Error fetching words:', error);
        fetchedWords = ['error', 'loading', 'retry']; // Fallback words in case of error
    }
}

// Get a Random Word from Fetched Words
function getRandomWord() {
    if (fetchedWords.length === 0) return 'loading'; // Fallback if words are not loaded
    return fetchedWords[Math.floor(Math.random() * fetchedWords.length)];
}

// Spawn Word with Overlap and Duplication Check
function spawnWord() {
    let word;
    let attempts = 0;

    // Retry until a valid word is found or max attempts are reached
    do {
        word = getRandomWord();
        attempts++;
    } while (lastSpawnedWords.includes(word) && attempts < 10);

    if (attempts >= 10) {
        console.warn('Failed to find a non-duplicate word after 10 attempts');
        return; // Abort spawning if too many duplicates
    }

    const wordObj = {
        text: word,
        x: 0,
        y: canvas.height / 2 + (Math.random() * 400 - 200), // Wider Y-Axis range: ±200px
    };

    // Retry logic to avoid overlap on the canvas
    attempts = 0;
    while (words.some(w => Math.abs(w.y - wordObj.y) < 50) && attempts < 10) {
        wordObj.y = canvas.height / 2 + (Math.random() * 400 - 200);
        attempts++;
    }

    if (attempts < 10) {
        words.push(wordObj); // Add the word to the active words list
        updateLastSpawnedWords(word); // Update the last spawned words queue
    }
}

// Update the Last Spawned Words Queue
function updateLastSpawnedWords(newWord) {
    lastSpawnedWords.push(newWord);

    // Ensure the queue only keeps the last 20 words
    if (lastSpawnedWords.length > 20) {
        lastSpawnedWords.shift(); // Remove the oldest word
    }
}

function getJitter(x, canvasWidth) {
    if (x < canvasWidth / 3) {
        return Math.random() * 2 - 1; // Jitter in range ±1 pixels
    } else if (x < (2 * canvasWidth) / 3) {
        return Math.random() * 4 - 2; // Jitter in range ±2 pixels
    } else {
        return Math.random() * 8 - 4; // Jitter in range ±4 pixels
    }
}

// Draw Words with Colorization
function drawWords() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw score
  ctx.font = '20px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${score}`, 10, 30);

  words.forEach(word => {
      // Determine the color based on the word's x-coordinate
      let color;

      if (word.x < canvas.width / 3) {
          color = 'yellow'; // Left section
      } else if (word.x < (2 * canvas.width) / 3) {
          color = 'orange'; // Middle section
      } else {
          color = 'red'; // Right section
      }

      // Get jitter value using the jitter function
      const jitter = getJitter(word.x, canvas.width);

      // Draw the word with the assigned color
      ctx.font = '20px Arial';
      ctx.fillStyle = color;
      ctx.fillText(word.text, word.x, word.y + jitter);

      // Move the word to the right
      word.x += speed;

      // Check if any word reaches the right edge
      if (word.x > canvas.width) {
          endGame(); // Trigger game over
      }
  });
}

// Handle Keyboard Input
window.addEventListener('keydown', (event) => {
    if (!gameActive && event.code === 'Space') {
        startGame(); // Start game on spacebar
        return;
    }

    if (gameActive) {
        const leadingWord = words[currentWordIndex];
        if (leadingWord && event.key === leadingWord.text[0]) {
            leadingWord.text = leadingWord.text.slice(1); // Remove the first character
            if (leadingWord.text.length === 0) {
                words.splice(currentWordIndex, 1); // Remove word if fully typed
                score++; // Increment score
                updateDifficulty(); // Adjust difficulty based on score
            }
        }
    }
});

// Adjust Difficulty Based on Score
function updateDifficulty() {
    if (score < 10) {
        spawnInterval = 3000; // 3 seconds
    } else if (score < 20) {
        spawnInterval = 2000; // 2 seconds
    } else if (score < 30) {
        spawnInterval = 1500; // 1.5 seconds
    } else {
        spawnInterval = 1000; // 1 second
    }
}

// Start Game
async function startGame() {
    gameActive = true;
    words = []; // Clear any remaining words
    currentWordIndex = 0;
    speed = 2; // Reset speed
    score = 0; // Reset score
    spawnInterval = 3000; // Reset spawn interval
    lastSpawnTime = performance.now(); // Reset spawn timer
    lastSpawnedWords = []; // Reset last spawned words queue

    await fetchWords(); // Fetch words before starting the game
}

// End Game
function endGame() {
    gameActive = false;

    // Update high score if needed
    if (score > highScore) {
        highScore = score;
        saveHighScore(); // Save the new high score to local storage
    }

    words = []; // Clear all words
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
    displayStartScreen();
}

// Display Start Screen
function displayStartScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Ensure canvas is fully cleared
    ctx.font = '30px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText("Press Space to begin the game", canvas.width / 2, canvas.height / 2);
    ctx.font = '20px Arial';
    ctx.fillText(`Highest Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 40); // Display high score
}

// Utility function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Game Loop
function gameLoop(timestamp) {
    if (gameActive) {
        drawWords();

        // Spawn new words based on spawnInterval
        if (timestamp - lastSpawnTime > spawnInterval) {
            spawnWord();
            lastSpawnTime = timestamp;
        }
    }
    requestAnimationFrame(gameLoop);
}

// Initialize Game
displayStartScreen();
requestAnimationFrame(gameLoop);