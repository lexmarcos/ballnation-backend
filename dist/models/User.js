import mongoose, { Schema } from "mongoose";
// Esquema do Mongoose para o modelo User
const UserSchema = new Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
// Exportando o modelo User
export default mongoose.model("User", UserSchema);
//# sourceMappingURL=User.js.map