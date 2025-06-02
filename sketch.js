// Firebase setup (placeholder for future use, not used in this game version)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables for Firebase (if used)
let db;
let auth;
let userId;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
// FIX: Corrected typo here from `initialAuthToken` to `__initial_auth_token`
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase if config is available
if (Object.keys(firebaseConfig).length > 0) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Sign in anonymously or with custom token
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
                userId = auth.currentUser?.uid || crypto.randomUUID();
                console.log("Firebase authenticated. User ID:", userId);
            } catch (error) {
                console.error("Firebase authentication error:", error);
                userId = crypto.randomUUID(); // Fallback to random ID
            }
        } else {
            userId = user.uid;
            console.log("Firebase user already signed in. User ID:", userId);
        }
    });
} else {
    console.warn("Firebase config not found. Running without Firebase features.");
    userId = crypto.randomUUID(); // Generate a random ID if Firebase is not configured
}

// Global game variables
let video;
let handPose;
let hands = [];
let fallingNumbers = [];
let score = 0;
let gameTimer = 0;
const gameDuration = 60; // seconds
const numberRadius = 30; // Radius of falling numbers

// Game states
const GAME_STATE = {
    LOADING: 'LOADING', // New loading state
    START_SCREEN: 'START_SCREEN',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER'
};
let currentGameState = GAME_STATE.LOADING; // Start in loading state

// Flags for readiness
let modelLoaded = false;
let videoReady = false;
let handPoseDetectionStarted = false; // New flag to track if handPose.detectStart has been called

// UI elements
const scoreDisplay = document.getElementById('scoreDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const gameOverlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');

// Function to show custom message box
function showMessageBox(message) {
    messageText.textContent = message;
    messageBox.style.display = 'block';
}

// Function to hide custom message box
function hideMessageBox() {
    messageBox.style.display = 'none';
}

// Callback when ml5.js model is loaded
function modelReady() {
    console.log('HandPose model loaded!');
    modelLoaded = true;
    checkReadinessAndTransition();
}

// Callback when video is loaded and ready to stream
function videoLoadSuccess(stream) {
    console.log('Video loaded successfully!');
    videoReady = true;
    // Explicitly set srcObject if createCapture doesn't handle it immediately
    // This is often not strictly necessary with p5.js createCapture but can help ensure display
    if (video && video.elt && !video.elt.srcObject) {
        video.elt.srcObject = stream;
    }

    // Start hand pose detection only after video is confirmed ready and stream is available
    if (!handPoseDetectionStarted) {
        handPose.detectStart(video, gotHands);
        handPoseDetectionStarted = true;
        console.log('HandPose detection started.');
    }
    checkReadinessAndTransition();
}

// Callback if video loading fails
function videoLoadError(err) {
    console.error('Video capture error:', err);
    showMessageBox('無法啟動攝影機。請檢查攝影機權限並重新整理頁面。');
    // Transition to an error state where game cannot start
    currentGameState = GAME_STATE.GAME_OVER; // Use GAME_OVER to indicate unplayable state
    overlayTitle.textContent = '錯誤！';
    overlayMessage.innerHTML = '無法啟動攝影機。請檢查攝影機權限並重新整理頁面。';
    startButton.classList.add('hidden');
    restartButton.classList.add('hidden');
    gameOverlay.classList.remove('hidden');
    noLoop(); // Stop draw loop
}

// Check if both model and video are ready to transition to start screen
function checkReadinessAndTransition() {
    if (modelLoaded && videoReady && handPoseDetectionStarted && currentGameState === GAME_STATE.LOADING) {
        currentGameState = GAME_STATE.START_SCREEN;
        overlayTitle.textContent = '數字捕捉大挑戰';
        overlayMessage.innerHTML = `
            用食指捕捉偶數，用拇指捕捉奇數！<br>
            準備好了嗎？
        `;
        startButton.classList.remove('hidden');
        restartButton.classList.add('hidden');
        gameOverlay.classList.remove('hidden'); // Ensure overlay is visible for start screen
        loop(); // Start draw loop to show overlay
    } else if (currentGameState === GAME_STATE.LOADING) {
        // Update loading message based on what's ready
        let loadingMsg = '載入中...<br>';
        if (modelLoaded) {
            loadingMsg += '模型已載入。<br>';
        } else {
            loadingMsg += '等待模型載入...<br>';
        }
        if (videoReady) {
            loadingMsg += '攝影機已準備。<br>';
        } else {
            loadingMsg += '等待攝影機準備...<br>';
        }
        overlayMessage.innerHTML = loadingMsg;
        gameOverlay.classList.remove('hidden'); // Ensure overlay is visible during loading
    }
}


// p5.js preload function
window.preload = function() {
    // Initialize ml5 handPose model, passing modelReady as a callback
    handPose = ml5.handPose({ flipped: true }, modelReady);
}

// Callback function for ml5 handPose detection
window.gotHands = function(results) {
    hands = results;
}

// p5.js setup function
window.setup = function() {
    const canvas = createCanvas(640, 480);
    canvas.parent('p5-canvas-container'); // Attach canvas to the specific div

    // Attempt to create video capture, passing videoLoadSuccess as a callback
    // The second argument to createCapture is the success callback for the stream
    video = createCapture(VIDEO, { flipped: true }, videoLoadSuccess);
    video.hide();
    // Add an error handler for the underlying video element
    video.elt.onerror = videoLoadError;

    // handPose.detectStart is now called inside videoLoadSuccess
    // Initialize falling numbers (only if game is not in an error state)
    if (currentGameState !== GAME_STATE.GAME_OVER) {
        for (let i = 0; i < 5; i++) { // Start with a few numbers on screen
            fallingNumbers.push(createFallingNumber());
        }
    }

    // Set up event listeners for buttons
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);

    // Initial UI update for loading state
    updateUI();
    checkReadinessAndTransition(); // Check initial readiness and update overlay
    noLoop(); // Pause draw loop initially until everything is ready
}

// Function to create a new falling number object
function createFallingNumber() {
    const value = floor(random(1, 100)); // Random number between 1 and 99
    return {
        x: random(numberRadius, width - numberRadius), // Random horizontal position
        y: -numberRadius, // Start above the canvas
        value: value,
        radius: numberRadius,
        speed: random(1.5, 3.5), // Random falling speed
        caught: false // Flag to check if it's caught
    };
}

// Function to start or restart the game
function startGame() {
    score = 0;
    gameTimer = gameDuration;
    fallingNumbers = [];
    for (let i = 0; i < 5; i++) {
        fallingNumbers.push(createFallingNumber());
    }
    currentGameState = GAME_STATE.PLAYING;
    gameOverlay.classList.add('hidden'); // Hide overlay
    updateUI();
    loop(); // Resume draw loop if paused
}

// Function to end the game
function endGame() {
    currentGameState = GAME_STATE.GAME_OVER;
    overlayTitle.textContent = '遊戲結束！';
    overlayMessage.innerHTML = `您的最終分數是：<span class="text-green-400 font-bold">${score}</span><br>再玩一次？`;
    startButton.classList.add('hidden');
    restartButton.classList.remove('hidden');
    gameOverlay.classList.remove('hidden'); // Show overlay
    noLoop(); // Pause the draw loop
}

// Function to update score and timer display
function updateUI() {
    scoreDisplay.textContent = `分數: ${score}`;
    timerDisplay.textContent = `時間: ${floor(gameTimer)}`;
}

// p5.js draw function - main game loop
window.draw = function() {
    // Always draw a background, even if video isn't ready, to avoid black screen
    background(0); // Black background for the canvas

    if (currentGameState === GAME_STATE.PLAYING) {
        // Only draw video and hands if they are ready
        if (videoReady) {
            image(video, 0, 0, width, height);
            // If video is ready but no hands are detected, show a message
            if (hands.length === 0) {
                fill(255, 255, 255, 150); // Semi-transparent white
                textAlign(CENTER, CENTER);
                textSize(20);
                text('請將手放在攝影機前', width / 2, height / 2 + 50);
            }
        } else {
            // Display a message if video is not ready
            fill(255);
            textAlign(CENTER, CENTER);
            textSize(24);
            text('攝影機中斷，請檢查...', width / 2, height / 2);
        }


        // Update game timer
        gameTimer -= deltaTime / 1000; // deltaTime is in milliseconds
        if (gameTimer <= 0) {
            gameTimer = 0;
            endGame();
        }
        updateUI();

        // Process each hand detected
        let leftIndexFinger = null;
        let rightIndexFinger = null;
        let leftThumb = null;
        let rightThumb = null;

        if (hands.length > 0) {
            for (let hand of hands) {
                // Only process hands with sufficient confidence
                if (hand.confidence > 0.1) {
                    // Get keypoints for index finger tip (8) and thumb tip (4)
                    const indexFinger = hand.keypoints[8];
                    const thumb = hand.keypoints[4];

                    // Assign fingers based on handedness
                    if (hand.handedness === "Left") {
                        leftIndexFinger = indexFinger;
                        leftThumb = thumb;
                    } else if (hand.handedness === "Right") {
                        rightIndexFinger = indexFinger;
                        rightThumb = thumb;
                    }

                    // Draw hand keypoints and lines for visualization
                    let lineColor;
                    if (hand.handedness == "Left") {
                        lineColor = color(255, 0, 255); // Magenta for left hand
                    } else {
                        lineColor = color(255, 255, 0); // Yellow for right hand
                    }
                    stroke(lineColor);
                    strokeWeight(3);

                    // Draw lines connecting keypoints (simplified for clarity)
                    // This part is for visual feedback of the hand skeleton
                    const connections = [
                        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
                        [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
                        [5, 9], [9, 10], [10, 11], [11, 12], // Middle finger
                        [9, 13], [13, 14], [14, 15], [15, 16], // Ring finger
                        [0, 17], [17, 18], [18, 19], [19, 20] // Pinky finger
                    ];
                    for (let conn of connections) {
                        line(hand.keypoints[conn[0]].x, hand.keypoints[conn[0]].y,
                             hand.keypoints[conn[1]].x, hand.keypoints[conn[1]].y);
                    }

                    noStroke();
                    for (let i = 0; i < hand.keypoints.length; i++) {
                        fill(lineColor);
                        circle(hand.keypoints[i].x, hand.keypoints[i].y, 10); // Smaller circles for keypoints
                    }
                }
            }
        }

        // Update and draw falling numbers
        for (let i = fallingNumbers.length - 1; i >= 0; i--) {
            let num = fallingNumbers[i];

            // Update number position
            num.y += num.speed;

            // Check for collisions with fingers
            let caughtByFinger = false;
            let fingerUsed = null; // 'index' or 'thumb'

            // Check all detected hands
            for (let hand of hands) {
                if (hand.confidence > 0.1) {
                    const indexFinger = hand.keypoints[8];
                    const thumb = hand.keypoints[4];

                    // Check index finger collision
                    if (dist(indexFinger.x, indexFinger.y, num.x, num.y) < num.radius) {
                        caughtByFinger = true;
                        fingerUsed = 'index';
                        break; // Only need one finger to catch
                    }
                    // Check thumb collision
                    if (dist(thumb.x, thumb.y, num.x, num.y) < num.radius) {
                        caughtByFinger = true;
                        fingerUsed = 'thumb';
                        break; // Only need one finger to catch
                    }
                }
            }

            if (caughtByFinger && !num.caught) {
                num.caught = true; // Mark as caught to prevent multiple hits

                if (fingerUsed === 'index' && num.value % 2 === 0) {
                    // Correct catch: Index finger catches even number
                    score += 10;
                    showMessageBox(`成功！您用食指捕捉了偶數 ${num.value}。+10 分！`);
                } else if (fingerUsed === 'thumb' && num.value % 2 !== 0) {
                    // Correct catch: Thumb catches odd number
                    score += 10;
                    showMessageBox(`成功！您用拇指捕捉了奇數 ${num.value}。+10 分！`);
                } else {
                    // Incorrect catch
                    score = max(0, score - 5); // Deduct points, but not below 0
                    const correctFinger = (num.value % 2 === 0) ? '食指' : '拇指';
                    showMessageBox(`錯誤！您應該用 ${correctFinger} 捕捉 ${num.value}。-5 分！`);
                }
                updateUI();
                // Remove the caught number and add a new one
                fallingNumbers.splice(i, 1);
                fallingNumbers.push(createFallingNumber());
            }

            // If number goes off-screen, remove it and add a new one
            if (num.y > height + num.radius) {
                fallingNumbers.splice(i, 1);
                fallingNumbers.push(createFallingNumber());
            }

            // Draw the number
            fill(255, 100, 100); // Reddish color for numbers
            noStroke();
            ellipse(num.x, num.y, num.radius * 2);

            // Draw the number value
            fill(255); // White text
            textAlign(CENTER, CENTER);
            textSize(num.radius * 0.8);
            text(num.value, num.x, num.y);
        }
    } else if (currentGameState === GAME_STATE.LOADING) {
        // Draw loading message on canvas as well
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        let loadingMsg = '載入中...';
        if (modelLoaded) loadingMsg += '\n模型已載入。';
        if (videoReady) loadingMsg += '\n攝影機已準備。';
        text(loadingMsg, width / 2, height / 2);
    } else if (currentGameState === GAME_STATE.START_SCREEN) {
        // Overlay is visible, showing start game message.
        // No additional drawing needed on canvas for start screen, as overlay covers it.
    } else if (currentGameState === GAME_STATE.GAME_OVER) {
        // Game over screen is handled by endGame() and noLoop()
        // Overlay is visible, showing game over message.
    }
}
