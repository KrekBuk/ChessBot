const ChessPieceColor = Object.freeze({
    WHITE: 'white',
    BLACK: 'black',

    swap(color) {
        return color === ChessPieceColor.WHITE ? ChessPieceColor.BLACK : ChessPieceColor.WHITE;
    }
});

const ChessPieceType = Object.freeze({
    PAWN: 'pawn',
    ROOK: 'rook',
    KNIGHT: 'knight',
    BISHOP: 'bishop',
    QUEEN: 'queen',
    KING: 'king'
});

class ChessPosition {
    /**
     * @type {number}
     */
    fileNumber;

    /**
     * @type {number}
     */
    rankNumber;

    constructor(fileNumber, rankNumber) {
        this.rankNumber = rankNumber;
        this.fileNumber = fileNumber;
    }

    getFileLetter() {
        return String.fromCharCode('A'.charCodeAt() + this.fileNumber - 1);
    }

    relative(fileRelative, rankRelative) {
        return new ChessPosition(this.fileNumber + fileRelative, this.rankNumber + rankRelative);
    }

    getRelativesUntilInvalid(fileRelative, rankRelative) {
        const positions = [];
        let current = this;

        for (; ;) {
            current = current.relative(fileRelative, rankRelative);

            if (!current.isValid()) {
                return positions;
            }

            positions.push(current);
        }
    }

    pathTo(other) {
        if (other.equals(this)) {
            return [];
        }

        const fileChange = this.fileNumber - other.fileNumber;
        const rankChange = this.rankNumber - other.rankNumber;

        const fileChangeReduced = fileChange / Math.abs(fileChange);
        const rankChangeReduced = rankChange / Math.abs(rankChange);

        if (fileChange === 0 || rankChange === 0 ||
            Math.abs(fileChange) === Math.abs(rankChange)) {

            const path = this.getRelativesUntilInvalid(fileChangeReduced, rankChangeReduced);
            path.pop();
            return path;
        }

        // Invalid movement
        return [];
    }

    equals(other) {
        return this.fileNumber === other.fileNumber && this.rankNumber === other.rankNumber;
    }

    asString() {
        return this.getFileLetter() + this.rankNumber;
    }

    isValid() {
        return this.rankNumber >= 1
            && this.fileNumber >= 1
            && this.rankNumber <= 8
            && this.fileNumber <= 8;
    }

    static fromString(string) {
        if (string.length !== 2) {
            return undefined;
        }

        const position = new ChessPosition(
            string.charCodeAt(0) - 'A'.charCodeAt(0) + 1,
            string.charCodeAt(1) - '1'.charCodeAt(0) + 1,
        );

        if (!position.isValid()) {
            return undefined;
        }

        return position;
    }
}

class ChessPiece {
    /**
     * @type {ChessPosition[]}
     */
    validMoves = [];

    /**
     * @type {string}
     */
    type;

    /**
     * @type {string}
     */
    color;

    /**
     * @type ChessBoard
     */
    board;

    /**
     * {@type ChessPosition}
     */
    position;

    constructor(type, color, board, position) {
        this.type = type;
        this.color = color;
        this.board = board;
        this.position = position;
        this.recalculateValidMoves();
    }

    recalculateValidMoves() {
        this.validMoves = [];
    }

    updatePosition(position) {
        this.position = position;
        this.recalculateValidMoves();
    }

    isMoveValid(to) {
        if (!to.isValid()) {
            return false;
        }

        return this.validMoves.filter(move => move.equals(to)).length > 0;
    }

    cloneToAnotherBoard(board) {
        return null;
    }
}

class Pawn extends ChessPiece {
    constructor(color, board, position) {
        super(ChessPieceType.PAWN, color, board, position);
    }

    recalculateValidMoves() {
        const advanceDirection = this.color === ChessPieceColor.WHITE ? 1 : -1;

        this.validMoves.push(this.position.relative(0, advanceDirection));
        this.validMoves.push(this.position.relative(1, advanceDirection));
        this.validMoves.push(this.position.relative(-1, advanceDirection));

        if ((this.position.rankNumber === 2 && this.color === ChessPieceColor.WHITE) ||
            (this.position.rankNumber === 7 && this.color === ChessPieceColor.BLACK)) {

            this.validMoves.push(this.position.relative(0, advanceDirection * 2));
        }
    }

    isMoveValid(to) {
        if (!super.isMoveValid(to)) {
            return false;
        }

        const advanceDirection = this.color === ChessPieceColor.WHITE ? 1 : -1;

        // Moves forward
        if (this.position.fileNumber === to.fileNumber) {
            if (this.position.rankNumber === 2 || this.position.rankNumber === 7) {
                // First move
                if (this.position.rankNumber + advanceDirection * 2 === to.rankNumber) {
                    return true;
                }
            }

            return this.position.rankNumber + advanceDirection === to.rankNumber;
        }

        // Capturing
        if (to.fileNumber === this.position.fileNumber - 1 || to.fileNumber === this.position.fileNumber + 1) {
            const capturedPiece = this.board.getPiece(to);
            if (capturedPiece == null || capturedPiece.color === this.color) {
                return false;
            }

            return this.position.rankNumber + advanceDirection === to.rankNumber;
        }

        return false;
    }

    cloneToAnotherBoard(board) {
        return new Pawn(this.color, board, this.position);
    }
}

class Rook extends ChessPiece {
    constructor(color, board, position) {
        super(ChessPieceType.ROOK, color, board, position);
    }

    recalculateValidMoves() {
        this.validMoves = this.validMoves
            .concat(this.position.getRelativesUntilInvalid(-1, 0))
            .concat(this.position.getRelativesUntilInvalid(1, 0))
            .concat(this.position.getRelativesUntilInvalid(0, 1))
            .concat(this.position.getRelativesUntilInvalid(0, -1));
    }

    isMoveValid(to) {
        if (!super.isMoveValid(to)) {
            return false;
        }

        return this.board.isPathClear(this.position.pathTo(to));
    }

    cloneToAnotherBoard(board) {
        return new Rook(this.color, board, this.position);
    }
}

class Knight extends ChessPiece {
    constructor(color, board, position) {
        super(ChessPieceType.KNIGHT, color, board, position);
    }

    recalculateValidMoves() {
        this.validMoves.push(this.position.relative(1, 2));
        this.validMoves.push(this.position.relative(-1, 2));
        this.validMoves.push(this.position.relative(1, -2));
        this.validMoves.push(this.position.relative(-1, -2));
        this.validMoves.push(this.position.relative(2, 1));
        this.validMoves.push(this.position.relative(-2, 1));
        this.validMoves.push(this.position.relative(2, -1));
        this.validMoves.push(this.position.relative(-2, -1));

        this.validMoves = this.validMoves.filter(it => it.isValid());
    }

    isMoveValid(to) {
        return super.isMoveValid(to);
    }

    cloneToAnotherBoard(board) {
        return new Knight(this.color, board, this.position);
    }
}

class Bishop extends ChessPiece {
    constructor(color, board, position) {
        super(ChessPieceType.BISHOP, color, board, position);
    }

    recalculateValidMoves() {
        this.validMoves = this.validMoves
            .concat(this.position.getRelativesUntilInvalid(-1, -1))
            .concat(this.position.getRelativesUntilInvalid(-1, 1))
            .concat(this.position.getRelativesUntilInvalid(1, -1))
            .concat(this.position.getRelativesUntilInvalid(1, 1));
    }

    isMoveValid(to) {
        if (!super.isMoveValid(to)) {
            return false;
        }

        return this.board.isPathClear(this.position.pathTo(to));
    }

    cloneToAnotherBoard(board) {
        return new Bishop(this.color, board, this.position);
    }
}

class Queen extends ChessPiece {
    constructor(color, board, position) {
        super(ChessPieceType.QUEEN, color, board, position);
    }

    recalculateValidMoves() {
        this.validMoves = this.validMoves
            .concat(this.position.getRelativesUntilInvalid(-1, -1))
            .concat(this.position.getRelativesUntilInvalid(-1, 1))
            .concat(this.position.getRelativesUntilInvalid(1, -1))
            .concat(this.position.getRelativesUntilInvalid(1, 1))
            .concat(this.position.getRelativesUntilInvalid(-1, 0))
            .concat(this.position.getRelativesUntilInvalid(1, 0))
            .concat(this.position.getRelativesUntilInvalid(0, 1))
            .concat(this.position.getRelativesUntilInvalid(0, -1));
    }

    isMoveValid(to) {
        if (!super.isMoveValid(to)) {
            return false;
        }

        return this.board.isPathClear(this.position.pathTo(to));
    }

    cloneToAnotherBoard(board) {
        return new Queen(this.color, board, this.position);
    }
}

class King extends ChessPiece {
    constructor(color, board, position) {
        super(ChessPieceType.KING, color, board, position);
    }

    recalculateValidMoves() {
        this.validMoves.push(this.position.relative(-1, -1))
        this.validMoves.push(this.position.relative(-1, 1))
        this.validMoves.push(this.position.relative(1, -1))
        this.validMoves.push(this.position.relative(1, 1))
        this.validMoves.push(this.position.relative(-1, 0))
        this.validMoves.push(this.position.relative(1, 0))
        this.validMoves.push(this.position.relative(0, 1))
        this.validMoves.push(this.position.relative(0, -1));
        this.validMoves = this.validMoves.filter(it => it.isValid());
    }

    isMoveValid(to) {
        return super.isMoveValid(to);
    }

    cloneToAnotherBoard(board) {
        return new King(this.color, board, this.position);
    }
}

class ChessBoard {
    /**
     * @type {Object.<string, ChessPiece>}
     */
    pieces = {};

    /**
     * @type {string}
     */
    currentTurn;

    /**
     * @type {ChessPosition[]}
     */
    highlightedSquares = [];

    constructor(pieces, currentTurn) {
        this.pieces = pieces || {};
        this.currentTurn = currentTurn || ChessPieceColor.WHITE;
    }

    setupInitialPieces(color) {
        const rank = color === ChessPieceColor.WHITE ? 1 : 8;

        this.setPiece(new Rook(color, this, new ChessPosition(1, rank)));
        this.setPiece(new Knight(color, this, new ChessPosition(2, rank)));
        this.setPiece(new Bishop(color, this, new ChessPosition(3, rank)));
        this.setPiece(new Queen(color, this, new ChessPosition(4, rank)));
        this.setPiece(new King(color, this, new ChessPosition(5, rank)));
        this.setPiece(new Bishop(color, this, new ChessPosition(6, rank)));
        this.setPiece(new Knight(color, this, new ChessPosition(7, rank)));
        this.setPiece(new Rook(color, this, new ChessPosition(8, rank)));
    }

    setupInitialPawns(color) {
        const rank = color === ChessPieceColor.WHITE ? 2 : 7;

        for (let file = 1; file <= 8; file++) {
            this.setPiece(new Pawn(color, this, new ChessPosition(file, rank)));
        }
    }

    setupDefaultBoard() {
        this.pieces = {};
        this.setupInitialPieces(ChessPieceColor.WHITE);
        this.setupInitialPieces(ChessPieceColor.BLACK);
        this.setupInitialPawns(ChessPieceColor.WHITE);
        this.setupInitialPawns(ChessPieceColor.BLACK);
        this.currentTurn = ChessPieceColor.WHITE;
    }

    setPiece(piece) {
        this.pieces[piece.position.asString()] = piece;
    }

    removePieceAt(position) {
        this.pieces[position.asString()] = undefined;
    }

    getPiece(position) {
        return this.pieces[position.asString()];
    }

    isPathClear(path) {
        return path.every(it => this.getPiece(it) === undefined);
    }

    cloneBoard() {
        const newBoard = new ChessBoard();

        for (let position in this.pieces) {
            if (!this.pieces.hasOwnProperty(position)) {
                continue;
            }

            newBoard[position] = this.pieces[position].cloneToAnotherBoard();
        }

        return newBoard;
    }

    makeMoveIfValid(from, to) {
        const piece = this.getPiece(from);

        if (piece.color !== this.currentTurn) {
            return false;
        }

        if (!piece.isMoveValid(to)) {
            return false;
        }

        const pieceAtDestination = this.getPiece(to);
        if (pieceAtDestination) {
            if (pieceAtDestination.color === piece.color) {
                return false;
            }

            this.removePieceAt(to);
        }

        this.removePieceAt(from);
        piece.updatePosition(to);
        this.setPiece(piece);

        this.highlightedSquares = [to, from];

        this.currentTurn = ChessPieceColor.swap(this.currentTurn);
        return true;
    }
}

module.exports = {
    ChessPieceColor,
    ChessPieceType,
    ChessPosition,
    ChessPiece,
    Pawn,
    Rook,
    Knight,
    Bishop,
    Queen,
    King,
    ChessBoard
}
