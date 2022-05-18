import fs from "node:fs/promises";
import glob from "glob-promise";
import { createServer } from "http";
import { Server } from "socket.io";
import watch from "node-watch";
import diff from "deep-diff";

const httpServer = createServer();

// Socket
let socket;
// noinspection JSValidateTypes
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:8080"],
    },
});
httpServer.listen(8000);
io.on("connection", s => {
    socket = s;
    console.log("Socket Connected (default room)", socket.id);
    socket.on("subscribe-to-sdk-key", (sdkKey, socketId) => {
        console.log(`Client ${socketId} subscribed to SDK key ${sdkKey}`);
        socket.join(sdkKey);
    });
    socket.on("unsubscribe-from-sdk-key", (sdkKey, socketId) => {
        console.log(`Client ${socketId} unsubscribed from SDK key ${sdkKey}`);
        socket.leave(sdkKey);
    });
    socket.on("datafile-pull", async (sdkKey, socketId) => {
        console.log(`Datafile requested for SDK Key ${sdkKey} by client ${socketId}`);
        if (isNullOrWhitespace(sdkKey)) {
            return;
        }
        const filePath = `./datafiles/${sdkKey}.json`;
        const dataFile = await readDataFileObjectFromDisk(filePath);
        if (!dataFile) {
            return;
        }
        sendDataFileOrPatch(dataFile, socketId, null);
    });
});
const sendDataFileOrPatch = (dataFileObject, toClientId, toAllClientsWithSdkKey) => {
    if (!dataFileObject) {
        return;
    }
    const emitEvent = Array.isArray(dataFileObject) ? "datafile-diff-push" : "datafile-full-push";
    if (toClientId) {
        console.log("Datafile sent to *Specific* client", toClientId);
        io.to(toClientId).emit(emitEvent, dataFileObject);
    }
    if (toAllClientsWithSdkKey) {
        console.log("Datafile sent to *All* clients with SDK key", toAllClientsWithSdkKey);
        io.to(toAllClientsWithSdkKey).emit(emitEvent, dataFileObject);
    }
};

// File Handling
const readDataFileObjectFromDisk = async filePath => {
    let buffer;
    try {
        buffer = await fs.readFile(filePath);
    } catch (e) {
        console.log(e);
        return;
    }

    if (buffer.length < 0) {
        return;
    }
    return JSON.parse(buffer.toString());
};

const readPreviousDataFileObjectFromDisk = async globSearch => {
    console.log("Reading previous datafile from disk", globSearch);
    const files = await glob(globSearch);

    let latestFile;
    let latestFileStats;
    for (const file of files) {
        const stats = await fs.stat(file);
        if (typeof latestFileStats === "undefined" || latestFileStats?.mtime < stats.mtime) {
            latestFile = file;
            latestFileStats = stats;
        }
    }

    const buffer = await fs.readFile(latestFile);
    if (buffer.length < 0) {
        return;
    }
    return JSON.parse(buffer.toString());
};

let watcher = watch("./datafiles/", {
    filter: /\.json$/,
    recursive: false,
});
watcher.on("change", async (event, filePath) => {
    const sdkKey = extractSdkKey(filePath);

    const newDataFile = await readDataFileObjectFromDisk(filePath);

    const globSearch = `./datafiles/versions/*${sdkKey}*.json`;
    const previousDataFile = await readPreviousDataFileObjectFromDisk(globSearch);

    const dataFilePatch = getPatch(newDataFile, previousDataFile);

    sendDataFileOrPatch(dataFilePatch, null, sdkKey);
});

// Utility
const isNullOrWhitespace = input => {
    if (typeof input === 'undefined' || input == null) {
        return true;
    }
    return input.replace(/\s/ig, '').length < 1;
};
const extractSdkKey = filePath => {
    const removalPattern = /\.json|datafiles|\/|\\/ig;
    const sdkKey = filePath.replace(removalPattern, "");
    if (isNullOrWhitespace(filePath) || sdkKey.includes(".")) {
        return "";
    }
    return sdkKey;
};
const getPatch = (newDataFileObject, previousDataFileObject) => {
    return diff.diff(previousDataFileObject, newDataFileObject);
};