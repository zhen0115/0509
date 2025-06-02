// 全域變數，用於儲存遊戲狀態和 DOM 元素
let score = 0;
let missedCircles = 0;
let gameStarted = false;
let isModelLoaded = false;

const MAX_MISSED_CIRCLES = 5;
const INITIAL_CIRCLE_SPEED = 2;
const INITIAL_SPAWN_INTERVAL = 1000; // 毫秒
const DIFFICULTY_INCREASE_RATE = 0.0005; // 每幀速度增加多少
const PINCH_THRESHOLD = 50; // 拇指和食指之間捏合的最大距離

// DOM 元素參考
let scoreDisplay;
let missedCirclesDisplay;
let gameMessageDisplay;
let startGameButton;

// p5.js 草圖變數
let video;
let handPose;
let hands = [];
let targetCircles = [];
let circleRadius = 30; // 掉落圓圈的半徑
let lastCircleSpawnTime = 0;
let currentCircleSpeed = INITIAL_CIRCLE_SPEED;
let currentSpawnInterval = INITIAL_SPAWN_INTERVAL;

// 在文件載入完成後初始化 DOM 元素和事件監聽器
window.onload = () => {
    scoreDisplay = document.getElementById('score');
    missedCirclesDisplay = document.getElementById('missedCircles');
    gameMessageDisplay = document.getElementById('gameMessage');
    startGameButton = document.getElementById('startGameButton');

    startGameButton.addEventListener('click', startGame);

    // 初始化 p5.js 草圖
    new p5(sketch, 'p5-canvas-container'); // 將草圖附加到指定的容器
};

// p5.js 草圖函數
const sketch = (p) => {
    // 預載入 handPose 模型
    p.preload = () => {
        console.log("正在載入 HandPose 模型...");
        handPose = ml5.handPose({ flipped: true }, () => {
            console.log("HandPose 模型已載入！");
            isModelLoaded = true; // 更新模型載入狀態
            startGameButton.disabled = false; // 啟用開始按鈕
            startGameButton.textContent = '開始遊戲';
        });
    };

    // 接收手部偵測結果的回調函數
    const gotHands = (results) => {
        hands = results;
    };

    // 設定畫布和視訊串流
    p.setup = () => {
        // 根據父容器的尺寸調整畫布大小
        const container = document.getElementById('p5-canvas-container');
        p.createCanvas(container.offsetWidth, container.offsetHeight).parent(container);

        video = p.createCapture(p.VIDEO, { flipped: true });
        video.hide(); // 隱藏 HTML 視訊元素，p5.js 將在畫布上繪製它

        // 一旦視訊準備就緒且模型載入完成，就開始手部偵測
        video.elt.onloadeddata = () => {
            if (isModelLoaded) {
                handPose.detectStart(video, gotHands);
            }
        };

        // 初始遊戲狀態設定
        resetGame();
    };

    // 主要繪圖迴圈
    p.draw = () => {
        p.image(video, 0, 0, p.width, p.height); // 繪製視訊畫面

        if (gameStarted) {
            // 隨著時間增加難度
            currentCircleSpeed += DIFFICULTY_INCREASE_RATE;
            // 最小生成間隔為 200 毫秒
            currentSpawnInterval = Math.max(200, INITIAL_SPAWN_INTERVAL - (p.millis() / 1000) * 50);

            // 生成新圓圈
            if (p.millis() - lastCircleSpawnTime > currentSpawnInterval) {
                targetCircles.push({
                    x: p.random(circleRadius, p.width - circleRadius),
                    y: -circleRadius,
                    radius: circleRadius,
                    speed: currentCircleSpeed,
                    color: p.color(p.random(100, 255), p.random(100, 255), p.random(100, 255)),
                    caught: false // 標誌，防止多次捕捉
                });
                lastCircleSpawnTime = p.millis();
            }

            // 更新並繪製圓圈
            for (let i = targetCircles.length - 1; i >= 0; i--) {
                let circle = targetCircles[i];
                circle.y += circle.speed;

                p.fill(circle.color);
                p.noStroke();
                p.ellipse(circle.x, circle.y, circle.radius * 2);

                // 檢查圓圈是否錯過
                if (circle.y - circle.radius > p.height) {
                    missedCircles++;
                    updateGameStats();
                    if (missedCircles >= MAX_MISSED_CIRCLES) {
                        endGame(); // 遊戲結束
                    }
                    targetCircles.splice(i, 1); // 移除錯過的圓圈
                }
            }

            // 手部互動邏輯
            if (hands.length > 0) {
                for (let hand of hands) {
                    if (hand.confidence > 0.1) {
                        const indexFinger = hand.keypoints[8]; // 食指尖
                        const thumb = hand.keypoints[4]; // 拇指尖

                        // 繪製手部關鍵點和線條
                        let lineColor;
                        if (hand.handedness === "Left") {
                            lineColor = p.color(255, 0, 255); // 左手為洋紅色
                        } else {
                            lineColor = p.color(255, 255, 0); // 右手為黃色
                        }
                        p.stroke(lineColor);
                        p.strokeWeight(3);

                        // 繪製關鍵點之間的連接（為清晰起見進行簡化）
                        const connections = [
                            [0, 1], [1, 2], [2, 3], [3, 4], // 拇指
                            [0, 5], [5, 6], [6, 7], [7, 8], // 食指
                            [0, 9], [9, 10], [10, 11], [11, 12], // 中指
                            [0, 13], [13, 14], [14, 15], [15, 16], // 無名指
                            [0, 17], [17, 18], [18, 19], [19, 20] // 小指
                        ];

                        for (let connection of connections) {
                            const p1 = hand.keypoints[connection[0]];
                            const p2 = hand.keypoints[connection[1]];
                            p.line(p1.x, p1.y, p2.x, p2.y);
                        }

                        p.noStroke();
                        for (let i = 0; i < hand.keypoints.length; i++) {
                            p.fill(lineColor);
                            p.circle(hand.keypoints[i].x, hand.keypoints[i].y, 10); // 較小的關鍵點圓圈
                        }

                        // 檢查捏合手勢
                        const pinchDistance = p.dist(indexFinger.x, indexFinger.y, thumb.x, thumb.y);
                        const isPinching = pinchDistance < PINCH_THRESHOLD;

                        // 檢查是否捕捉到圓圈
                        for (let i = targetCircles.length - 1; i >= 0; i--) {
                            let circle = targetCircles[i];
                            if (!circle.caught) { // 僅在尚未捕捉時處理
                                const distToIndex = p.dist(indexFinger.x, indexFinger.y, circle.x, circle.y);
                                if (distToIndex < circle.radius && isPinching) {
                                    // 圓圈被捕捉！
                                    score++;
                                    updateGameStats();
                                    circle.caught = true; // 標記為已捕捉
                                    targetCircles.splice(i, 1); // 移除已捕捉的圓圈
                                    // 可選：為已捕捉的圓圈添加視覺效果
                                    // 例如：p.fill(0, 255, 0, 100); p.ellipse(...)
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // 遊戲未開始或遊戲結束畫面
            p.fill(255, 255, 255, 150); // 半透明白色疊加
            p.rect(0, 0, p.width, p.height);
            p.fill(0);
            p.textSize(32);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(gameMessageDisplay.textContent, p.width / 2, p.height / 2 - 50);
            p.textSize(20);
            p.text('使用捏合手勢（拇指和食指）來接住圓圈！', p.width / 2, p.height / 2 + 20);
        }
    };

    // 處理視窗大小調整
    p.windowResized = () => {
        const container = document.getElementById('p5-canvas-container');
        p.resizeCanvas(container.offsetWidth, container.offsetHeight);
    };
};

// 重置遊戲狀態的函數
function resetGame() {
    score = 0;
    missedCircles = 0;
    targetCircles = [];
    lastCircleSpawnTime = 0;
    currentCircleSpeed = INITIAL_CIRCLE_SPEED;
    currentSpawnInterval = INITIAL_SPAWN_INTERVAL;
    updateGameStats();
}

// 更新遊戲統計數據顯示的函數
function updateGameStats() {
    scoreDisplay.textContent = score;
    missedCirclesDisplay.textContent = `${missedCircles}/${MAX_MISSED_CIRCLES}`;
}

// 開始或重新開始遊戲的函數
function startGame() {
    if (!isModelLoaded) {
        gameMessageDisplay.textContent = '模型尚未載入，請稍候...';
        return;
    }
    resetGame();
    gameStarted = true;
    gameMessageDisplay.textContent = '接住圓圈！';
    startGameButton.textContent = '重新開始遊戲';
}

// 結束遊戲的函數
function endGame() {
    gameStarted = false;
    gameMessageDisplay.textContent = `遊戲結束！您的分數: ${score}`;
    startGameButton.textContent = '重新開始遊戲';
    // 清除所有圓圈
    targetCircles = [];
    // 停止手部偵測，以釋放資源
    if (handPose) {
        handPose.detectStop();
    }
}

// 監聽視窗卸載事件以進行清理
window.addEventListener('beforeunload', () => {
    if (handPose) {
        handPose.detectStop();
    }
    if (video) {
        video.remove();
    }
});
