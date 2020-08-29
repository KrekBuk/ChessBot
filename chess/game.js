const Pieces = require('./pieces');
const Board = require('./board');

/**
 * Possible results of a chess move.
 */
const MoveResult = Object.freeze({
    /**
     * Move was successfully made.
     */
    MOVE_OK: 'ok',

    /**
     * There is no piece at this square.
     */
    NO_PIECE: 'no_piece',

    /**
     * The piece that a player tried to move is of a diffrent colour.
     */
    NOT_YOUR_PIECE: 'not_your_piece',

    /**
     * This move is illegal for this piece type.
     */
    ILLEGAL_PIECE_MOVE: 'illegal_piece_move',

    /**
     * The move would result in the player putting himself into a check.
     */
    IN_CHECK_AFTER_TURN: 'in_check',

    /**
     * The game has already ended.
     */
    GAME_ENDED: 'game_ended'
});

/**
 * Possible results of a chess game.
 */
const Result = Object.freeze({
    /**
     * The game is ongoing
     */
    ONGOING: 'ongoing',

    /**
     * White has been mated. Black is victorious.
     */
    WHITE_MATED: 'white_mated',

    /**
     * Black has been mated. White is victorious.
     */
    BLACK_MATED: 'black_mated',

    /**
     * White has resigned. Black is victorious.
     */
    WHITE_RESIGNED: 'white_resigned',

    /**
     * Black has resigned. White is victorious.
     */
    BLACK_RESIGNED: 'black_resigned',

    /**
     * White has run out of time. Black is victorious.
     */
    WHITE_FLAGGED: 'white_flagged',

    /**
     * Black has run out of time. White is victorious.
     */
    BLACK_FLAGGED: 'black_flagged',

    /**
     * The game is a stalemate. It's a draw.
     */
    STALEMATED: 'stalemate',

    /**
     * There is no sufficient materials for any of the players to force a checkmate. It's a draw.
     */
    INSUFFICIENT_MATERIAL: 'insufficient_material',

    /**
     * The same position occurred thrice in a game. It's a draw.
     */
    THREEFOLD_REPETITION: 'threefold_repetition',

    /**
     * 50 moves were made without making a capture or a pawn move. It's a draw.
     */
    FIFTY_MOVES: 'fifty_moves',

    /**
     * Players agreed to a draw.
     */
    DRAW_AGREED: 'draw_agreed',
});

/**
 * Represents a state of the game at any point.
 */
class GameState {
    /**
     * State of the board.
     *
     * @type {Board}
     */
    board;

    /**
     * Clock that is incremented every move and reset when a pawn move or a capture is made.
     *
     * Used for enforcing the 50-move rule.
     *
     * @type {number}
     */
    halfMoveClock;

    /**
     * Whose turn is it now.
     *
     * @type {string}
     *
     * @see Pieces.Color
     */
    currentTurn;

    /**
     * Whether or not white offered a draw this turn.
     *
     * @type {boolean}
     */
    whiteOffersDraw;

    /**
     * Whether or not black offered a draw this turn.
     *
     * @type {boolean}
     */
    blackOffersDraw;

    /**
     * Constructs a new GameState
     *
     * @param board state of the board
     * @param {number} halfMoveClock half move clock value for this state
     * @param {string} currentTurn whose turn is it now
     * @param {boolean} whiteOffersDraw whether or not white offered a draw this turn
     * @param {boolean} blackOfferDraws whether or not black offered a draw this turn
     */
    constructor(board, halfMoveClock, currentTurn, whiteOffersDraw, blackOfferDraws) {
        this.board = board;
        this.halfMoveClock = halfMoveClock;
        this.currentTurn = currentTurn;
        this.whiteOffersDraw = whiteOffersDraw;
        this.blackOffersDraw = blackOfferDraws;
    }
}

class Game {
    /**
     * Current state of the game.
     *
     * @type {GameState}
     */
    currentState;

    /**
     * Historical states of the game, starting from the oldest (initial position) at index 0.
     *
     * @type {GameState[]}
     */
    stateHistory = [];

    /**
     * Result of the game.
     *
     * Result.ONGOING if the game is not finished.
     *
     * @type {string}
     *
     * @see Result
     */
    result;

    /**
     * Creates a new Game and initializes it.
     */
    constructor() {
        this.reset();
    }

    /**
     * Resets a Game to its initial state and resets the state history.
     */
    reset() {
        this.currentState = new GameState(new Board(), 0, Pieces.Color.WHITE, false, false);
        this.currentState.board.setupDefaultBoard();
        this.stateHistory = [];

        this.result = Result.ONGOING;
    }

    /**
     * Undoes the last move.
     *
     * @returns {boolean} true if the action was succesful, false if the game already concluded or there are no moves to undo
     */
    takebackMove() {
        if (this.result !== Result.ONGOING || this.stateHistory.length === 0) {
            return false;
        }

        this.currentState = this.stateHistory.pop();
        this.currentState.board.recalculateAllPiecesMoves();
    }

    /**
     * Tries to make a valid move.
     *
     * @param from location of the piece to move
     * @param to the target square where the piece should go
     * @param extra extra information for a move (i.e. promotion information for pawns)
     *
     * @returns {string} result of the move
     *
     * @see Result
     */
    makeMove(from, to, extra) {
        if (this.result !== Result.ONGOING) {
            return MoveResult.GAME_ENDED;
        }

        const piece = this.currentState.board.getPiece(from);

        // check if move is valid
        if (! piece) {
            return MoveResult.NO_PIECE;
        }

        if (piece.color !== this.currentState.currentTurn) {
            return MoveResult.NOT_YOUR_PIECE;
        }

        const newBoard = this.currentState.board.cloneBoard();

        if (! newBoard.makeMoveIfValid(piece.location, to, extra)) {
            return MoveResult.ILLEGAL_PIECE_MOVE;
        }

        if (newBoard.isInCheck(this.currentState.currentTurn)) {
            return MoveResult.IN_CHECK_AFTER_TURN;
        }

        // move is valid, push this state to state history, make a new one
        const previousState = this.currentState;
        this.stateHistory.push(previousState);
        this.currentState = new GameState(
            newBoard,
            previousState.halfMoveClock + 1,
            Pieces.Color.swap(previousState.currentTurn),
            false,
            false
        );

        // reset half-move counter if a pawn move or a capture were made
        const lastMove = this.currentState.board.lastMove;
        if (lastMove.capture || lastMove.piece.type === Pieces.Type.PAWN) {
            this.currentState.halfMoveClock = 0;
        }

        if (this.currentState.board.getValidMovesFor(this.currentState.currentTurn).length === 0) {
            // current player has no moves
            if (this.currentState.board.isInCheck(this.currentState.currentTurn)) {
                // they are in check so its checkmate
                this.result = this.currentState.currentTurn === Pieces.Color.WHITE ? Result.WHITE_MATED : Result.BLACK_MATED;
            } else {
                // they are not in check so its stalemate
                this.result = Result.STALEMATED;
            }
        } else if (this.checkForInsufficientMaterial()) {
            // players have insufficient material to force a checkmate, it's a draw
            this.result = Result.INSUFFICIENT_MATERIAL;
        } else if (this.checkForThreefoldRepetition()) {
            // the same position was repeated three times, it's a draw
            this.result = Result.THREEFOLD_REPETITION;
        } else if (this.checkForFiftyMoveRuleViolation()) {
            // no captures or pawn moves in the last 50 moves, it's a draw
            this.result = Result.FIFTY_MOVES;
        }

        return MoveResult.MOVE_OK;
    }

    /**
     * Forces the player with the given color to resign.
     *
     * @param {string} color to resign
     *
     * @returns {boolean} true if the resignation succeeded, false if the game was already concluded
     */
    resign(color) {
        if (this.isConcluded()) {
            return false;
        }

        this.result = color === Pieces.Color.WHITE ? Result.WHITE_RESIGNED : Result.BLACK_RESIGNED;
        return true;
    }

    /**
     * Offers a draw by one one of the players.
     *
     * The other player must also agree by offering a draw in the same turn, then the game is concluded as a draw.
     *
     * @param {string} color color of the player offering a draw
     *
     * @returns {boolean} true if the draw offer was saved, false if the game is already concluded
     */
    offerDraw(color) {
        if (this.isConcluded()) {
            return false;
        }

        if (color === Pieces.Color.WHITE) {
            this.currentState.whiteOffersDraw = true;
        }

        if (color === Pieces.Color.BLACK) {
            this.currentState.blackOffersDraw = true;
        }

        if (this.currentState.whiteOffersDraw && this.currentState.blackOffersDraw) {
            this.result = Result.DRAW_AGREED;
        }

        return true;
    }

    /**
     * Checks if a side has sufficient material to deliver a mate.
     *
     * @param {string} side color of the side to be checked
     *
     * @returns {boolean} true if there is sufficent material to force mate, false if otherwise
     *
     * @private
     */
    _validateHasSufficientMaterial(side) {
        const count = this.currentState.board.getPiecesCountByType(side);

        // If there are rooks, queens or pawns the game is not dead
        if (count[Pieces.Type.ROOK] !== 0 || count[Pieces.Type.QUEEN] !== 0 || count[Pieces.Type.PAWN] !== 0) {
            return true;
        }

        const amountOfBishops = count[Pieces.Type.BISHOP];
        const amountOfKnights = count[Pieces.Type.KNIGHT];

        // 2 bishops, 3 knights or 1 bishop and 1 knight are enough to force a mate
        if (amountOfBishops >= 2) {
            return true;
        }

        if (amountOfKnights >= 3) {
            return true;
        }

        return amountOfBishops >= 1 && amountOfKnights >= 1;
    }

    /**
     * Checks if there is sufficient material for at least one of the player to force a checkmate.
     *
     * @returns {boolean} true if there is NOT sufficient material for any of the players to deliver mate.
     */
    checkForInsufficientMaterial() {
        return ! this._validateHasSufficientMaterial(Pieces.Color.WHITE)
            && ! this._validateHasSufficientMaterial(Pieces.Color.BLACK);
    }

    /**
     * Checks if there was a threefold repetition in this game, that is the same exact board state occurred 3 times
     * already. Two board states are considered same if the pieces and their positions on the board and identical, the
     * castling rights are the same and the en passant square and same.
     *
     * @returns {boolean}
     */
    checkForThreefoldRepetition() {
        let amountOfPreviousSamePositions = 1;

        const currentHash = this.currentState.board.calculateHash();

        this.stateHistory.forEach(other => {
            if (currentHash !== other.board.calculateHash()) {
                // diffreent hashes = different board states
                return;
            }

            if (! this.currentState.board.equals(other.board)) {
                // hash collision :(
                return;
            }

            amountOfPreviousSamePositions ++;
        });

        return amountOfPreviousSamePositions >= 3;
    }

    /**
     * Checks if the fifty-move rule was violated, that is no pawn move or a capture was made if the last 50 moves.
     *
     * @returns {boolean}
     */
    checkForFiftyMoveRuleViolation() {
        return this.currentState.halfMoveClock >= 50;
    }

    /**
     * Checks if the game has already concluded.
     *
     * @returns {boolean} true if the was already concluded
     */
    isConcluded() {
        return this.result !== Result.ONGOING;
    }

    /**
     * Gets the color of the winner of the game.
     * Should be called only if the game is already concluded.
     *
     * @returns {string} color of the winner, or null if its a draw or if the game is still ongoing
     *
     * @see isConcluded
     * @see Pieces.Color
     */
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
    GameState,
    Game
}
