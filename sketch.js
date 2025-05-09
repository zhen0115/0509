// Hand Pose Detection with ml5.js
// https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];

function preload() {
  // Initialize HandPose model with flipped video input
  handPose = ml5.handPose({ flipped: true });
}

function mousePressed() {
  console.log(hands);
}

function gotHands(results) {
  hands = results;
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO, { flipped: true });
  video.hide();

  // Start detecting hands
  handPose.detectStart(video, gotHands);
}

function draw() {
  image(video, 0, 0);

  // Ensure at least one hand is detected
  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {
        // Color-code based on left or right hand
        let lineColor;
        if (hand.handedness == "Left") {
          lineColor = color(255, 0, 255); // Magenta for left hand
        } else {
          lineColor = color(255, 255, 0); // Yellow for right hand
        }
        stroke(lineColor);
        strokeWeight(3);

        // Connect keypoints 0 to 4 (Thumb)
        line(
          hand.keypoints[0].x,
          hand.keypoints[0].y,
          hand.keypoints[1].x,
          hand.keypoints[1].y
        );
        line(
          hand.keypoints[1].x,
          hand.keypoints[1].y,
          hand.keypoints[2].x,
          hand.keypoints[2].y
        );
        line(
          hand.keypoints[2].x,
          hand.keypoints[2].y,
          hand.keypoints[3].x,
          hand.keypoints[3].y
        );
        line(
          hand.keypoints[3].x,
          hand.keypoints[3].y,
          hand.keypoints[4].x,
          hand.keypoints[4].y
        );

        // Connect keypoints 5 to 8 (Index Finger)
        line(
          hand.keypoints[5].x,
          hand.keypoints[5].y,
          hand.keypoints[6].x,
          hand.keypoints[6].y
        );
        line(
          hand.keypoints[6].x,
          hand.keypoints[6].y,
          hand.keypoints[7].x,
          hand.keypoints[7].y
        );
        line(
          hand.keypoints[7].x,
          hand.keypoints[7].y,
          hand.keypoints[8].x,
          hand.keypoints[8].y
        );

        // Connect keypoints 9 to 12 (Middle Finger)
        line(
          hand.keypoints[9].x,
          hand.keypoints[9].y,
          hand.keypoints[10].x,
          hand.keypoints[10].y
        );
        line(
          hand.keypoints[10].x,
          hand.keypoints[10].y,
          hand.keypoints[11].x,
          hand.keypoints[11].y
        );
        line(
          hand.keypoints[11].x,
          hand.keypoints[11].y,
          hand.keypoints[12].x,
          hand.keypoints[12].y
        );

        // Connect keypoints 13 to 16 (Ring Finger)
        line(
          hand.keypoints[13].x,
          hand.keypoints[13].y,
          hand.keypoints[14].x,
          hand.keypoints[14].y
        );
        line(
          hand.keypoints[14].x,
          hand.keypoints[14].y,
          hand.keypoints[15].x,
          hand.keypoints[15].y
        );
        line(
          hand.keypoints[15].x,
          hand.keypoints[15].y,
          hand.keypoints[16].x,
          hand.keypoints[16].y
        );

        // Connect keypoints 17 to 20 (Pinky Finger)
        line(
          hand.keypoints[17].x,
          hand.keypoints[17].y,
          hand.keypoints[18].x,
          hand.keypoints[18].y
        );
        line(
          hand.keypoints[18].x,
          hand.keypoints[18].y,
          hand.keypoints[19].x,
          hand.keypoints[19].y
        );
        line(
          hand.keypoints[19].x,
          hand.keypoints[19].y,
          hand.keypoints[20].x,
          hand.keypoints[20].y
        );

        // Loop through keypoints and draw circles
        noStroke();
        for (let i = 0; i < hand.keypoints.length; i++) {
          let keypoint = hand.keypoints[i];

          // Color-code based on left or right hand (for the circles)
          if (hand.handedness == "Left") {
            fill(255, 0, 255);
          } else {
            fill(255, 255, 0);
          }
          circle(keypoint.x, keypoint.y, 16);
        }
      }
    }
  }
}
