// Hand Pose Detection with ml5.js
// https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];
let targetCircle;
let circleRadius = 50; // Half of the width/height

function preload() {
  console.log("Preload is running");
  // Initialize HandPose model with flipped video input
  handPose = ml5.handPose({ flipped: true });
}

function gotHands(results) {
  hands = results;
}

function setup() {
  console.log("Setup is running");
  createCanvas(640, 480);
  video = createCapture(VIDEO, { flipped: true });
  video.hide();

  // Start detecting hands
  handPose.detectStart(video, gotHands);

  // Create the target circle in the center of the canvas
  targetCircle = {
    x: width / 2,
    y: height / 2,
    radius: circleRadius,
  };
  console.log("Target circle created:", targetCircle); // Check if the object is created
}

function draw() {
  console.log("Draw is running");
  image(video, 0, 0);

  // Explicitly set fill and noStroke before drawing
  fill(200);
  noStroke();
  ellipse(targetCircle.x, targetCircle.y, targetCircle.radius * 2);
  console.log("Drawing circle at:", targetCircle.x, targetCircle.y); // Check draw position

  // Ensure at least one hand is detected
  if (hands.length > 0) {
    let leftIndexFinger = null;
    let rightIndexFinger = null;

    for (let hand of hands) {
      if (hand.confidence > 0.1) {
        // Get the index finger keypoint (index 8)
        const indexFinger = hand.keypoints[8];

        // Determine if it's a left or right hand
        if (hand.handedness === "Left") {
          leftIndexFinger = indexFinger;
        } else if (hand.handedness === "Right") {
          rightIndexFinger = indexFinger;
        }

        // Draw the hand keypoints and lines
        let lineColor;
        if (hand.handedness == "Left") {
          lineColor = color(255, 0, 255);
        } else {
          lineColor = color(255, 255, 0);
        }
        stroke(lineColor);
        strokeWeight(3);

        line(hand.keypoints[0].x, hand.keypoints[0].y, hand.keypoints[1].x, hand.keypoints[1].y);
        line(hand.keypoints[1].x, hand.keypoints[1].y, hand.keypoints[2].x, hand.keypoints[2].y);
        line(hand.keypoints[2].x, hand.keypoints[2].y, hand.keypoints[3].x, hand.keypoints[3].y);
        line(hand.keypoints[3].x, hand.keypoints[3].y, hand.keypoints[4].x, hand.keypoints[4].y);

        line(hand.keypoints[5].x, hand.keypoints[5].y, hand.keypoints[6].x, hand.keypoints[6].y);
        line(hand.keypoints[6].x, hand.keypoints[6].y, hand.keypoints[7].x, hand.keypoints[7].y);
        line(hand.keypoints[7].x, hand.keypoints[7].y, hand.keypoints[8].x, hand.keypoints[8].y);

        line(hand.keypoints[9].x, hand.keypoints[9].y, hand.keypoints[10].x, hand.keypoints[10].y);
        line(hand.keypoints[10].x, hand.keypoints[10].y, hand.keypoints[11].x, hand.keypoints[11].y);
        line(hand.keypoints[11].x, hand.keypoints[11].y, hand.keypoints[12].x, hand.keypoints[12].y);

        line(hand.keypoints[13].x, hand.keypoints[13].y, hand.keypoints[14].x, hand.keypoints[14].y);
        line(hand.keypoints[14].x, hand.keypoints[14].y, hand.keypoints[15].x, hand.keypoints[15].y);
        line(hand.keypoints[15].x, hand.keypoints[15].y, hand.keypoints[16].x, hand.keypoints[16].y);

        line(hand.keypoints[17].x, hand.keypoints[17].y, hand.keypoints[18].x, hand.keypoints[18].y);
        line(hand.keypoints[18].x, hand.keypoints[18].y, hand.keypoints[19].x, hand.keypoints[19].y);
        line(hand.keypoints[19].x, hand.keypoints[19].y, hand.keypoints[20].x, hand.keypoints[20].y);

        noStroke();
        for (let i = 0; i < hand.keypoints.length; i++) {
          let keypoint = hand.keypoints[i];
          if (hand.handedness == "Left") {
            fill(255, 0, 255);
          } else {
            fill(255, 255, 0);
          }
          circle(keypoint.x, keypoint.y, 16);
        }
      }
    }

    // Check for collision with left index finger
    if (leftIndexFinger) {
      let d = dist(leftIndexFinger.x, leftIndexFinger.y, targetCircle.x, targetCircle.y);
      if (d < targetCircle.radius) {
        targetCircle.x = leftIndexFinger.x;
        targetCircle.y = leftIndexFinger.y;
      }
    }

    // Check for collision with right index finger
    if (rightIndexFinger) {
      let d = dist(rightIndexFinger.x, rightIndexFinger.y, targetCircle.x, targetCircle.y);
      if (d < targetCircle.radius) {
        targetCircle.x = rightIndexFinger.x;
        targetCircle.y = rightIndexFinger.y;
      }
    }
  }
}
