// 儲存攝影機影像
let video;
// ml5.js 手部姿勢偵測模型
let handPose;
// 儲存偵測到的手部資訊
let hands = [];

// 儲存多個答案圓圈的陣列
let answerCircles = [];
// 圓圈半徑
let circleRadius = 50;
// 同時掉落的答案圓圈數量
let maxAnswerCircles = 3;

// 遊戲分數
let score = 0;
// 玩家生命值
let lives = 3;
// 遊戲狀態：'start' (開始), 'playing' (遊戲中), 'gameover' (遊戲結束)
let gameState = 'start';

// 數學問題陣列
let questions = [
    { question: "5 + 3 = ?", correctAnswer: 8, options: [8, 6, 9] },
    { question: "10 - 4 = ?", correctAnswer: 6, options: [5, 6, 7] },
    { question: "2 + 7 = ?", correctAnswer: 9, options: [8, 9, 10] },
    { question: "12 - 5 = ?", correctAnswer: 7, options: [6, 7, 8] },
    { question: "4 + 6 = ?", correctAnswer: 10, options: [9, 10, 11] },
    { question: "15 - 8 = ?", correctAnswer: 7, options: [6, 7, 9] },
    { question: "3 + 9 = ?", correctAnswer: 12, options: [11, 12, 13] },
    { question: "20 - 7 = ?", correctAnswer: 13, options: [12, 13, 14] },
    { question: "1 + 1 = ?", correctAnswer: 2, options: [1, 2, 3] },
    { question: "9 - 3 = ?", correctAnswer: 6, options: [5, 6, 4] }
];
// 當前顯示的問題
let currentQuestion;

// p5.js 預載入函式，用於載入 ml5.js 模型
function preload() {
    // 初始化 ml5.js 手部姿勢模型，並設定 flipped: true 以鏡像顯示影像
    handPose = ml5.handPose({ flipped: true });
}

// ml5.js 手部偵測的回呼函式
function gotHands(results) {
    hands = results; // 更新偵測到的手部資訊
}

// p5.js 設定函式，在程式啟動時執行一次
function setup() {
    // 創建畫布，並將其附加到 'p5-canvas-container' div 中
    const canvas = createCanvas(640, 480);
    canvas.parent('p5-canvas-container');

    // 創建攝影機影像，並設定 flipped: true 以鏡像顯示影像
    video = createCapture(VIDEO, { flipped: true });
    video.hide(); // 隱藏預設的攝影機元素

    // 啟動手部姿勢偵測
    handPose.detectStart(video, gotHands);

    updateOverlay(); // 根據遊戲狀態更新疊加層
    windowResized(); // 初始調整畫布大小以適應容器
}

// p5.js 繪圖函式，每幀重複執行（遊戲主循環）
function draw() {
    background(0); // 清除畫布，黑色背景
    // 顯示攝影機影像，並確保其填滿畫布
    image(video, 0, 0, width, height);

    // 根據遊戲狀態執行不同邏輯
    if (gameState === 'playing') {
        updateGame(); // 更新遊戲邏輯
        drawGameElements(); // 繪製遊戲元素
    } else {
        // 當不在遊戲中時，稍微調暗攝影機影像
        fill(0, 0, 0, 150); // 半透明黑色
        rect(0, 0, width, height); // 繪製覆蓋矩形
    }
}

// 更新遊戲邏輯的函式
function updateGame() {
    let roundEnded = false; // 標記本輪是否結束

    for (let i = answerCircles.length - 1; i >= 0; i--) {
        let circle = answerCircles[i];
        circle.y += circle.speed; // 更新圓圈位置

        // 檢查是否與手部關鍵點發生碰撞
        if (hands.length > 0) {
            for (let hand of hands) {
                if (hand.confidence > 0.1) {
                    const indexFinger = hand.keypoints[8]; // 食指尖端關鍵點
                    const thumb = hand.keypoints[4]; // 拇指尖端關鍵點

                    let dIndex = dist(indexFinger.x, indexFinger.y, circle.x, circle.y);
                    let dThumb = dist(thumb.x, thumb.y, circle.x, circle.y);

                    if (dIndex < circle.radius || dThumb < circle.radius) {
                        // 發生碰撞
                        if (circle.isCorrect) {
                            score++; // 答對加分
                        } else {
                            lives--; // 答錯扣生命
                        }
                        roundEnded = true; // 本輪結束
                        break; // 退出手部循環
                    }
                }
            }
        }

        // 檢查圓圈是否掉出畫面底部
        if (circle.y > height + circle.radius) {
            if (circle.isCorrect) {
                lives--; // 正確答案掉出畫面扣生命
            }
            roundEnded = true; // 本輪結束
        }

        if (roundEnded) {
            break; // 退出圓圈循環，因為本輪已經結束
        }
    }

    if (roundEnded) {
        if (lives <= 0) {
            gameState = 'gameover'; // 生命耗盡，遊戲結束
            updateOverlay(); // 更新疊加層顯示遊戲結束畫面
        } else {
            startNewRound(); // 開始新一輪遊戲
        }
    }
}

// 繪製遊戲元素的函式 (圓圈、手部關鍵點、分數、生命值、問題)
function drawGameElements() {
    // 繪製答案圓圈
    for (let circle of answerCircles) {
        fill(0, 255, 0); // 亮綠色
        noStroke(); // 無邊框
        ellipse(circle.x, circle.y, circle.radius * 2); // 繪製圓形

        // 繪製圓圈內的答案文字
        fill(0); // 黑色文字
        textSize(circle.radius * 0.8); // 字體大小根據圓圈大小調整
        textAlign(CENTER, CENTER); // 文字居中
        text(circle.value, circle.x, circle.y);
    }

    // 繪製手部關鍵點和連接線
    if (hands.length > 0) {
        for (let hand of hands) {
            if (hand.confidence > 0.1) {
                let lineColor;
                // 根據左右手設定不同的顏色
                if (hand.handedness == "Left") {
                    lineColor = color(255, 0, 255); // 左手為洋紅色
                } else {
                    lineColor = color(255, 255, 0); // 右手為黃色
                }
                stroke(lineColor); // 設定線條顏色
                strokeWeight(3); // 設定線條粗細

                // 定義手部關鍵點之間的連接關係
                const connections = [
                    [0, 1], [1, 2], [2, 3], [3, 4], // 拇指
                    [0, 5], [5, 6], [6, 7], [7, 8], // 食指
                    [0, 9], [9, 10], [10, 11], [11, 12], // 中指
                    [0, 13], [13, 14], [14, 15], [15, 16], // 無名指
                    [0, 17], [17, 18], [18, 19], [19, 20], // 小指
                    [5, 9], [9, 13], [13, 17] // 掌骨之間的連接
                ];

                // 繪製連接線
                for (let connection of connections) {
                    const p1 = hand.keypoints[connection[0]];
                    const p2 = hand.keypoints[connection[1]];
                    // 確保關鍵點存在才繪製
                    if (p1 && p2) {
                        line(p1.x, p1.y, p2.x, p2.y);
                    }
                }

                noStroke(); // 移除邊框
                // 繪製關鍵點為圓圈
                for (let i = 0; i < hand.keypoints.length; i++) {
                    fill(lineColor); // 設定填充顏色
                    circle(hand.keypoints[i].x, hand.keypoints[i].y, 16); // 繪製圓形關鍵點
                }
            }
        }
    }

    // 顯示分數和生命值
    fill(255); // 白色文字
    textSize(24); // 字體大小
    textAlign(LEFT, TOP); // 文字對齊方式
    text(`分數: ${score}`, 10, 10); // 顯示分數
    text(`生命: ${lives}`, 10, 40); // 顯示生命值

    // 顯示問題
    if (currentQuestion) {
        select('#question-display').html(currentQuestion.question);
        select('#question-display').removeClass('hidden');
    } else {
        select('#question-display').addClass('hidden');
    }
}

// 開始新一輪遊戲的函式
function startNewRound() {
    // 隨機選擇一個問題
    currentQuestion = random(questions);
    let options = shuffleArray([...currentQuestion.options]); // 複製並打亂選項

    answerCircles = []; // 清空之前的答案圓圈

    // 計算每個圓圈的水平間距
    let spacing = width / (maxAnswerCircles + 1);

    for (let i = 0; i < maxAnswerCircles; i++) {
        let optionValue = options[i];
        let isCorrect = (optionValue === currentQuestion.correctAnswer);

        answerCircles.push({
            x: (i + 1) * spacing, // 均勻分佈水平位置
            y: -circleRadius, // 從畫布上方開始下落
            radius: circleRadius,
            speed: 2 + score * 0.05, // 速度隨著分數增加而稍微加快
            value: optionValue,
            isCorrect: isCorrect
        });
    }
}

// 打亂陣列的函式 (Fisher-Yates shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 根據遊戲狀態更新疊加層內容的函式
function updateOverlay() {
    const overlay = select('#game-overlay'); // 獲取疊加層元素
    const title = select('#overlay-title'); // 獲取標題元素
    const message = select('#overlay-message'); // 獲取訊息元素
    const button = select('#overlay-button'); // 獲取按鈕元素

    if (gameState === 'start') {
        overlay.removeClass('hidden'); // 顯示疊加層
        title.html('手控教育遊戲'); // 設定標題
        message.html('用你的手指去觸碰正確答案的球！'); // 設定訊息
        button.html('開始遊戲'); // 設定按鈕文字
        button.mousePressed(startGame); // 設定按鈕點擊事件
    } else if (gameState === 'gameover') {
        overlay.removeClass('hidden'); // 顯示疊加層
        title.html('遊戲結束！'); // 設定標題
        message.html(`你的分數是: ${score}<br>再試一次，學習更多！`); // 顯示最終分數和鼓勵語
        button.html('再玩一次'); // 設定按鈕文字
        button.mousePressed(startGame); // 設定按鈕點擊事件
    } else {
        overlay.addClass('hidden'); // 隱藏疊加層 (遊戲中)
    }
}

// 開始遊戲的函式
function startGame() {
    score = 0; // 重置分數
    lives = 3; // 重置生命值
    gameState = 'playing'; // 設定遊戲狀態為遊戲中
    startNewRound(); // 開始第一輪遊戲
    updateOverlay(); // 更新疊加層 (隱藏)
}

// 處理視窗大小改變的函式，以確保畫布響應式顯示
function windowResized() {
    const container = select('#p5-canvas-container').elt; // 獲取畫布容器的原始 DOM 元素
    const newWidth = container.offsetWidth; // 獲取容器的當前寬度
    const newHeight = newWidth * (480 / 640); // 根據 4:3 的長寬比計算新的高度
    resizeCanvas(newWidth, newHeight); // 調整畫布大小
}
