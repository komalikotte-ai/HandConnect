
"use strict";

// ==========================================
// HANDCONNECT KEYBOARD SHORTCUTS
// ==========================================

(() => {
    const toolShortcuts = {
        b: "brush",
        e: "eraser",
        l: "line",
        r: "rectangle",
        c: "circle"
    };

    const undoButton = document.getElementById("undoDrawing");
    const redoButton = document.getElementById("redoDrawing");

    function isTypingTarget(target) {
        return target instanceof HTMLElement && (
            target.isContentEditable ||
            target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")
        );
    }

    function selectTool(toolName) {
        const toolButton = document.querySelector(
            `.tool-btn[data-tool="${toolName}"]`
        );

        if (toolButton) {
            toolButton.click();
        }
    }

    document.addEventListener("keydown", (event) => {
        if (isTypingTarget(event.target)) {
            return;
        }

        if (event.repeat) {
            return;
        }

        const key = event.key.toLowerCase();
        const modifierPressed = event.ctrlKey || event.metaKey;

        // Undo and Redo shortcuts
        if (modifierPressed) {
            if (key === "z") {
                event.preventDefault();

                if (event.shiftKey) {
                    if (redoButton && !redoButton.disabled) {
                        redoButton.click();
                    }
                } else if (undoButton && !undoButton.disabled) {
                    undoButton.click();
                }

                return;
            }

            if (key === "y") {
                event.preventDefault();

                if (redoButton && !redoButton.disabled) {
                    redoButton.click();
                }

                return;
            }

            return;
        }

        // Do not intercept Alt-modified shortcuts.
        if (event.altKey) {
            return;
        }

        // Drawing tool shortcuts
        const selectedTool = toolShortcuts[key];

        if (selectedTool) {
            event.preventDefault();
            selectTool(selectedTool);
        }
    });
})();
