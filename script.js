const WIDTH = 600;
const HEIGHT = 600;
const ROWS = 20;
const COLS = 20;
const CELL_SIZE = WIDTH / COLS;

let scene, camera, renderer;
let snake, food;
let direction = { x: 1, y: 0 };
let snakeBody = [{ x: 10, y: 10 }];
let gameInterval;
let score = 0;
let gameStarted = false; // Flag to track if the game has started

let userProfile = null;

function init() {
    loading(); // Start loading

    // Request user profile from Playdeck
    requestUserProfile();

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(WIDTH / -2, WIDTH / 2, HEIGHT / 2, HEIGHT / -2, 1, 1000);
    camera.position.z = 500;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(WIDTH, HEIGHT);
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    snake = new THREE.Group();
    scene.add(snake);

    food = new THREE.Mesh(
        new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    scene.add(food);

    // Optional: Add a play button listener
    document.getElementById('playButton').addEventListener('click', startGame);

    window.addEventListener('keydown', onKeyPress);
    window.addEventListener('message', handlePlaydeckMessage);

    setTimeout(() => {
        loading(100); // Simulate completion after 1 second
    }, 1000);

    animate();
}

function loading(pct) {
    if (pct === undefined) {
        // Simulate loading up to 80% if no percentage is provided
        pct = 80;
    }

    const payload = {
        playdeck: {
            method: 'loading',
            value: pct,
        },
    };
    window.parent.postMessage(payload, '*');

    // Handle the transition to Play button when loading reaches 100%
    if (pct === 100) {
        document.getElementById('playButton').disabled = false; // Enable Play button
    }
}

function requestUserProfile() {
    const { parent } = window;
    parent.postMessage({ playdeck: { method: 'getUserProfile' } }, '*');
}

function setData(key, data) {
    const { parent } = window;
    parent.postMessage({ playdeck: { method: 'setData', key: key, value: data } }, '*');
}

function getData(key) {
    const { parent } = window;
    parent.postMessage({ playdeck: { method: 'getData', key: key } }, '*');
}

function sendGameProgress(achievements, progress) {
    const payload = {
        playdeck: {
            method: 'sendGameProgress',
            value: {
                achievements,
                progress
            }
        }
    };
    window.parent.postMessage(payload, '*');
}

function handlePlaydeckMessage({ data }) {
    const playdeck = data?.playdeck;
    if (!playdeck) return;

    if (playdeck.method === 'getUserProfile') {
        userProfile = playdeck.value;
        console.log(userProfile); // Log the user profile data
        // Optionally, use the user profile data in your game
    }

    if (playdeck.method === 'getData') {
        const { key, value } = playdeck;
        // Handle received data based on key
        switch (key) {
            case 'snakeData':
                handleSnakeData(value);
                break;
            // Add more cases for other keys as needed
        }
    }

    if (playdeck.method === 'play' && !gameStarted) {
        startGame(); // Start the game only if it hasn't started already
    }

    if (playdeck.method === 'getPlaydeckState') {
        window.playdeckIsOpen = playdeck.value;
    }

    if (playdeck.method === 'requestPayment') {
        console.log(playdeck.value); // Payment link
        // Open the payment link
        window.open(playdeck.value.url, '_blank');
    }

    if (playdeck.method === 'getPaymentInfo') {
        const paymentInfo = playdeck.value;
        console.log(paymentInfo); // PaymentInfo object
        // Handle payment status
    }
}

function startGame() {
    gameStarted = true; // Mark the game as started
    gameInterval = setInterval(update, 200);
    gtag('event', 'start_game');

    // Hide the play button
    document.getElementById('playButton').style.display = 'none';

    snakeBody = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    score = 0;

    placeFood();
    renderSnake();
}

function onKeyPress(event) {
    if (!gameStarted) return; // Exit if the game hasn't started yet

    switch (event.keyCode) {
        case 37: // Left arrow
            if (direction.x === 0) direction = { x: -1, y: 0 };
            break;
        case 38: // Up arrow
            if (direction.y === 0) direction = { x: 0, y: 1 };
            break;
        case 39: // Right arrow
            if (direction.x === 0) direction = { x: 1, y: 0 };
            break;
        case 40: // Down arrow
            if (direction.y === 0) direction = { x: 0, y: -1 };
            break;
    }
}

function placeFood() {
    const x = Math.floor(Math.random() * COLS) * CELL_SIZE - WIDTH / 2 + CELL_SIZE / 2;
    const y = Math.floor(Math.random() * ROWS) * CELL_SIZE - HEIGHT / 2 + CELL_SIZE / 2;
    food.position.set(x, y, 0);
}

function update() {
    const head = { ...snakeBody[0] };
    head.x += direction.x;
    head.y += direction.y;

    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || snakeBody.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    snakeBody.unshift(head);

    if (head.x === food.position.x / CELL_SIZE + COLS / 2 && head.y === food.position.y / CELL_SIZE + ROWS / 2) {
        placeFood();
        gtag('event', 'food_eaten');
        score++;

        // Send game progress for eating food
        sendGameProgress(
            [{ name: 'Food Eaten', description: 'Eat food in the game', points: 10 }],
            { level: score }
        );

    } else {
        snakeBody.pop();
    }

    renderSnake();
}

function renderSnake() {
    snake.children.forEach(child => snake.remove(child));
    snakeBody.forEach(segment => {
        const segmentMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        segmentMesh.position.set(
            segment.x * CELL_SIZE - WIDTH / 2 + CELL_SIZE / 2,
            segment.y * CELL_SIZE - HEIGHT / 2 + CELL_SIZE / 2,
            0
        );
        snake.add(segmentMesh);
    });
}

function handleSnakeData(data) {
    // Handle received snake data
    console.log('Received snake data:', data);
    // Example: Update game state based on received data
    snakeBody = JSON.parse(data);
    renderSnake();
}

function gameOver() {
    clearInterval(gameInterval);
    gtag('event', 'game_over', { score: score });
    alert(`Game Over! Your score: ${score}`);

    // Show the play button again
    document.getElementById('playButton').style.display = 'block';

    // Notify Playdeck of game end
    const payload = {
        playdeck: {
            method: 'gameEnd',
        },
    };
    window.parent.postMessage(payload, '*');

    // Send game progress for game over
    sendGameProgress(
        [{ name: 'Game Over', description: 'End of the game', points: score * 10 }],
        { level: score, xp: score * 10 }
    );

    // Reset game state
    gameStarted = false; // Reset game started flag
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

init();
