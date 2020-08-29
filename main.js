const DiscordBot = require('./discord-bot');
const ChessBoardVisualizer = require('./board-visualizer.js');

const fs = require('fs');

// Load config
const configFileName = "config.json";
if (! fs.existsSync(configFileName)) {
    fs.writeFileSync(configFileName, JSON.stringify({
        "token": "CHANGEME",
        "channel": "CHANGEME"
    }, null, 2));
}

const config = JSON.parse(fs.readFileSync(configFileName));
const bot = new DiscordBot(config.token, config.channel);

// Setup visualizer
bot.visualizer = new ChessBoardVisualizer({
    piecesImageLocation: "./images/pieces.png",
    pieceTileSize: 60,
    pieceImageMapping: {
        'WHITE_QUEEN': [1, 0],
        'BLACK_QUEEN': [1, 1],
        'WHITE_KING': [0, 0],
        'BLACK_KING': [0, 1],
        'WHITE_ROOK': [4, 0],
        'BLACK_ROOK': [4, 1],
        'WHITE_KNIGHT': [3, 0],
        'BLACK_KNIGHT': [3, 1],
        'WHITE_BISHOP': [2, 0],
        'BLACK_BISHOP': [2, 1],
        'WHITE_PAWN': [5, 0],
        'BLACK_PAWN': [5, 1],
    }
});

bot.visualizer.initialize()
    .then(() => {
        return bot.start();
    })
    .then(() => {
        console.log("Bot started")
    });

