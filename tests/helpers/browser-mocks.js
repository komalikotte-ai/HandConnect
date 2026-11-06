
"use strict";

function createEventTarget() {
    const listeners = {};

    return {
        addEventListener(type, callback) {
            if (!listeners[type]) {
                listeners[type] = [];
            }

            listeners[type].push(callback);
        },

        removeEventListener(type, callback) {
            if (!listeners[type]) return;

            listeners[type] = listeners[type].filter(
                listener => listener !== callback
            );
        },

        dispatchEvent(event) {
            const callbacks = listeners[event.type] || [];

            for (const callback of [...callbacks]) {
                callback.call(this, event);
            }

            return !event.defaultPrevented;
        },

        listenerCount(type) {
            return listeners[type]?.length || 0;
        }
    };
}

function createCanvasContext() {
    const operations = [];

    return {
        operations,

        clearRect(...args) {
            operations.push({ method: "clearRect", args });
        },

        fillRect(...args) {
            operations.push({ method: "fillRect", args });
        },

        strokeRect(...args) {
            operations.push({ method: "strokeRect", args });
        },

        beginPath() {
            operations.push({ method: "beginPath", args: [] });
        },

        closePath() {
            operations.push({ method: "closePath", args: [] });
        },

        moveTo(...args) {
            operations.push({ method: "moveTo", args });
        },

        lineTo(...args) {
            operations.push({ method: "lineTo", args });
        },

        arc(...args) {
            operations.push({ method: "arc", args });
        },

        stroke() {
            operations.push({ method: "stroke", args: [] });
        },

        fill() {
            operations.push({ method: "fill", args: [] });
        },

        save() {
            operations.push({ method: "save", args: [] });
        },

        restore() {
            operations.push({ method: "restore", args: [] });
        },

        drawImage(...args) {
            operations.push({ method: "drawImage", args });
        },

        getImageData() {
            return {
                data: new Uint8ClampedArray(4),
                width: 1,
                height: 1
            };
        },

        putImageData(...args) {
            operations.push({ method: "putImageData", args });
        },

        setTransform(...args) {
            operations.push({ method: "setTransform", args });
        },

        translate(...args) {
            operations.push({ method: "translate", args });
        },

        scale(...args) {
            operations.push({ method: "scale", args });
        },

        lineWidth: 1,
        strokeStyle: "#000000",
        fillStyle: "#000000",
        lineCap: "round",
        lineJoin: "round"
    };
}

function createElement(tagName = "div") {
    const events = createEventTarget();

    const element = {
        ...events,
        tagName: tagName.toUpperCase(),
        id: "",
        className: "",
        style: {},
        dataset: {},
        children: [],
        value: "",
        checked: false,
        disabled: false,
        textContent: "",
        innerHTML: "",
        width: 300,
        height: 150,

        classList: {
            add() {},
            remove() {},
            toggle() {
                return false;
            },
            contains() {
                return false;
            }
        },

        appendChild(child) {
            this.children.push(child);
            return child;
        },

        removeChild(child) {
            this.children = this.children.filter(
                item => item !== child
            );
            return child;
        },

        setAttribute(name, value) {
            this[name] = value;
        },

        getAttribute(name) {
            return this[name] ?? null;
        },

        removeAttribute(name) {
            delete this[name];
        },

        click() {
            this.dispatchEvent({
                type: "click",
                target: this,
                defaultPrevented: false
            });
        },

        focus() {},
        blur() {},

        getBoundingClientRect() {
            return {
                width: this.width,
                height: this.height,
                top: 0,
                left: 0,
                right: this.width,
                bottom: this.height
            };
        },

        querySelector() {
            return null;
        },

        querySelectorAll() {
            return [];
        }
    };

    if (tagName.toLowerCase() === "canvas") {
        const context = createCanvasContext();

        element.getContext = () => context;

        element.toBlob = callback => {
            callback(new Blob(["mock-image"], {
                type: "image/png"
            }));
        };

        element.toDataURL = () =>
            "data:image/png;base64,bW9jaw==";
    }

    return element;
}

function createDocument() {
    const elements = new Map();

    return {
        createElement,

        getElementById(id) {
            if (!elements.has(id)) {
                const element = createElement();
                element.id = id;
                elements.set(id, element);
            }

            return elements.get(id);
        },

        querySelector() {
            return null;
        },

        querySelectorAll() {
            return [];
        },

        addEventListener() {},
        removeEventListener() {},

        body: createElement("body"),
        documentElement: createElement("html")
    };
}

function createWindow() {
    const events = createEventTarget();

    return {
        ...events,
        devicePixelRatio: 1,
        innerWidth: 1280,
        innerHeight: 720,
        location: {
            href: "http://localhost/"
        }
    };
}

module.exports = {
    createEventTarget,
    createCanvasContext,
    createElement,
    createDocument,
    createWindow
};
