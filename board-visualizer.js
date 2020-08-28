const Chess = require('./chess.js');
const { createCanvas, loadImage } = require('canvas');

const BoardSize = 8;

const defaultConfig = {
    tileSize: 64,
    lightTileColor: '#36393f',
    darkTileColor: '#32353b',
    lightTileColorHighlighted: '#56595f',
    darkTileColorHighlighted: '#52555b',
    textFontSize: 15,
    textFont: 'Arial',
    textOnLightTileColor: '#ffffff',
    textOnDarkTileColor: '#ffffff',
    piecesImageLocation: undefined,
    pieceTileSize: 64,
    pieceImageMapping: {
        'WHITE_QUEEN': [0, 0],
        'BLACK_QUEEN': [0, 0],
        'WHITE_KING': [0, 0],
        'BLACK_KING': [0, 0],
        'WHITE_ROOK': [0, 0],
        'BLACK_ROOK': [0, 0],
        'WHITE_KNIGHT': [0, 0],
        'BLACK_KNIGHT': [0, 0],
        'WHITE_BISHOP': [0, 0],
        'BLACK_BISHOP': [0, 0],
        'WHITE_PAWN': [0, 0],
        'BLACK_PAWN': [0, 0],
    }
};

class ChessBoardVisualizer {
    config;

    piecesImage;

    constructor(config) {
        this.config = {...defaultConfig, ...config};
    }

    initialize() {
        return loadImage(this.config.piecesImageLocation)
            .then(image => {
               this.piecesImage = image;
            });
    }

    visualize(board) {
        const canvas = createCanvas(this.config.tileSize * 8, this.config.tileSize * 8);
        const ctx = canvas.getContext('2d');

        for (let file = 1 ; file <= BoardSize ; file++) {
            for (let rank = BoardSize ; rank >= 1 ; rank--) {
                const chessPosition = new Chess.ChessPosition(file, rank);
                const isWhiteTile = (file % 2) ^ (rank % 2);

                // Tile position in pixels
                const tileStartX = (file - 1) * this.config.tileSize;
                const tileStartY = (BoardSize - rank) * this.config.tileSize;

                // Draw tile colors
                if (board.highlightedSquares.filter(it => it.equals(chessPosition)).length > 0) {
                    ctx.fillStyle = isWhiteTile ? this.config.lightTileColorHighlighted : this.config.darkTileColorHighlighted;
                } else {
                    ctx.fillStyle = isWhiteTile ? this.config.lightTileColor : this.config.darkTileColor;
                }


                ctx.fillRect(tileStartX, tileStartY, this.config.tileSize, this.config.tileSize);

                ctx.font = this.config.textFontSize.toString() + "px " + this.config.textFont;
                ctx.fillStyle = isWhiteTile ? this.config.textOnLightTileColor : this.config.textOnDarkTileColor;

                if (file === 1) {
                    // Write rank number
                    ctx.fillText(rank.toString(),
                        tileStartX + 1,
                        tileStartY + this.config.tileSize / 2 + this.config.textFontSize / 2
                    );
                }

                if (rank === 1) {
                    // Write file letter
                    ctx.fillText(
                        chessPosition.getFileLetter(),
                        tileStartX + this.config.tileSize / 2 - this.config.textFontSize / 4,
                        tileStartY + this.config.tileSize - 1
                    );
                }

                // Draw piece
                const piece = board.getPiece(chessPosition);

                if (piece !== undefined) {
                    const imageLocation = this.config.pieceImageMapping[piece.color.toUpperCase() + '_' + piece.type.toUpperCase()];
                    const tileCenterShift = Math.round((this.config.tileSize - this.config.pieceTileSize) / 2);

                    ctx.drawImage(
                        this.piecesImage,
                        imageLocation[0] * this.config.pieceTileSize,
                        imageLocation[1] * this.config.pieceTileSize,
                        this.config.pieceTileSize,
                        this.config.pieceTileSize,
                        tileStartX + tileCenterShift,
                        tileStartY + tileCenterShift,
                        this.config.pieceTileSize,
                        this.config.pieceTileSize
                    );
                }
            }
        }

        return canvas.toBuffer('image/png', { compressionLevel: 3, filters: canvas.PNG_FILTER_NONE });
    }
}

module.exports = ChessBoardVisualizer;