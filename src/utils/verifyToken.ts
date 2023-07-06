import { Socket } from "socket.io";
import jwt from "jsonwebtoken";

interface ISocket extends Socket {
  decoded?: any;
}

export const verifyToken = (socket: ISocket, next: (err?: Error) => void) => {
  const token = socket.handshake.query.token;
  if (typeof token === "string") {
    jwt.verify(token, process.env.JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        console.log("erro no token");
        return next(new Error("Authentication error"));
      }
      socket.decoded = decoded;
      next();
    });
  } else {
    next(new Error("Token should be a string"));
  }
};
