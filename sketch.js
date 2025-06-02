// Hand Pose Detection with ml5.js
// https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];
let targetCircle;
let circleRadius = 50; // Half of the width/height

let indexFingerTouching = false;
let thumbTouching = false;

function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function gotHands(results) {
  hands = results;
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO, { flipped: true });
  video.hide();

  handPose.detectStart(video, gotHands);

  targetCircle = {
    x: width / 2,
    y: -circleRadius, // Start above the canvas
    radius: circleRadius,
    speed: 2, // Adjust for falling speed
  };
}

function draw() {
  image(video, 0, 0);

  // Update target circle position for falling
  targetCircle.y += targetCircle.speed;
  if (targetCircle.y > height + targetCircle.radius) {
    targetCircle.y = -targetCircle.radius; // Reset to the top
    targetCircle.x = random(width); // Random horizontal position
  }

  // Draw the target circle
  fill(0, 255, 0); // Bright green
  noStroke();
  ellipse(targetCircle.x, targetCircle.y, targetCircle.radius * 2);

  let leftIndexFinger = null;
  let rightIndexFinger = null;
  let leftThumb = null;
  let rightThumb = null;

  indexFingerTouching = false;
  thumbTouching = false;

  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {
        const indexFinger = hand.keypoints[8];
        const thumb = hand.keypoints[4];

        if (hand.handedness === "Left") {
          leftIndexFinger = indexFinger;
          leftThumb = thumb;
        } else if (hand.handedness === "Right") {
          rightIndexFinger = indexFinger;
          rightThumb = thumb;
        }

        // Draw hand keypoints and lines
        let lineColor;
        if (hand.handedness == "Left") {
          lineColor = color(255, 0, 255);
        } else {
          lineColor = color(255, 255, 0);
        }
        stroke(lineColor);
        strokeWeight(3);
        for (let i = 0; i < hand.keypoints.length - 1; i++) {
          line(hand.keypoints[i].x, hand.keypoints[i].y, hand.keypoints[i + 1].x, hand.keypoints[i + 1].y);
        }
        // Connect wrist to thumb base and pinky base
        line(hand.keypoints[0].x, hand.keypoints[0].y, hand.keypoints[1].x, hand.keypoints[1].y);
        line(hand.keypoints[0].x, hand.keypoints[0].y, hand.keypoints[17].x, hand.keypoints[17].y);


        noStroke();
        for (let i = 0; i < hand.keypoints.length; i++) {
          fill(lineColor);
          circle(hand.keypoints[i].x, hand.keypoints[i].y, 16);
        }
      }
    }

    // Index finger interaction (only detecting touch, not moving)
    let indexFingerClosest = null;
    let minIndexDist = Infinity;
    if (leftIndexFinger) {
      let d = dist(leftIndexFinger.x, leftIndexFinger.y, targetCircle.x, targetCircle.y);
      if (d < minIndexDist) {
        minIndexDist = d;
        indexFingerClosest = leftIndexFinger;
      }
    }
    if (rightIndexFinger) {
      let d = dist(rightIndexFinger.x, rightIndexFinger.y, targetCircle.x, targetCircle.y);
      if (d < minIndexDist) {
        minIndexDist = d;
        indexFingerClosest = rightIndexFinger;
      }
    }

    if (indexFingerClosest && minIndexDist < targetCircle.radius) {
      indexFingerTouching = true;
      // No longer moving the circle with the finger
    }

    // Thumb interaction (only detecting touch, not moving)
    let thumbClosest = null;
    let minThumbDist = Infinity;
    if (leftThumb) {
      let d = dist(leftThumb.x, leftThumb.y, targetCircle.x, targetCircle.y);
      if (d < minThumbDist) {
        minThumbDist = d;
        thumbClosest = leftThumb;
      }
    }
    if (rightThumb) {
      let d = dist(rightThumb.x, rightThumb.y, targetCircle.x, targetCircle.y);
      if (d < minThumbDist) {
        minThumbDist = d;
        thumbClosest = rightThumb;
      }
    }

    if (thumbClosest && minThumbDist < targetCircle.radius) {
      thumbTouching = true;
      // No longer moving the circle with the thumb
    }
  }
}
