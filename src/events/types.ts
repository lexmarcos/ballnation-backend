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
    playersPositions: IPosition[];
    ballPosition: IPosition;
  }
  
  export interface IRoom {
    gameLoopInterval: NodeJS.Timeout;
    room: string;
    numberOfPlayers: 2 | 4 | 6 | 8;
    typeOfGame: "classic" | "withPowerUps";
    duration: number;
    engineData: IEngineData;
    teams: {
      blue: ITeam;
      red: ITeam;
    };
    gameStatus: GameStatus;
    id: string;
    gameState: IGameState;
  }
  
  export interface IRooms {
    [key: string]: IRoom;
  }