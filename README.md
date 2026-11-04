# HandConnect – Real-Time Hand Tracking & Air Drawing

HandConnect is a browser-based computer vision project that uses your webcam to detect and track hand movements in real time. It allows users to interact with the application using hand gestures and draw on the screen without touching a mouse or keyboard.

## Features

- **Real-time hand tracking:** Detects hands and tracks 21 landmarks on each hand.
- **Gesture recognition:** Recognizes gestures such as Pinch, Open Hand, Fist, Point, and Partial.
- **Air drawing:** Draw on the screen by moving your index finger.
- **Drawing controls:** Customize brush color and size.
- **Clear canvas:** Clear your drawings with one click.
- **Visual hand tracking:** Displays hand landmarks, connections, and visual tracking effects.
- **Live dashboard:** Displays hand count, FPS, detected gesture, and finger spread.
- **Responsive interface:** Clean, professional light-theme design.

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Styling and responsive interface |
| JavaScript | Application logic and gesture detection |
| MediaPipe Hands | Hand detection and landmark tracking |
| Canvas API | Drawing and hand visualization |
| Webcam API | Live camera input |

## How It Works

1. The application accesses the webcam after the user grants camera permission.
2. MediaPipe Hands processes the camera frames.
3. The application detects hand landmarks and tracks finger positions.
4. JavaScript identifies gestures based on landmark positions.
5. When the Point gesture is detected, the index fingertip controls the drawing.
6. The Canvas API displays the drawing in real time.

## Project Structure

```text
HandConnect/
│
├── index.html
│
├── css/
│   └── style.css
│
├── js/
│   ├── app.js
│   ├── gestures.js
│   └── hand-tracking.js
│
└── assets/
    └── screenshots/
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/komalikotte-ai/HandConnect.git
```

### 2. Open the project folder

```bash
cd HandConnect
```

### 3. Start a local server

Make sure Python is installed, then run:

```bash
py -m http.server 8000
```

### 4. Open the application

Visit:

```text
http://localhost:8000
```

### 5. Allow camera access

Allow webcam access when your browser asks for permission. Use a supported browser such as Google Chrome.

## How to Use

1. Open the application and click **Start Camera**.
2. Show your hand in front of the webcam.
3. Try different gestures to see the gesture recognition.
4. Use the **Point** gesture to draw with your index finger.
5. Change the brush color and size using the drawing controls.
6. Click **Clear Drawing** to erase the canvas.
7. Click **Stop Camera** when finished.

## Credits and Acknowledgement

This project is based on and extends a hand-tracking tutorial by **CodeWithSwaroop (@codewithswaroop)**, authored by Swaroop on November 2, 2026.

Additional modifications include improvements to the drawing experience, interface design, and project organization.

Original tutorial source: Add the original tutorial URL here before publishing.

## Future Improvements

- Add more gesture-based interactions.
- Support saving drawings as image files.
- Improve drawing precision and gesture customization.
- Add additional accessibility features.

## Author

**Komali Kotte**

GitHub: https://github.com/komalikotte-ai

---

*HandConnect is an educational computer vision and human-computer interaction project. Webcam processing is performed in the browser using MediaPipe.*
