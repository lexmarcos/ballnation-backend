import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import ServerAndSocket from "./utils/serverAndSocket.js";
import { setupSocket } from "./events/websocket.js";

dotenv.config();

const app = ServerAndSocket.getInstance().app;
export const server = ServerAndSocket.getInstance().server;

// Conexão com MongoDB
mongoose.connect(process.env.DB_CONNECTION as string).then(() => console.log("connected to DB"));

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Rotas
app.use("/auth", authRoutes);

server.listen(9000, () => {
  console.log("server running 🤌 on http://localhost:9000");
  setupSocket();
});
