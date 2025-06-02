// Global variables
let video; // Video input
let handPose; // ml5.js Hand Pose Detection model
let hands = []; // Detected hand data

let gameStarted = false; // Is the game started?
let score = 0; // Player's score
let lives = 5; // Player's lives
let fallingItems = []; // Array to store all falling items
let targetChar = ''; // The current character to catch

let itemGenerationInterval = 1500; // Interval for generating falling items (milliseconds)
let lastItemGenerationTime = 0; // Time when the last item was generated

let startButton; // Start game button
let resetButton; // Play again button
let gameOver = false; // Is the game over?

// Preload function - loads the hand pose detection model
function preload() {
    // Model is flipped because video capture is flipped by default
    handPose = ml5.handPose({ flipped: true });
}

// Callback function when hand detection results are available
function gotHands(results) {
    hands = results;
}

// setup function - executed once when the program starts
function setup() {
    // Create canvas and attach it to the 'game-container' div
    let canvas = createCanvas(640, 480);
    canvas.parent('game-container'); // Attach the canvas to the specified div

    // Create video capture and hide it (it will be drawn on the canvas)
    video = createCapture(VIDEO, { flipped: true });
    video.hide();

    // Start detecting hands from the video stream
    handPose.detectStart(video, gotHands);

    // Get references to buttons and attach event listeners
    startButton = select('#startButton');
    startButton.mousePressed(startGame);

    resetButton = select('#resetButton');
    resetButton.mousePressed(startGame); // "Play again" button also calls startGame
    resetButton.hide(); // Hide "Play again" button initially
}

// Function to start or restart the game
function startGame() {
    gameStarted = true;
    score = 0;
    lives = 5;
    fallingItems = [];
    targetChar = generateRandomChar(); // Set the first target character
    lastItemGenerationTime = millis(); // Reset item generation timer
    gameOver = false;

    startButton.hide(); // Hide start button
    resetButton.hide(); // Hide reset button
}

// Main drawing loop - continuously executed
function draw() {
    // Draw the video stream as the background
    image(video, 0, 0, width, height);

    // Check if the game has not started yet
    if (!gameStarted) {
        displayStartScreen();
        return; // Exit the drawing loop early
    }

    // Check if the game is over
    if (gameOver) {
        displayGameOverScreen();
        return; // Exit the drawing loop early
    }

    // --- Game in progress ---
    // Display score, lives, and target character
    displayGameInfo();

    // Generate new falling items at a fixed interval
    if (millis() - lastItemGenerationTime > itemGenerationInterval) {
        fallingItems.push(createFallingItem());
        lastItemGenerationTime = millis();
    }

    // Update and draw all falling items
    // Loop backward to safely remove items from the array
    for (let i = fallingItems.length - 1; i >= 0; i--) {
        let item = fallingItems[i];
        item.y += item.speed; // Move item downwards

        // Draw the falling character
        drawFallingItem(item);

        // Check for collision with hands
        if (hands.length > 0) {
            let hand = hands[0]; // For simplicity, assume only one hand
            if (hand.confidence > 0.1) {
                // Calculate the "catching point" of the hand (average of wrist and middle finger base)
                let handX = (hand.keypoints[0].x + hand.keypoints[9].x) / 2;
                let handY = (hand.keypoints[0].y + hand.keypoints[9].y) / 2;
                let catchingRadius = 60; // Define the size of the hand catching area

                // (Optional) Draw a circle around the hand catching point for visual feedback
                // noFill();
                // stroke(0, 0, 255, 100); // Semi-transparent blue
                // strokeWeight(2);
                // ellipse(handX, handY, catchingRadius * 2);

                // Check the distance between the falling item and the hand's catching point
                let d = dist(item.x, item.y, handX, handY);
                if (d < item.radius + catchingRadius) { // Collision detected
                    handleCollision(item, i); // Handle the collision
                }
            }
        }

        // Check if the item has fallen off the screen
        if (item.y > height + item.radius) {
            handleOffScreenItem(item, i); // Handle items that fall off screen
        }
    }

    // Draw hand keypoints and skeleton lines
    drawHands();
}

// --- Helper functions for drawing and game logic ---

// Display start screen message
function displayStartScreen() {
    fill(255); // White text
    textSize(40);
    textAlign(CENTER, CENTER);
    text("手勢捕捉遊戲", width / 2, height / 2 - 50);
    textSize(20);
    text("用您的手捕捉目標字元！", width / 2, height / 2);
    startButton.show(); // Ensure start button is visible
}

// Display game over screen message
function displayGameOverScreen() {
    fill(255); // White text
    textSize(40);
    textAlign(CENTER, CENTER);
    text("遊戲結束！", width / 2, height / 2 - 50);
    textSize(30);
    text("最終得分: " + score, width / 2, height / 2);
    textSize(20);
    text("再玩一次以打破您的記錄！", width / 2, height / 2 + 50);
    resetButton.show(); // Show "Play again" button
}

// Display current score, lives, and target character during gameplay
function displayGameInfo() {
    fill(255); // White text
    textSize(24);
    textAlign(LEFT, TOP);
    text("得分: " + score, 10, 10);
    text("生命: " + lives, 10, 40);

    textSize(32);
    textAlign(CENTER, TOP);
    fill(0, 255, 0); // Target character in green
    text("捕捉: " + targetChar, width / 2, 10);
}

// Create a new falling item (random letter or number)
function createFallingItem() {
    let charType = random(['letter', 'number']);
    let char;
    if (charType === 'letter') {
        char = String.fromCharCode(65 + floor(random(26))); // A-Z
    } else {
        char = String(floor(random(10))); // 0-9
    }
    return {
        char: char,
        x: random(50, width - 50), // Random horizontal position
        y: -50, // Start from above the canvas
        speed: random(1.5, 3.5), // Random falling speed
        radius: 20 // Approximate radius for text character collision detection
    };
}

// Draw a falling item
function drawFallingItem(item) {
    fill(255, 200, 0); // Item color is orange-yellow
    textSize(item.radius * 1.5); // Adjust text size based on radius
    textAlign(CENTER, CENTER);
    text(item.char, item.x, item.y);
}

// Generate a random character (letter A-Z or number 0-9) as the target
function generateRandomChar() {
    let charType = random(['letter', 'number']);
    if (charType === 'letter') {
        return String.fromCharCode(65 + floor(random(26))); // A-Z
    } else {
        return String(floor(random(10))); // 0-9
    }
}

// Handle collision between a falling item and the hand
function handleCollision(item, index) {
    if (item.char === targetChar) {
        score++; // Correct catch
        targetChar = generateRandomChar(); // Set a new target
    } else {
        lives--; // Incorrect catch
    }
    fallingItems.splice(index, 1); // Remove the caught item
    checkGameOver(); // Check if the game is over due to this interaction
}

// Handle items that fall off the bottom of the screen
function handleOffScreenItem(item, index) {
    if (item.char === targetChar) {
        lives--; // Missed target character
    }
    fallingItems.splice(index, 1); // Remove the item that fell off screen
    checkGameOver(); // Check if the game is over due to this interaction
}

// Check if the game should end (out of lives)
function checkGameOver() {
    if (lives <= 0) {
        gameOver = true;
    }
}

// Draw hand keypoints and skeleton lines
function drawHands() {
    if (hands.length > 0) {
        for (let hand of hands) {
            if (hand.confidence > 0.1) { // Only draw if confidence is high enough
                let lineColor;
                // Assign different colors based on whether the hand is left or right
                if (hand.handedness == "Left") {
                    lineColor = color(255, 0, 255); // Left hand is magenta
                } else {
                    lineColor = color(255, 255, 0); // Right hand is yellow
                }
                stroke(lineColor);
                strokeWeight(3);

                // Draw lines connecting keypoints to form the hand skeleton
                // These connections are based on common hand pose models
                // Thumb
                line(hand.keypoints[0].x, hand.keypoints[0].y, hand.keypoints[1].x, hand.keypoints[1].y);
                line(hand.keypoints[1].x, hand.keypoints[1].y, hand.keypoints[2].x, hand.keypoints[2].y);
                line(hand.keypoints[2].x, hand.keypoints[2].y, hand.keypoints[3].x, hand.keypoints[3].y);
                line(hand.keypoints[3].x, hand.keypoints[3].y, hand.keypoints[4].x, hand.keypoints[4].y); // Thumb tip

                // Index finger
                line(hand.keypoints[0].x, hand.keypoints[0].y, hand.keypoints[5].x, hand.keypoints[5].y); // Wrist to index finger base
                line(hand.keypoints[5].x, hand.keypoints[5].y, hand.keypoints[6].x, hand.keypoints[6].y);
                line(hand.keypoints[6].x, hand.keypoints[6].y, hand.keypoints[7].x, hand.keypoints[7].y);
                line(hand.keypoints[7].x, hand.keypoints[7].y, hand.keypoints[8].x, hand.keypoints[8].y); // Index finger tip

                // Middle finger
                line(hand.keypoints[9].x, hand.keypoints[9].y, hand.keypoints[10].x, hand.keypoints[10].y);
                line(hand.keypoints[10].x, hand.keypoints[10].y, hand.keypoints[11].x, hand.keypoints[11].y);
                line(hand.keypoints[11].x, hand.keypoints[11].y, hand.keypoints[12].x, hand.keypoints[12].y); // Middle finger tip

                // Ring finger
                line(hand.keypoints[13].x, hand.keypoints[13].y, hand.keypoints[14].x, hand.keypoints[14].y);
                line(hand.keypoints[14].x, hand.keypoints[14].y, hand.keypoints[15].x, hand.keypoints[15].y);
                line(hand.keypoints[15].x, hand.keypoints[15].y, hand.keypoints[16].x, hand.keypoints[16].y); // Ring finger tip

                // Pinky finger
                line(hand.keypoints[0].x, hand.keypoints[0].y, hand.keypoints[17].x, hand.keypoints[17].y); // Wrist to pinky finger base
                line(hand.keypoints[17].x, hand.keypoints[17].y, hand.keypoints[18].x, hand.keypoints[18].y);
                line(hand.keypoints[18].x, hand.keypoints[18].y, hand.keypoints[19].x, hand.keypoints[19].y);
                line(hand.keypoints[19].x, hand.keypoints[19].y, hand.keypoints[20].x, hand.keypoints[20].y); // Pinky finger tip

                // Connect finger bases (palm lines)
                line(hand.keypoints[5].x, hand.keypoints[5].y, hand.keypoints[9].x, hand.keypoints[9].y);
                line(hand.keypoints[9].x, hand.keypoints[9].y, hand.keypoints[13].x, hand.keypoints[13].y);
                line(hand.keypoints[13].x, hand.keypoints[13].y, hand.keypoints[17].x, hand.keypoints[17].y);


                noStroke(); // No border for keypoints
                for (let i = 0; i < hand.keypoints.length; i++) {
                    fill(lineColor); // Fill with the same color as the lines
                    circle(hand.keypoints[i].x, hand.keypoints[i].y, 16); // Draw circles for keypoints
                }
            }
        }
    }
}
