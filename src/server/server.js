const serverPort = 8000;
const clientPort = 8080;

const isNullOrWhitespace = input => {
    if (typeof input === 'undefined' || input == null) {
        return true;
    }
    return input.replace(/\s/ig, '').length < 1;
};

let socket = {};
// noinspection JSValidateTypes
const io = require("socket.io")(serverPort, {
    cors: {
        origin: [`http://localhost:${clientPort}`],
    },
});

const fs = require('fs');
const readDataFileFromDisk = sdkKey => {
    console.log("Reading datafile from disk", sdkKey);
    return JSON.parse(fs.readFileSync(`./datafiles/${sdkKey}.json`).toString());
};

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

io.on("connection", s => {
    socket = s;
    console.log("Socket Connected (default room)", socket.id);
    socket.on("subscribe-to-sdk-key", sdkKey => {
        console.log("Subscribed to", sdkKey);
        socket.join(sdkKey);
    });
    socket.on("ignoring-sdk-key", sdkKey => {
        console.log("Unsubscribed from", sdkKey);
        socket.leave(sdkKey);
    });
    socket.on("datafile-pull", (sdkKey, socketId) => {
        console.log("Datafile Requested", sdkKey);
        if (isNullOrWhitespace(sdkKey)) {
            return;
        }
        sendDataFile(readDataFileFromDisk(sdkKey), socketId, null);
    });
});

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