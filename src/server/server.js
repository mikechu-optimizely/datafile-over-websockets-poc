import fs from "node:fs/promises";
import glob from "glob-promise";
import { createServer } from "http";
import { Server } from "socket.io";
import watch from "node-watch";

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
    socket.on("subscribe-to-sdk-key", sdkKey => {
        console.log("Subscribed to", sdkKey);
        socket.join(sdkKey);
    });
    socket.on("unsubscribe-from-sdk-key", sdkKey => {
        console.log("Unsubscribed from", sdkKey);
        socket.leave(sdkKey);
    });
    socket.on("datafile-pull", async (sdkKey, socketId) => {
        console.log("Datafile Requested", sdkKey);
        if (isNullOrWhitespace(sdkKey)) {
            return;
        }
        const filePath = `./datafiles/${sdkKey}.json`;
        const dataFile = await readDataFileObjectFromDisk(filePath);
        if (!dataFile) {
            return;
        }
        sendDataFile(dataFile, socketId, null);
    });
});
const sendDataFile = (dataFileObject, toClientId, toAllClientsWithSdkKey) => {
    if (!dataFileObject) {
        return;
    }
    if (toClientId) {
        console.log("Datafile Sent *Specific* client", toClientId);
        io.to(toClientId).emit("datafile-push", dataFileObject);
    }
    if (toAllClientsWithSdkKey) {
        console.log("Datafile Sent *All* clients with SDK Key", toAllClientsWithSdkKey);
        io.to(toAllClientsWithSdkKey).emit("datafile-push", dataFileObject);
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
    //const files = await glob(`**/datafile*${globSearch}*.json`);
    const files = await glob(globSearch);

    let latestFileStats;
    for (const file of files) {
        const stats = await fs.stat(file);
        latestFileStats = latestFileStats?.mtime >= stats.mtime ? latestFileStats : stats;
    }

    const buffer = await fs.readFile(latestFileStats.path);
    if (buffer.length < 0) {
        return;
    }
    return JSON.parse(buffer.toString());
};
let watcher = watch("./datafiles/", {filter: /\.json$/});
watcher.on("change", async (event, filePath) => {
    const sdkKey = extractSdkKey(filePath);
    const dataFileObject = await readDataFileObjectFromDisk(filePath);
    sendDataFile(dataFileObject, null, sdkKey);
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