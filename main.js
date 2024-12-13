const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let words = [];
let fetchedWords = []; // words fetched from the API
let lastSpawnedWords = [];
let wordSpeed = 2;
let currentWordIndex = 0;
let gameActive = false;
let score = 0;
let highScore = loadHighScore(); // load high score from local storage
let spawnInterval = 3000; // initial spawn interval in milliseconds
let lastSpawnTime = 0;

function loadHighScore() {
    const storedHighScore = localStorage.getItem('highScore');
    return storedHighScore ? parseInt(storedHighScore, 10) : 0;
}

function saveHighScore() {
    localStorage.setItem('highScore', highScore);
}

// fetch words from Datamuse API
async function fetchWords() {
    try {
        const response = await fetch('https://api.datamuse.com/words?ml=life&max=50'); // ml=word_category, max=number_of_words_to_fetch
        const data = await response.json();
        fetchedWords = shuffleArray(data.map(word => word.word));
        //console.log('Fetched Words:', fetchedWords);
    } catch (error) {
        console.error('Error fetching words:', error);
        fetchedWords = ['error', 'loading', 'retry']; // fallback words in case of error
    }
}

// get random word from fetched words
function getRandomWord() {
    if (fetchedWords.length === 0) return 'loading';
    return fetchedWords[Math.floor(Math.random() * fetchedWords.length)];
}

function spawnWord() {
    let word;
    let attempts = 0;

    // retry until a valid word is found or max attempts are reached
    do {
        word = getRandomWord();
        attempts++;
    } while (lastSpawnedWords.includes(word) && attempts < 10);

    if (attempts >= 10) {
        console.warn('Failed to find a non-duplicate word after 10 attempts');
        return;
    }

    const wordObj = {
        text: word,
        x: 0,
        y: canvas.height / 2 + (Math.random() * 400 - 200), // wide y-axis range
    };

    // logic to avoid overlap on the canvas
    attempts = 0;
    while (words.some(w => Math.abs(w.y - wordObj.y) < 50) && attempts < 10) {
        wordObj.y = canvas.height / 2 + (Math.random() * 400 - 200);
        attempts++;
    }

    if (attempts < 10) {
        words.push(wordObj);
        updateLastSpawnedWords(word); // update the last spawned words queue
    }
}

function updateLastSpawnedWords(newWord) {
    lastSpawnedWords.push(newWord);

    if (lastSpawnedWords.length > 20) { // queue only keeps the last 20 words
        lastSpawnedWords.shift(); // remove the oldest word
    }
}

function drawWords() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw score
    ctx.font = '30px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);

    words.forEach(word => {
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(word.text, word.x, word.y);
        word.x += wordSpeed; // move the word

        if (word.x > canvas.width) {
            endGame(); // trigger game over
        }
    });
}

// handle keyboard input
window.addEventListener('keydown', (event) => {
    if (!gameActive && event.code === 'Space') {
        startGame();
        return;
    }

    if (gameActive) {
        const leadingWord = words[currentWordIndex];
        if (leadingWord && event.key === leadingWord.text[0]) {
            leadingWord.text = leadingWord.text.slice(1); // remove the first character
            if (leadingWord.text.length === 0) {
                words.splice(currentWordIndex, 1); // remove word if fully typed
                score++;
                updateDifficulty();
            }
        }
    }
});

// adjust difficulty
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

async function startGame() {
    gameActive = true;
    words = [];
    currentWordIndex = 0;
    wordSpeed = 2;
    score = 0;
    spawnInterval = 3000;
    lastSpawnTime = performance.now();
    lastSpawnedWords = [];

    await fetchWords(); // fetch words before starting the game
}

function endGame() {
    gameActive = false;

    if (score > highScore) {
        highScore = score;
        saveHighScore();
    }

    words = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    displayStartScreen();
}

function displayStartScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '45px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText("Press Space to begin the game", canvas.width / 2, canvas.height / 2);
    ctx.font = '30px Arial';
    ctx.fillText(`Highest Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 40);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function gameLoop(timestamp) {
    if (gameActive) {
        drawWords();

        if (timestamp - lastSpawnTime > spawnInterval) {
            spawnWord();
            lastSpawnTime = timestamp;
        }
    }
    requestAnimationFrame(gameLoop);
}

displayStartScreen();
requestAnimationFrame(gameLoop);