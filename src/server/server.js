const serverPort = 8000;
const clientPort = 8080;

const fs = require('fs');

const io = require("socket.io")(serverPort, {
    cors: {
        origin: [`http://localhost:${clientPort}`],
    },
});

let socket = {};
io.on("connection", s => {
    socket = s;
    console.log(socket.id);
    socket.on("datafile-pull", sdkKey => {
        console.log("Datafile Requested", sdkKey);
        socket.emit("datafile-push", getDatafile(sdkKey));
    });
});
const getDatafile = (sdkKey) => {
    return JSON.parse(fs.readFileSync(`./datafiles/${sdkKey}.json`).toString());
};

const watch = require("node-watch");
let watcher = watch("./datafiles/", {filter: /\.json$/});
watcher.on("change", (event, name) => {
    const removalPattern = /\.json|datafiles|\/|\\/ig;

    const sdkKey = name.replace(removalPattern, "");
    socket.emit("datafile-push", getDatafile(sdkKey));
});