// noinspection JSCheckFunctionSignatures

import { io } from "socket.io-client";
import diff from "deep-diff";

// UI Elements
const sdkKeyField = document.getElementById("sdk-key");
const socketIdDisplay = document.getElementById("socket-id");
const payloadSizeDisplay = document.getElementById("payload-size");
const manualPullButton = document.getElementById("manual-pull");

let sdkKey = "TCv5sLDuiETJoXmrnzcUN";
let socketId;
let dataFile;

// Event Listeners
document.addEventListener("readystatechange", () => {
    sdkKeyField.value = sdkKey;
    sdkKeyField.addEventListener("change", e => {
        console.log("Ignoring SDK", sdkKey);
        socket.emit("unsubscribe-from-sdk-key", sdkKey, socketId);

        sdkKey = e.target.value;

        console.log("Subscribing to", sdkKey);
        socket.emit("subscribe-to-sdk-key", sdkKey);

        console.log("Requesting datafile for", sdkKey);
        socket.emit("datafile-pull", sdkKey, socketId);
    });

    manualPullButton.addEventListener("click", e => {
        e.preventDefault();
        socket.emit("datafile-full-pull", sdkKey, socketId);
    });
});

// Socket
const socket = io("http://localhost:8000");
socket.on("connect", () => {
    socketId = socket.id;
    socketIdDisplay.textContent = socketId;

    console.log("Subscribing to", sdkKey);
    socket.emit("subscribe-to-sdk-key", sdkKey, socketId);

    console.log("Requesting datafile for", sdkKey);
    socket.emit("datafile-full-pull", sdkKey, socketId);
});
socket.on("datafile-full-push", fullDataFile => {
    console.log("Full data file received", fullDataFile);
    updatePayloadSize(fullDataFile);
    dataFile = fullDataFile;
});
socket.on("datafile-diff-push", dataFileDiffs => {
    console.log("Diff data file received", dataFileDiffs);
    updatePayloadSize(dataFileDiffs);

    const previousRevisionChange = dataFileDiffs.find(change => change.path.includes("revision"));
    const previousRevisionNumber = previousRevisionChange?.lhs ?? 0;

    if (previousRevisionNumber !== dataFile.revision) {
        console.log(`Data file revision mismatch. Received ${previousRevisionNumber}. Expected ${dataFile.revision} Requesting full.`);
        socket.emit("datafile-full-pull", sdkKey, socketId);
        return;
    }

    dataFileDiffs.forEach(change => {
        diff.applyChange(dataFile, null, change);
    });
    console.log("Data file change state", dataFile);
});

// Utility
const updatePayloadSize = obj => {
    const bytes = getSizeInBytes(obj);
    const kb = (bytes / 1000).toFixed(2);

    payloadSizeDisplay.textContent = `${kb} KB`;
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
