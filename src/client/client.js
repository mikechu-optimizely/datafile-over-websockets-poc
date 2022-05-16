// noinspection JSCheckFunctionSignatures

import { io } from "socket.io-client";

const serverPort = 8000;

const sdkKeyField = document.getElementById("sdk-key")
const socketIdDisplay = document.getElementById("socket-id");
const payloadSizeDisplay = document.getElementById("payload-size");
const manualPullButton = document.getElementById("manual-pull");
const dataFileContentDisplay = document.getElementById("datafile-content");

let sdkKey = "41W6e8Z6JgB87DKE8Ych8";
let socketId;

const socket = io(`http://localhost:${serverPort}`);
socket.on("connect", () => {
    socketId = socket.id
    socketIdDisplay.textContent = socketId;

    console.log("Subscribing to", sdkKey);
    socket.emit("subscribe-to-sdk-key", sdkKey);

    console.log("Requesting datafile for", sdkKey);
    socket.emit("datafile-pull", sdkKey, socketId);
});
socket.on("datafile-push", dataFile => {
    console.log("Datafile Received", dataFile);
    updatePayloadSize(dataFile);
    updateJsonDisplay(dataFile);
});

document.addEventListener("readystatechange", () => {
    sdkKeyField.value = sdkKey;
    socketIdDisplay.textContent = "{display socket id}";
    payloadSizeDisplay.textContent = "{measure and fill json size in KB}";
    dataFileContentDisplay.textContent = "{fill json}";
});

manualPullButton.addEventListener("click", e => {
    e.preventDefault();
    socket.emit("datafile-pull", sdkKey, socketId);
});

sdkKeyField.addEventListener("change", e => {
    console.log("Ignoring SDK", sdkKey);
    socket.emit("ignoring-sdk-key", sdkKey);

    sdkKey = e.target.value;

    console.log("Subscribing to", sdkKey);
    socket.emit("subscribe-to-sdk-key", sdkKey);

    console.log("Requesting datafile for", sdkKey);
    socket.emit("datafile-pull", sdkKey, socketId);
})

const updatePayloadSize = obj => {
    const bytes = getSizeInBytes(obj);
    const kb = (bytes / 1000).toFixed(2);

    payloadSizeDisplay.textContent = `${kb} KB`;
};

const updateJsonDisplay = obj => {
    const cleaned = JSON.stringify(obj, null, 2);

    dataFileContentDisplay.textContent = cleaned.replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, function (match) {
        return match.replace(/"/g, "");
    });
};

const getSizeInBytes = obj => {
    let str;
    if (typeof obj === 'string') {
        // If obj is a string, then use it
        str = obj;
    } else {
        // Else, make obj into a string
        str = JSON.stringify(obj);
    }
    // Get the length of the Uint8Array
    return new TextEncoder().encode(str).length;
};
