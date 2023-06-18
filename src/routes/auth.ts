import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User, { IUser } from "../models/User.js";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ error: "Username already exists." });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    const user = new User({
      username,
      password: hashedPassword,
    });

    const savedUser: IUser = await user.save();

    res.status(200).send({ message: "User created successfully", userId: savedUser._id });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "An error occurred while creating user." });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).send("No user found.");
    }

    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).send({ auth: false, token: null });
    }

    const token = jwt.sign({ id: user._id }, "your_secret_key", {
      expiresIn: 86400, // expira em 24 horas
    });

    res.status(200).send({ auth: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "An error occurred while logging in." });
  }
});

export default router;