import Matter from "matter-js";
import { IEngineData } from "../game/index.js";

export interface IPlayerStats {
  goals: number;
}

export interface IPlayer {
  socketId: string;
  username: string;
  stats: IPlayerStats;
  status?: "online" | "offline";
}

export enum GameStatus {
  WaitingPlayers = "waiting players",
  Playing = "playing",
  FinishedGame = "finished game",
}

export interface ITeam {
  players: IPlayer[];
}

interface IPosition {
  x: number;
  y: number;
}

export interface IGameState {
  score: {
    blue: number;
    red: number;
  };
  winner: "blue" | "red" | "draw";
  playersPositions: Matter.Vector[];
  ballPosition: IPosition;
}

export interface IRoomData {
  room: string;
  numberOfPlayers: 2 | 4 | 6 | 8;
  typeOfGame: "classic" | "withPowerUps";
  duration: number;
  teams: {
    blue: ITeam;
    red: ITeam;
  };
  gameStatus: GameStatus;
  id: string;
}

export interface IRoom {
  data: IRoomData;
  gameLoopInterval: NodeJS.Timeout;
  engineData: IEngineData;
  gameState: IGameState;
}

export interface IRooms {
  [key: string]: IRoom;
}
