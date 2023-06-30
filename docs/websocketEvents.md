# 🚀 Documentação da API WebSocket

Este documento descreve todos os eventos que nosso servidor Socket.IO manipula.

## 👥 Eventos Globais

### `connection` 

🎬 Disparado quando um novo cliente se conecta ao servidor.

### `disconnect` 

⏹️ Disparado quando um cliente se desconecta do servidor. 

## 📢 Eventos Emitidos pelo Cliente

### `createRoom` 

🏠 O cliente deve emitir esse evento quando deseja criar uma nova sala de jogos.

Parâmetros:
- `roomData` (Objeto): Dados da sala a ser criada, no formato:

```javascript
{
  room: string; // Nome da sala
  numberOfPlayers: 2 | 4 | 6 | 8; // Número de jogadores na sala
  typeOfGame: "classic" | "withPowerUps"; // Tipo de jogo
  duration: number; // Duração do jogo em minutos
  players: IPlayer[]; // Lista inicial de jogadores
  gameStatus: GameStatus; // Estado inicial do jogo
  id: string; // ID único da sala
}
```

- `callback` (Função): Função de callback que será chamada após a criação da sala, retornando "success".

Exemplo de uso:

```javascript
socket.emit("createRoom", {
  room: "room1",
  numberOfPlayers: 2,
  typeOfGame: "classic",
  duration: 30,
  players: [],
  gameStatus: "waiting",
  id: "123"
}, (status) => {
  console.log(status); // Deve imprimir "success"
});
```

### `joinLobby`

👋 O cliente deve emitir esse evento quando desejar se juntar ao lobby. Não requer parâmetros.

Exemplo de uso:

```javascript
socket.emit("joinLobby");
```

### `joinRoom`

🎮 O cliente deve emitir este evento quando desejar se juntar a uma sala de jogos existente.

Parâmetros:
- `room` (string): O ID da sala a ser ingressada.
- `username` (string): O nome de usuário do jogador ingressante.

Exemplo de uso:

```javascript
socket.emit("joinRoom", { room: "room1", username: "Player1" });
```

### `message`

💬 O cliente deve emitir este evento quando desejar enviar uma mensagem para a sala.

Parâmetros:
- `data` (Objeto): Dados da mensagem a ser enviada, no formato:

```javascript
{
  room: string; // ID da sala
  text: string; // Texto da mensagem
  author: string; // Autor da mensagem
}
```

Exemplo de uso:

```javascript
socket.emit("message", { room: "room1", text: "Hello, world!", author: "Player1" });
```

## 📡 Eventos Emitidos pelo Servidor

### `startGame`

🕹️ Emitido pelo servidor quando um jogo está prestes a começar. O servidor emite este evento quando o número de jogadores na sala atinge o `numberOfPlayers`.

### `error`

❌ Emitido pelo servidor em caso de erro, por exemplo, quando o cliente tenta se juntar a uma sala que não existe ou está cheia.

### `newMessage`

📨 Emitido pelo servidor quando uma nova mensagem é enviada na sala.
