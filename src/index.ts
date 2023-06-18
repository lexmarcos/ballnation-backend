import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Rotas
import authRoutes from "./routes/auth.js";

const app = express();

// Conexão com MongoDB
mongoose.connect(process.env.DB_CONNECTION as string).then(() => console.log("connected to DB"));

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Rotas
app.use("/auth", authRoutes);

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
