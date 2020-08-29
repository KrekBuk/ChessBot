const Pieces = require('./pieces');
const Board = require('./board');

const MoveResult = Object.freeze({
    MOVE_OK: 'ok',
    NO_PIECE: 'no_piece',
    NOT_YOUR_PIECE: 'not_your_piece',
    ILLEGAL_PIECE_MOVE: 'illegal_piece_move',
    IN_CHECK_AFTER_TURN: 'in_check',
    GAME_ENDED: 'game_ended'
});

const Result = Object.freeze({
    ONGOING: 'ongoing',
    WHITE_MATED: 'white_mated',
    BLACK_MATED: 'black_mated',
    WHITE_RESIGNED: 'white_resigned',
    BLACK_RESIGNED: 'black_resigned',
    WHITE_FLAGGED: 'white_flagged',
    BLACK_FLAGGED: 'black_flagged',
    STALEMATED: 'stalemate',
    INSUFFICIENT_MATERIAL: 'insufficient_material',
    DRAW_AGREED: 'draw_agreed',
    THREEFOLD_REPETITION: 'threefold_repetition',
    FIFTY_MOVES: 'fifty_moves'
});

class Game {
    /**
     * @type {Board}
     */
    currentBoard = new Board();

    /**
     * @type {Board[]}
     */
    boardHistory = [];

    /**
     * @type {string}
     */
    currentTurn;

    /**
     * @type {string}
     */
    result;

    /**
     * @type {boolean}
     */
    whiteOffersDraw;

    /**
     * @type {boolean}
     */
    blackOffersDraw;

    constructor() {
        this.reset();
    }

    reset() {
        this.currentBoard = new Board();
        this.currentBoard.setupDefaultBoard();
        this.boardHistory = [];
        this.currentTurn = Pieces.Color.WHITE;
        this.result = Result.ONGOING;
    }

    takebackMove() {
        if (this.result !== Result.ONGOING || this.boardHistory.length === 0) {
            return false;
        }

        this.currentBoard = this.boardHistory.pop();
        this.currentBoard.recalculateAllPiecesMoves();
        this.currentTurn = Pieces.Color.swap(this.currentTurn);
    }

    makeMove(from, to, extra) {
        if (this.result !== Result.ONGOING) {
            return MoveResult.GAME_ENDED;
        }

        const piece = this.currentBoard.getPiece(from);

        if (!piece) {
            return MoveResult.NO_PIECE;
        }

        if (piece.color !== this.currentTurn) {
            return MoveResult.NOT_YOUR_PIECE;
        }

        const newBoard = this.currentBoard.cloneBoard();
        if (!newBoard.makeMoveIfValid(piece.location, to, this.boardHistory, extra)) {
            return MoveResult.ILLEGAL_PIECE_MOVE;
        }

        if (newBoard.isInCheck(this.currentTurn)) {
            return MoveResult.IN_CHECK_AFTER_TURN;
        }

        this.boardHistory.push(this.currentBoard);
        this.currentBoard = newBoard;
        this.currentTurn = Pieces.Color.swap(this.currentTurn);

        if (this.currentBoard.getValidMovesFor(this.currentTurn).length === 0) {
            if (this.currentBoard.isInCheck(this.currentTurn)) {
                this.result = this.currentTurn === Pieces.Color.WHITE ? Result.WHITE_MATED : Result.BLACK_MATED;
            } else {
                this.result = Result.STALEMATED;
            }
        } else if (this.checkForInsufficientMaterial()) {
            this.result = Result.INSUFFICIENT_MATERIAL;
        } else if (this.checkForThreefoldRepetition()) {
            this.result = Result.THREEFOLD_REPETITION;
        } else if (this.checkForFiftyMoveRuleViolation()) {
            this.result = Result.FIFTY_MOVES;
        } else {
            // player made a move, cancel draw offers
            this.whiteOffersDraw = false;
            this.blackOffersDraw = false;
        }

        return MoveResult.MOVE_OK;
    }

    resign(color) {
        if (this.result !== Result.ONGOING) {
            return false;
        }

        this.result = color === Pieces.Color.WHITE ? Result.WHITE_RESIGNED : Result.BLACK_RESIGNED;
        return true;
    }

    offerDraw(color) {
        if (this.result !== Result.ONGOING) {
            return false;
        }

        if (color === Pieces.Color.WHITE) {
            this.whiteOffersDraw = true;
        }

        if (color === Pieces.Color.BLACK) {
            this.blackOffersDraw = true;
        }

        if (this.whiteOffersDraw && this.blackOffersDraw) {
            this.result = Result.DRAW_AGREED;
        }

        return true;
    }

    checkIfCountMatchesExact(count, type, amount) {
        return (count[type] || 0) === amount;
    }

    checkForInsufficientMaterialHelper(side) {
        const count = this.currentBoard.getPiecesCountByType(side);

        // If there are rooks, queens or pawns the game is not dead
        if (!this.checkIfCountMatchesExact(count, Pieces.Type.ROOK, 0) ||
            !this.checkIfCountMatchesExact(count, Pieces.Type.QUEEN, 0) ||
            !this.checkIfCountMatchesExact(count, Pieces.Type.PAWN, 0)) {

            return false;
        }

        const amountOfBishops = count[Pieces.Type.BISHOP] || 0;
        const amountOfKnights = count[Pieces.Type.KNIGHT] || 0;

        // 2 bishops, 3 knights or 1 bishop and 1 knight are enough to force a mate
        if (amountOfBishops >= 2) {
            return false;
        }

        if (amountOfKnights >= 3) {
            return false;
        }

        return amountOfBishops < 1 || amountOfKnights < 1;
    }

    checkForInsufficientMaterial() {
        return this.checkForInsufficientMaterialHelper(Pieces.Color.WHITE)
            && this.checkForInsufficientMaterialHelper(Pieces.Color.BLACK);
    }

    checkForThreefoldRepetition() {
        let amountOfPreviousSamePositions = 1;

        this.boardHistory.forEach(other => {
            if (this.currentBoard.calculateHash() !== other.calculateHash()) {
                return;
            }

            if (!this.currentBoard.equals(other)) {
                return;
            }

            amountOfPreviousSamePositions++;
        });

        return amountOfPreviousSamePositions >= 3;
    }

    checkForFiftyMoveRuleViolation() {
        if (this.boardHistory.length < 50) {
            return false;
        }

        if (this.board.lastMove.capture || this.board.lastMove.piece.type !== Type.PAWN) {
            return false;
        }

        for (let i = 1; i < 50; i++) {
            const previousBoard = this.boardHistory[this.boardHistory.length - i];

            if (previousBoard.lastMove.capture || this.board.lastMove.piece.type !== Type.PAWN) {
                return false;
            }
        }

        // Rule violated
        return true;
    }

    isConcluded() {
        return this.result !== Result.ONGOING;
    }

    getWinnerColor() {
        switch (this.result) {
            case Result.WHITE_MATED:
            case Result.WHITE_RESIGNED:
            case Result.WHITE_FLAGGED:
                return Pieces.Color.BLACK;
            case Result.BLACK_MATED:
            case Result.BLACK_RESIGNED:
            case Result.BLACK_FLAGGED:
                return Pieces.Color.WHITE;
            case Result.ONGOING:
            case Result.STALEMATED:
            case Result.INSUFFICIENT_MATERIAL:
            case Result.DRAW_AGREED:
            case Result.THREEFOLD_REPETITION:
            case Result.FIFTY_MOVES:
                return null;
        }
    }
}

module.exports = {
    MoveResult,
    Result,
    Game
}
