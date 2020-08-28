const Discord = require('discord.js');
const Chess = require('./chess.js');
const ChessBoardVisualizer = require('./board-visualizer');

class DiscordBot {
    client = new Discord.Client();

    /**
     * @type {Discord.TextChannel}
     */
    channel;

    /**
     * @type {ChessBoardVisualizer}
     */
    visualizer;

    board = new Chess.ChessBoard();

    constructor(token, channelId) {
        this.token = token;
        this.channelId = channelId;

        this.board.setupDefaultBoard();
    }

    start() {
        return new Promise((resolve, reject) => {
            this.client.on('ready', () => {
                this.client.channels.fetch(this.channelId)
                    .then(channel => {
                        this.channel = channel;
                        resolve();
                    })
                    .catch(reject);
            });

            this.client.on('message', (message) => this.onMessage(message));

            this.client.login(this.token).catch(reject);
        })
    }

    onMessage(message) {
        if (message.channel !== this.channel || message.author === this.client.user) {
            return false;
        }

        const match = message.content.trim().toUpperCase().match(/\$([A-H][0-9])([A-H][0-9])/);
        if (!match) {
            return false;
        }

        if (!this.board.makeMoveIfValid(Chess.ChessPosition.fromString(match[1]), Chess.ChessPosition.fromString(match[2]))) {
            message.channel.send("Invalid move");
            return false;
        }

        this.sendBoard(this.visualizer.visualize(this.board));
    }

    sendBoard(image) {
        return this.channel.send("TEST", {
            files: [
                {
                    attachment: image,
                    name: "board.png"
                }
            ]
        })
    }
}

module.exports = DiscordBot;