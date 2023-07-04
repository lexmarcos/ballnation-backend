import express from "express";
import http from "http";
import { Server } from "socket.io";

class ServerAndSocket {
    private static instance: ServerAndSocket;
    io: Server = null;
    app = null
    server = null

    private constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
              origin: "*",
              methods: ["GET", "POST"],
            },
          });
    }

    public static getInstance(): ServerAndSocket {
        if (!ServerAndSocket.instance) {
            ServerAndSocket.instance = new ServerAndSocket();
        }

        return ServerAndSocket.instance;
    }
}

export default ServerAndSocket;