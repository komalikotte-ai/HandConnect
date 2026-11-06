# HandConnect – Real-Time Hand Tracking & Air Drawing

HandConnect is a browser-based computer vision application that uses your webcam to detect and track hand movements in real time. It allows users to interact with the application using hand gestures and draw on the screen without touching a mouse or keyboard.

## Features

- **Real-time hand tracking:** Detects hands and tracks 21 landmarks on each hand.
- **Gesture recognition:** Recognizes Pinch, Open Hand, Fist, Point, and Partial gestures.
- **Air drawing:** Draw on the screen by moving your index finger.
- **Drawing tools:** Supports Brush, Eraser, Line, Rectangle, and Circle.
- **Customizable brush:** Change brush color and size.
- **Undo and Redo:** Reverse or restore recent drawing actions.
- **PNG export:** Download your drawing as a PNG image.
- **Keyboard shortcuts:** Switch drawing tools and control Undo/Redo using the keyboard.
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
2. MediaPipe Hands processes camera frames.
3. The application detects hand landmarks and tracks finger positions.
4. JavaScript identifies gestures based on landmark positions.
5. The Point gesture allows the index fingertip to control drawing.
6. The selected drawing tool determines how the canvas responds to hand movement.
7. The Canvas API displays the drawing in real time.

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
│   ├── hand-tracking.js
│   └── keyboard-shortcuts.js
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

Allow webcam access when your browser asks for permission. Google Chrome is recommended.

## How to Use

1. Open the application and click **Start Camera**.
2. Show your hand in front of the webcam.
3. Use the Point gesture to draw with your index finger.
4. Select a drawing tool using the tool buttons or keyboard shortcuts.
5. Customize brush color and size.
6. Use Undo or Redo to manage drawing actions.
7. Click **Clear Drawing** to clear the canvas.
8. Click **Export PNG** to download your drawing.
9. Click **Stop Camera** when finished.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| B | Select Brush |
| E | Select Eraser |
| L | Select Line |
| R | Select Rectangle |
| C | Select Circle |
| Ctrl + Z | Undo |
| Ctrl + Y | Redo |
| Ctrl + Shift + Z | Redo |

Keyboard shortcuts are ignored while typing in input fields and text areas.

## Credits and Acknowledgement

This project is based on and extends a hand-tracking tutorial by **CodeWithSwaroop (@codewithswaroop)**.

Additional modifications include improvements to drawing tools, keyboard controls, undo/redo functionality, PNG export, interface design, and project organization.

Original tutorial source: Add the original tutorial URL here before publishing.

## Future Improvements

- Add more gesture-based interactions.
- Improve drawing precision and gesture customization.
- Add additional accessibility features.

## Author

**Komali Kotte**

GitHub: https://github.com/komalikotte-ai

---

*HandConnect is an educational computer vision and human-computer interaction project. Webcam processing is performed in the browser using MediaPipe.*
