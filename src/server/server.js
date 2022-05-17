
// Socket
let socket;
// noinspection JSValidateTypes
const io = require("socket.io")(8000, {
    cors: {
        origin: ["http://localhost:8080"],
    },
});
io.on("connection", s => {
    socket = s;
    console.log("Socket Connected (default room)", socket.id);
    socket.on("subscribe-to-sdk-key", sdkKey => {
        console.log("Subscribed to", sdkKey);
        socket.join(sdkKey);
    });
    socket.on("unsubscribe-from-sdk-key", sdkKey => {
        console.log("Unsubscribed from", sdkKey);
        socket.leave(sdkKey);
    });
    socket.on("datafile-pull", (sdkKey, socketId) => {
        console.log("Datafile Requested", sdkKey);
        if (isNullOrWhitespace(sdkKey)) {
            return;
        }
        const dataFile =readDataFileFromDisk(sdkKey);
        if (!dataFile) {
            return;
        }
        sendDataFile(dataFile, socketId, null);
    });
});
const sendDataFile = (dataFile, toClientId, toAllClientsWithSdkKey) => {
    if (toClientId) {
        console.log("Datafile Sent *Specific* client", toClientId);
        io.to(toClientId).emit("datafile-push", dataFile);
    }
    if (toAllClientsWithSdkKey) {
        console.log("Datafile Sent *All* clients with SDK Key", toAllClientsWithSdkKey);
        io.to(toAllClientsWithSdkKey).emit("datafile-push", dataFile);
    }
};

// File Handling
const fs = require('fs');
const readDataFileFromDisk = sdkKey => {
    console.log("Reading datafile from disk", sdkKey);
    const path = `./datafiles/${sdkKey}.json`;
    if (!fs.existsSync(path)) {
        return;
    }
    const buffer = fs.readFileSync(path);
    if (!buffer) {
        return;
    }
    return JSON.parse(buffer.toString());
};
const watch = require("node-watch");
let watcher = watch("./datafiles/", {filter: /\.json$/});
watcher.on("change", (event, name) => {
    const removalPattern = /\.json|datafiles|\/|\\/ig;
    const sdkKey = name.replace(removalPattern, "");
    if (isNullOrWhitespace(name) || sdkKey.includes(".")) {
        return;
    }
    sendDataFile(readDataFileFromDisk(sdkKey), null, sdkKey);
});

// Utility
const isNullOrWhitespace = input => {
    if (typeof input === 'undefined' || input == null) {
        return true;
    }
    return input.replace(/\s/ig, '').length < 1;
};