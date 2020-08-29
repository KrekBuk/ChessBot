const Moves = require('./moves');

/**
 * Represents a color of a chess piece.
 */
const Color = Object.freeze({
    WHITE: 'white',
    BLACK: 'black',

    /**
     * Gets the opposite color
     *
     * @param color color to swap
     * @returns {string} opposite color
     */
    swap(color) {
        return color === Color.WHITE ? Color.BLACK : Color.WHITE;
    }
});

/**
 * Represents a type of a chess piece.
 */
const Type = Object.freeze({
    PAWN: 'pawn',
    ROOK: 'rook',
    KNIGHT: 'knight',
    BISHOP: 'bishop',
    QUEEN: 'queen',
    KING: 'king'
});

/**
 * Represents a square on a chess board.
 */
class Square {
    /**
     * Number of a file. 1-8, where 1 is A file, 8 is H file
     *
     * @type {number}
     */
    fileNumber;

    /**
     * Number of a rank on the board. 1-8.
     *
     * @type {number}
     */
    rankNumber;

    /**
     * Constructs a new Square
     *
     * @param {number|string} file number of the file, 1-8 or letter of the file A-H
     * @param {number} rankNumber number of the rank, 1-8
     */
    constructor(file, rankNumber) {
        if (typeof file === "string") {
            file = file.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
        }

        this.rankNumber = rankNumber;
        this.fileNumber = file;
    }

    /**
     * Gets the letter representation if this square's file (A-H)
     *
     * @returns {string}
     */
    getFileLetter() {
        return String.fromCharCode('A'.charCodeAt() + this.fileNumber - 1);
    }

    /**
     * Checks if the square is light
     *
     * @return {boolean} true if the square is light, false if its dark
     */
    isLight() {
        return (this.fileNumber % 2) ^ (this.rankNumber % 2);
    }

    /**
     * Gets a square that is relative to this square by [fileRelative] files and [rankRelative] ranks.
     *
     * @param {number} fileRelative change of file number between this square and the new square
     * @param {number} rankRelative change of rank number between this square and the new square
     *
     * @returns {Square} relative square
     */
    relative(fileRelative, rankRelative) {
        return new Square(this.fileNumber + fileRelative, this.rankNumber + rankRelative);
    }

    /**
     * Makes an array of squares where
     * the first element is  <pre><code>this.relative(fileRelative, rankRelative)</code></pre> and
     * the second element is  <pre><code>this.relative(fileRelative, rankRelative).relative(fileRelative, rankRelative)</code></pre>
     * ...
     *
     * This process continues until the square is invalid (outside the board)
     *
     * @param {number} fileRelative change of file number between two neighbouring squares in the array
     * @param {number} rankRelative change of rank number between two neighbouring squares in the array
     *
     * @returns {Square[]} array of squares
     */
    getRelativesUntilInvalid(fileRelative, rankRelative) {
        if (fileRelative === 0 && rankRelative === 0) {
            throw new Error("invalid arguments");
        }

        const squares = [];
        let current = this;

        for (; ;) {
            current = current.relative(fileRelative, rankRelative);

            if (!current.isValid()) {
                return squares;
            }

            squares.push(current);
        }
    }

    /**
     * Gets an array of squares that contain a path from one square to the other.
     * The path may be a diagonal or orthogonal, other paths are invalid.
     * The path contains neither [this] nor the [other] square.
     *
     * @param {Square} other target square for the path
     *
     * @returns {Square[]} the path, may be empty if not path but never null
     */
    pathTo(other) {
        if (other.equals(this)) {
            return [];
        }

        const fileChange = other.fileNumber - this.fileNumber;
        const rankChange = other.rankNumber - this.rankNumber;

        const fileChangeReduced = fileChange === 0 ? 0 : (fileChange / Math.abs(fileChange));
        const rankChangeReduced = rankChange === 0 ? 0 : (rankChange / Math.abs(rankChange));

        if (fileChange === 0 || rankChange === 0 ||
            Math.abs(fileChange) === Math.abs(rankChange)) {

            const path = this.getRelativesUntilInvalid(fileChangeReduced, rankChangeReduced);
            while (path.length > 0) {
                if (path.pop().equals(other)) {
                    break;
                }
            }

            return path;
        }

        // Invalid movement
        return [];
    }

    /**
     * Checks whether this and the other square are equal.
     *
     * @param {Square} other other square
     *
     * @returns {boolean} whether this and the other square are equal.
     */
    equals(other) {
        return !!other && this.fileNumber === other.fileNumber && this.rankNumber === other.rankNumber;
    }

    /**
     * Converts this square into a human readable string.
     * For example, fileNumber = 5, rankNumber = 1 would result in "E1"
     *
     * @returns {string} human-readable representation of this square.
     */
    asString() {
        return this.getFileLetter() + this.rankNumber;
    }

    /**
     * Checks whether this square is valid on a chess board.
     *
     * @returns {boolean} whether this square is valid on a chess board
     */
    isValid() {
        return this.rankNumber >= 1
            && this.fileNumber >= 1
            && this.rankNumber <= 8
            && this.fileNumber <= 8;
    }

    /**
     * Converts a human-readable square
     *
     * For example string "E1" would be converted to fileNumber = 5, rankNumber = 1
     *
     * @param string human-readable representation of a square
     *
     * @returns {Square|undefined} converted square or undefined if the string is invalid
     */
    static fromString(string) {
        if (string.length !== 2) {
            return undefined;
        }

        const square = new Square(
            string.charCodeAt(0) - 'A'.charCodeAt(0) + 1,
            string.charCodeAt(1) - '1'.charCodeAt(0) + 1,
        );

        if (!square.isValid()) {
            return undefined;
        }

        return square;
    }
}

/**
 * The base class for all chess pieces.
 */
class Piece {
    /**
     * List of potential valid moves that the piece can have.
     * They may not be valid. Use isMoveValid to validate if the move is actually valid.
     *
     * @type {Square[]}
     * @see isMoveValid
     */
    validMoves = [];

    /**
     * Type of the piece.
     *
     * @type {string}
     * @see Type
     */
    type;

    /**
     * Color of the piece.
     *
     * @type {string}
     * @see Color
     */
    color;

    /**
     * Board that this piece is located at.
     *
     * @type {Board}
     */
    board;

    /**
     * Square at which this piece is placed at.
     *
     * @type {Square}
     */
    location;

    /**
     * Constructs a new piece.
     * This should never be called directly. Use respective piece constructors instead or Piece.instantiate
     *
     * @param type type of this piece
     * @param color color of this piece
     * @param board board that this piece is located at
     * @param square square at which this piece is placed at.
     *
     * @see Type
     * @see Color
     * @see Square
     *
     * @protected
     */
    constructor(type, color, board, square) {
        this.type = type;
        this.color = color;
        this.board = board;
        this.location = square;
        this.recalculateValidMoves();
    }

    /**
     * Recalculates the validMoves array for this piece.
     *
     * @see validMoves
     */
    recalculateValidMoves() {
        this.validMoves = [];
    }

    /**
     * Updates the square of the piece on the board and recalculates its valid moves
     *
     * @param square new square of the pice
     *
     * @see recalculateValidMoves
     */
    updateLocation(square) {
        this.location = square;
        this.recalculateValidMoves();
    }

    /**
     * Removes invalid moves from the validMoves array
     *
     * @see validMoves
     */
    removeInvalidMoves() {
        this.validMoves = this.validMoves.filter(it => it.isValid());
    }

    /**
     * Checks if a move is valid.
     *
     * @param {Square} to target square for the piece
     * @param {string} [extra] extra information about the move (i.e. promotion)
     *
     * @returns {boolean} true if the move is valid, false if otherwise
     */
    isMoveValid(to, extra) {
        if (!to.isValid()) {
            return false;
        }

        return this.validMoves.filter(move => move.equals(to)).length > 0;
    }

    /**
     * Clones this piece to another board.
     * A new exact copy of this piece is placed on the new board.
     *
     * @param {Board} board board that the piece should be copied to.
     *
     * @returns {Piece} an exact copy of the piece, on the new board
     */
    cloneToAnotherBoard(board) {
        return Piece.instantiate(this.type, this.color, board, this.location);
    }

    /**
     * Method called on every
     *
     * @param {Moves.Move} move move that was just made
     */
    afterMove(move) {
        this.board.enPassantSquare = undefined;
    }

    /**
     * @private
     */
    static _pieceClasses = {};

    /**
     * Instantiates a piece class fo the given type.
     *
     * @param type type of the new piece
     * @param color color of the new piece
     * @param board board that new piece will be located at
     * @param square square of that piece on the board.
     *
     * @returns {Piece} newly instantiated piece
     *
     * @see Type
     * @see Color
     * @see Square
     */
    static instantiate(type, color, board, square) {
        if (!this._pieceClasses[Type.PAWN]) {
            // Lazy initialize
            Piece._pieceClasses[Type.PAWN] = Pawn;
            Piece._pieceClasses[Type.ROOK] = Rook;
            Piece._pieceClasses[Type.KNIGHT] = Knight;
            Piece._pieceClasses[Type.BISHOP] = Bishop;
            Piece._pieceClasses[Type.QUEEN] = Queen;
            Piece._pieceClasses[Type.KING] = King;
        }

        const constructor = Piece._pieceClasses[type];
        return new constructor(color, board, square);
    }
}

class Pawn extends Piece {
    /**
     * Constructs a new pawn.
     *
     * @param color color of this pawn
     * @param board board that this pawn is located at
     * @param square square at which this pawn is placed at.
     *
     * @see Color
     * @see Square
     */
    constructor(color, board, square) {
        super(Type.PAWN, color, board, square);
    }

    recalculateValidMoves() {
        const advanceDirection = this.getAdvanceDirection();

        this.validMoves.push(this.location.relative(0, advanceDirection));
        this.validMoves.push(this.location.relative(1, advanceDirection));
        this.validMoves.push(this.location.relative(-1, advanceDirection));

        if ((this.location.rankNumber === 2 && this.color === Color.WHITE) ||
            (this.location.rankNumber === 7 && this.color === Color.BLACK)) {

            this.validMoves.push(this.location.relative(0, advanceDirection * 2));
        }

        this.removeInvalidMoves();
    }

    isMoveValid(to, extra) {
        if (!super.isMoveValid(to, extra)) {
            return false;
        }

        const advanceDirection = this.getAdvanceDirection();

        if (this.location.fileNumber === to.fileNumber) {
            // Move forward

            if (this.location.rankNumber + advanceDirection !== to.rankNumber) {
                // pawns can only move by one
                // unless its their first move
                if (this.location.rankNumber === 2 || this.location.rankNumber === 7) {
                    // First move
                    if (this.location.rankNumber + advanceDirection * 2 !== to.rankNumber) {
                        return false;
                    }
                } else {
                    return false;
                }
            }

            // if square in front is occupied, pawn cannot move
            if (this.board.getPiece(to)) {
                return false;
            }

        } else if (to.fileNumber === this.location.fileNumber - 1 || to.fileNumber === this.location.fileNumber + 1) {
            let capturedPiece = this.board.getPiece(to);

            if (to.equals(this.board.enPassantSquare)) {
                capturedPiece = this.board.getPiece(new Square(to.fileNumber, this.location.rankNumber));
            }

            if (capturedPiece == null || capturedPiece.color === this.color) {
                return false;
            }

            // can only move 1 when capturing
            if (this.location.rankNumber + advanceDirection !== to.rankNumber) {
                return false;
            }

        } else {
            // Invalid move type
            return false;
        }

        if (to.rankNumber === 1 || to.rankNumber === 8) {
            // Promotion rank

            if (!extra || extra.length !== 1 || "QRBKN".indexOf(extra) === -1) {
                // no promotion arguments
                return false;
            }
        }

        return true;
    }

    afterMove(move) {
        const advanceDirection = this.getAdvanceDirection();

        // En passant
        if (move.to.equals(this.board.enPassantSquare)) {
            const enPassantTarget = new Square(move.to.fileNumber, move.from.rankNumber);
            this.board.removePieceAt(enPassantTarget);

            move.capture = true;
        }

        super.afterMove(move);

        if (move.from.rankNumber + advanceDirection * 2 === move.to.rankNumber) {
            this.board.enPassantSquare = move.from.relative(0, advanceDirection);
        }

        // Promotion
        if (move.to.rankNumber === 1 || move.to.rankNumber === 8) {
            let newPieceType;

            switch (move.extra) {
                case 'R':
                    newPieceType = Type.ROOK;
                    break;
                case 'B':
                    newPieceType = Type.BISHOP;
                    break;
                case 'K':
                case 'N':
                    newPieceType = Type.KNIGHT;
                    break;
                default:
                    newPieceType = Type.QUEEN;
                    break;
            }

            this.board.removePieceAt(move.to);
            this.board.setPiece(Piece.instantiate(newPieceType, this.color, this.board, move.to));
        }
    }

    getAdvanceDirection() {
        return this.color === Color.WHITE ? 1 : -1;
    }
}

class Rook extends Piece {

    /**
     * Constructs a new rook.
     *
     * @param color color of this rook
     * @param board board that this rook is located at
     * @param square square at which this rook is placed at.
     *
     * @see Color
     * @see Square
     */
    constructor(color, board, square) {
        super(Type.ROOK, color, board, square);
    }

    recalculateValidMoves() {
        this.validMoves = []
            .concat(this.location.getRelativesUntilInvalid(-1, 0))
            .concat(this.location.getRelativesUntilInvalid(1, 0))
            .concat(this.location.getRelativesUntilInvalid(0, 1))
            .concat(this.location.getRelativesUntilInvalid(0, -1));
    }

    isMoveValid(to, extra) {
        if (!super.isMoveValid(to, extra)) {
            return false;
        }

        return this.board.isPathClear(this.location.pathTo(to));
    }

    afterMove(move) {
        super.afterMove(move);

        if (move.from.fileNumber === 8) {
            this.board.castlingRights.short[this.color] = false
        }

        if (move.from.fileNumber === 1) {
            this.board.castlingRights.long[this.color] = false
        }
    }
}

class Knight extends Piece {

    /**
     * Constructs a new night.
     *
     * @param color color of this night
     * @param board board that this night is located at
     * @param square square at which this night is placed at.
     *
     * @see Color
     * @see Square
     */
    constructor(color, board, square) {
        super(Type.KNIGHT, color, board, square);
    }

    recalculateValidMoves() {
        this.validMoves = [
            this.location.relative(1, 2),
            this.location.relative(-1, 2),
            this.location.relative(1, -2),
            this.location.relative(-1, -2),
            this.location.relative(2, 1),
            this.location.relative(-2, 1),
            this.location.relative(2, -1),
            this.location.relative(-2, -1),
        ];

        this.removeInvalidMoves();
    }

    isMoveValid(to, extra) {
        return super.isMoveValid(to, extra);
    }
}

class Bishop extends Piece {

    /**
     * Constructs a new bishop.
     *
     * @param color color of this bishop
     * @param board board that this bishop is located at
     * @param square square at which this bishop is placed at.
     *
     * @see Color
     * @see Square
     */
    constructor(color, board, square) {
        super(Type.BISHOP, color, board, square);
    }

    recalculateValidMoves() {
        this.validMoves = []
            .concat(this.location.getRelativesUntilInvalid(-1, -1))
            .concat(this.location.getRelativesUntilInvalid(-1, 1))
            .concat(this.location.getRelativesUntilInvalid(1, -1))
            .concat(this.location.getRelativesUntilInvalid(1, 1));
    }

    isMoveValid(to, extra) {
        if (!super.isMoveValid(to, extra)) {
            return false;
        }

        return this.board.isPathClear(this.location.pathTo(to));
    }
}

class Queen extends Piece {

    /**
     * Constructs a new queen.
     *
     * @param color color of this queen
     * @param board board that this queen is located at
     * @param square square at which this queen is placed at.
     *
     * @see Color
     * @see Square
     */
    constructor(color, board, square) {
        super(Type.QUEEN, color, board, square);
    }

    recalculateValidMoves() {
        this.validMoves = []
            .concat(this.location.getRelativesUntilInvalid(-1, -1))
            .concat(this.location.getRelativesUntilInvalid(-1, 1))
            .concat(this.location.getRelativesUntilInvalid(1, -1))
            .concat(this.location.getRelativesUntilInvalid(1, 1))
            .concat(this.location.getRelativesUntilInvalid(-1, 0))
            .concat(this.location.getRelativesUntilInvalid(1, 0))
            .concat(this.location.getRelativesUntilInvalid(0, 1))
            .concat(this.location.getRelativesUntilInvalid(0, -1));
    }

    isMoveValid(to, extra) {
        if (!super.isMoveValid(to, extra)) {
            return false;
        }

        return this.board.isPathClear(this.location.pathTo(to));
    }
}

class King extends Piece {

    /**
     * Constructs a new king.
     *
     * @param color color of this king
     * @param board board that this king is located at
     * @param square square at which this king is placed at.
     *
     * @see Color
     * @see Square
     */
    constructor(color, board, square) {
        super(Type.KING, color, board, square);
    }

    recalculateValidMoves() {
        this.validMoves = [
            this.location.relative(-1, -1),
            this.location.relative(-1, 1),
            this.location.relative(1, -1),
            this.location.relative(1, 1),
            this.location.relative(-1, 0),
            this.location.relative(1, 0),
            this.location.relative(0, 1),
            this.location.relative(0, -1),
        ];

        if (this.board.castlingRights.long[this.color]) {
            this.validMoves.push(this.location.relative(-2, 0));
        }
        if (this.board.castlingRights.short[this.color]) {
            this.validMoves.push(this.location.relative(2, 0));
        }

        this.validMoves = this.validMoves.filter(it => it.isValid());
    }

    isMoveValid(to, extra) {
        if (!super.isMoveValid(to, extra)) {
            return false;
        }

        if (this.location.fileNumber === to.fileNumber - 2) {
            return this.canCastleShort();
        }

        if (this.location.fileNumber === to.fileNumber + 2) {
            return this.canCastleLong();
        }

        return true;
    }

    afterMove(move) {
        super.afterMove(move);

        let rookFrom, rookTo;

        if (move.to.fileNumber === move.from.fileNumber + 2) {
            // Short castle
            rookFrom = new Square(8, this.location.rankNumber);
            rookTo = new Square(6, this.location.rankNumber);
        }

        if (move.to.fileNumber === move.from.fileNumber - 2) {
            // Long castle
            rookFrom = new Square(1, this.location.rankNumber);
            rookTo = new Square(4, this.location.rankNumber);
        }

        if (rookFrom && rookTo) {
            const rook = this.board.getPiece(rookFrom);
            this.board.removePieceAt(rookFrom);

            rook.updateLocation(rookTo);
            this.board.setPiece(rook);
        }

        this.board.castlingRights.long[this.color] = false;
        this.board.castlingRights.short[this.color] = false;

        return false;
    }

    /**
     * Checks if king can castle with the given rook
     *
     * @param {Piece} rook rook to castle with
     * @returns {boolean} true if king can castle with that rook
     *
     * @private
     */
    _validateCanCastle(rook) {
        if ((this.color === Color.WHITE && this.location.asString() !== "E1") ||
            (this.color === Color.BLACK && this.location.asString() !== "E8")) {
            return false;
        }

        if (!rook || rook.color !== this.color || rook.type !== Type.ROOK) {
            return false;
        }

        if (this.board.isInCheck(this.color)) {
            // cannot castle out of check
            return false;
        }

        return this.board.isPathClear(this.location.pathTo(rook.location));
    }

    /**
     * Checks whether this king can castle short.
     *
     * @returns {boolean} whether this king can castle short.
     */
    canCastleShort() {
        if (!this.board.castlingRights.short[this.color]) {
            return false;
        }

        if (this.board.isAttacked(new Square('F', this.location.rankNumber), Color.swap(this.color))) {
            // f1  / f8 is attacked
            return false;
        }

        return this._validateCanCastle(this.board.getPiece(new Square('H', this.location.rankNumber)));
    }

    /**
     * Checks whether this king can castle long.
     *
     * @returns {boolean} whether this king can castle long.
     */
    canCastleLong() {
        if (!this.board.castlingRights.long[this.color]) {
            return false;
        }

        if (this.board.isAttacked(new Square('D', this.location.rankNumber), Color.swap(this.color))) {
            // d1 / d8 attacked
            return false;
        }

        return this._validateCanCastle(this.board.getPiece(new Square('A', this.location.rankNumber)));
    }
}


module.exports = {
    Color,
    Type,
    Square,
    Piece,
    Pawn,
    Rook,
    Knight,
    Bishop,
    Queen,
    King,
}
