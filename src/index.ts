import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import { Server } from "socket.io";
import http from "http";
import { setupSocket } from "./websocket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*", // Permitir todas as origens
    methods: ["GET", "POST"],
  },
});

setupSocket(io);

// Conexão com MongoDB
mongoose.connect(process.env.DB_CONNECTION as string).then(() => console.log("connected to DB"));

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Rotas
app.use("/auth", authRoutes);

server.listen(9000, () => console.log("server running 🤌 on http://localhost:9000"));
