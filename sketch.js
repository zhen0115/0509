// Hand Pose Detection with ml5.js
// https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];
let targetCircle;
let circleRadius = 50; // Half of the width/height

let indexFingerTouching = false;
let thumbTouching = false;

let indexFingerPath = [];
let thumbPath = [];

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
    y: height / 2,
    radius: circleRadius,
  };
}

function draw() {
  image(video, 0, 0);

  // Draw the paths
  stroke(255, 0, 0); // Red for index finger
  strokeWeight(3);
  noFill();
  beginShape();
  for (let point of indexFingerPath) {
    vertex(point.x, point.y);
  }
  endShape();

  stroke(0, 255, 0); // Green for thumb
  strokeWeight(3);
  noFill();
  beginShape();
  for (let point of thumbPath) {
    vertex(point.x, point.y);
  }
  endShape();

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

    // Index finger interaction
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
      targetCircle.x = indexFingerClosest.x;
      targetCircle.y = indexFingerClosest.y;
      indexFingerTouching = true;
      indexFingerPath.push({ x: targetCircle.x, y: targetCircle.y });
    } else {
      // Optionally clear the path when not touching
      // indexFingerPath = [];
    }

    // Thumb interaction
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
      targetCircle.x = thumbClosest.x;
      targetCircle.y = thumbClosest.y;
      thumbTouching = true;
      thumbPath.push({ x: targetCircle.x, y: targetCircle.y });
    } else {
      // Optionally clear the path when not touching
      // thumbPath = [];
    }
  }
}
