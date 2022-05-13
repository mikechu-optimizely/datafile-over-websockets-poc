import { io } from "socket.io-client";

const sdkKey = "41W6e8Z6JgB87DKE8Ych8";
const serverPort = 8000;

const socketId = document.getElementById("socket-id");
const payloadSize = document.getElementById("payload-size");
const manualPull = document.getElementById("manual-pull");
const dataFileContent = document.getElementById("datafile-content");

const socket = io(`http://localhost:${serverPort}`);
socket.on("connect", () => {
    socketId.textContent = socket.id;
    socket.emit("datafile-pull", sdkKey);
});
socket.on("datafile-push", obj => {
    console.log("Datafile Received", obj);
    updatePayloadSize(obj);
    updateJsonDisplay(obj);
});

document.addEventListener("readystatechange", () => {
    socketId.textContent = "{display socket id}";
    payloadSize.textContent = "{measure and fill json size in KB}";
    dataFileContent.textContent = "{fill json}";
});

manualPull.addEventListener("click", e => {
    e.preventDefault();
    socket.emit("datafile-pull", sdkKey);
});

const updatePayloadSize = obj => {
    const bytes = getSizeInBytes(obj);
    const kb = (bytes / 1000).toFixed(2);

    payloadSize.textContent = `${kb} KB`;
};

const updateJsonDisplay = obj => {
    const cleaned = JSON.stringify(obj, null, 2);

    dataFileContent.textContent = cleaned.replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, function (match) {
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
