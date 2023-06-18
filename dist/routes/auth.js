import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
// Importar seu modelo de usuário aqui
const router = Router();
// Rota de Signup
router.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    // Verificar se o usuário já existe
    const userExists = await User.findOne({ username });
    if (userExists) {
        return res.status(400).json({ error: "Username already exists." });
    }
    // Criptografar a senha antes de salvar
    const hashedPassword = bcrypt.hashSync(password, 8);
    // Criar novo usuário
    const user = new User({
        username,
        password: hashedPassword,
    });
    // Salvar usuário no banco de dados
    const savedUser = await user.save();
    res.status(200).send({ message: "User created successfully", userId: savedUser._id });
});
// Rota de Login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    // Buscar o usuário no banco de dados
    const user = await User.findOne({ username });
    // Verificar se o usuário existe
    if (!user) {
        return res.status(404).send("No user found.");
    }
    // Verificar se a senha está correta
    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
        return res.status(401).send({ auth: false, token: null });
    }
    // Se tudo estiver certo, gerar um token
    const token = jwt.sign({ id: user._id }, "your_secret_key", {
        expiresIn: 86400, // expira em 24 horas
    });
    res.status(200).send({ auth: true, token });
});
// Não se esqueça de exportar as rotas
export default router;
//# sourceMappingURL=auth.js.map