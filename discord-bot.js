const Discord = require('discord.js');
const Chess = require('./chess');
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

    game = new Chess.Game.Game();

    constructor(token, channelId) {
        this.token = token;
        this.channelId = channelId;
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

        const regex = /\$([A-H][0-9])([A-H][0-9])([QRBKN])?/;

        let currentContent = message.content.toUpperCase();
        let match;
        let anyMatches = false;

        if (currentContent.trim().toUpperCase() === "$RESET") {
            anyMatches = true;
            currentContent = "";

            this.game.reset();
        }

        if (currentContent.trim().toUpperCase() === "$UNDO") {
            this.game.takebackMove();
            anyMatches = true;
        }

        if (currentContent.trim().toUpperCase() === "$BOARD") {
            anyMatches = true;
        }

        while (match = currentContent.trim().match(regex)) {
            currentContent = currentContent.replace(regex, "");

            const result = this.game.makeMove(Chess.Pieces.Square.fromString(match[1]), Chess.Pieces.Square.fromString(match[2]), match[3]);

            if (result !== Chess.Game.MoveResult.MOVE_OK) {
                message.channel.send(result);
                break;
            }

            anyMatches = true;
        }

        if (anyMatches) {
            this.sendGameState(this.game);
        }
    }

    sendGameState(game) {
        let text = "";
        if (this.game.isConcluded()) {
            text += "Game is concluded: \n";
            text += "Result: " + this.game.result + "\n";
            text += "Winner: " + (this.game.getWinnerColor() || "none");
        }

        return this.channel.send(text, {
            files: [
                {
                    attachment: this.visualizer.visualize(game.currentBoard),
                    name: "board.png"
                }
            ]
        })
    }
}

module.exports = DiscordBot;