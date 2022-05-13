const serverPort = 8000;
const clientPort = 8080;

const fs = require('fs');
const readDataFileFromDisk = (sdkKey) => {
    return JSON.parse(fs.readFileSync(`./datafiles/${sdkKey}.json`).toString());
};

const sendDataFile = (obj) => {
    console.log("Datafile Sent");
    socket.emit("datafile-push", obj);
};

let socket = {};
// noinspection JSValidateTypes
const io = require("socket.io")(serverPort, {
    cors: {
        origin: [`http://localhost:${clientPort}`],
    },
});
io.on("connection", s => {
    socket = s;
    console.log(socket.id);
    socket.on("datafile-pull", sdkKey => {
        console.log("Datafile Requested", sdkKey);
        sendDataFile(readDataFileFromDisk(sdkKey));
    });
});

const watch = require("node-watch");
let watcher = watch("./datafiles/", {filter: /\.json$/});
watcher.on("change", (event, name) => {
    const removalPattern = /\.json|datafiles|\/|\\/ig;

    const sdkKey = name.replace(removalPattern, "");
    sendDataFile(readDataFileFromDisk(sdkKey));
});