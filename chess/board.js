const Pieces = require('./pieces');
const Moves = require('./moves');

class Board {
    /**
     * Array of squares that should be highlighted when the board is rendered to a player.
     *
     * @type {Pieces.Square[]}
     */
    highlightedSquares = [];

    /**
     * Last move that happened on this board.
     *
     * @type {Moves.Move}
     */
    lastMove;

    /**
     * Short and long castling rights on the board for both colors.
     *
     * @type {{short: {}, long: {}}}
     */
    castlingRights = {
        long: {
            [Pieces.Color.WHITE]: false,
            [Pieces.Color.BLACK]: false,
        },
        short: {
            [Pieces.Color.WHITE]: false,
            [Pieces.Color.BLACK]: false,
        }
    };

    /**
     * Square at where an en passant capture may happen on the board.
     * May be undefined if not en passant are possibles.
     *
     * @type {Pieces.Square}
     */
    enPassantSquare;

    /**
     * Object holding all the pieces on the board
     *
     * @type {Object.<string, Pieces.Piece>}
     */
    _pieces = {};

    /**
     * Is cached board hash dirty and must be recalculated.
     *
     * @type {boolean}
     * @private
     */
    _dirty = true;

    /**
     * Cached board hash, valid only if the _dirty flag is set, otherwise must be recalculated.
     * Do not access directly use calculateHash() method.
     *
     * @type {string}
     * @see calculateHash
     * @private
     */
    _hash = "";

    /**
     * Creates new, empty chess board.
     */
    constructor() {
        this._pieces = {};
    }

    /**
     * Sets up all the pieces on their starting squares in a normal chess game for the given color.
     *
     * @param {string} color color to be set up
     * @private
     */
    _setupInitialPieces(color) {
        const rank = color === Pieces.Color.WHITE ? 1 : 8;

        this.setPiece(Pieces.Piece.instantiate(Pieces.Type.ROOK, color, this, new Pieces.Square(1, rank)));
        this.setPiece(Pieces.Piece.instantiate(Pieces.Type.KNIGHT, color, this, new Pieces.Square(2, rank)));
        this.setPiece(Pieces.Piece.instantiate(Pieces.Type.BISHOP, color, this, new Pieces.Square(3, rank)));
        this.setPiece(Pieces.Piece.instantiate(Pieces.Type.QUEEN, color, this, new Pieces.Square(4, rank)));
        this.setPiece(Pieces.Piece.instantiate(Pieces.Type.KING, color, this, new Pieces.Square(5, rank)));
        this.setPiece(Pieces.Piece.instantiate(Pieces.Type.BISHOP, color, this, new Pieces.Square(6, rank)));
        this.setPiece(Pieces.Piece.instantiate(Pieces.Type.KNIGHT, color, this, new Pieces.Square(7, rank)));
        this.setPiece(Pieces.Piece.instantiate(Pieces.Type.ROOK, color, this, new Pieces.Square(8, rank)));
    }

    /**
     * Sets up all the pawns on their starting squares in a normal chess game for the given color.
     *
     * @param {string} color color to be set up
     * @private
     */
    _setupInitialPawns(color) {
        const rank = color === Pieces.Color.WHITE ? 2 : 7;

        for (let file = 1; file <= 8; file++) {
            this.setPiece(Pieces.Piece.instantiate(Pieces.Type.PAWN, color, this, new Pieces.Square(file, rank)));
        }
    }

    /**
     * Sets up this board for a regular chess game.
     *
     * All the pieces are cleared and a new position is set up, castling rights and en passant are reset.
     */
    setupDefaultBoard() {
        this._pieces = {};

        this.castlingRights.short[Pieces.Color.WHITE] = true;
        this.castlingRights.short[Pieces.Color.BLACK] = true;
        this.castlingRights.long[Pieces.Color.WHITE] = true;
        this.castlingRights.long[Pieces.Color.BLACK] = true;

        this.highlightedSquares = [];
        this.lastMove = undefined;
        this.enPassantSquare = undefined;

        this._setupInitialPieces(Pieces.Color.WHITE);
        this._setupInitialPieces(Pieces.Color.BLACK);
        this._setupInitialPawns(Pieces.Color.WHITE);
        this._setupInitialPawns(Pieces.Color.BLACK);
    }

    /**
     * Adds a piece to a board, or if the piece already is on the board, updates its location.
     *
     * @param {Pieces.Piece} piece piece to be added / updated
     */
    setPiece(piece) {
        this._pieces[piece.location.asString()] = piece;
        this._dirty = true;
    }

    /**
     * Deletes a piece from the given location.
     *
     * @param {Piece.Square} location location at which a piece should be deleted
     */
    removePieceAt(location) {
        delete this._pieces[location.asString()];
        this._dirty = true;
    }

    /**
     * Gets a piece at the given location.
     *
     * @param {Piece.Square} location posilocationch a piece should be get from
     *
     * @return {Pieces.Piece} piece at that location, or undefined if there is no piece there
     */
    getPiece(location) {
        return this._pieces[location.asString()];
    }

    /**
     * Checks if a path is clear, that is every squares on this board on this path is empty (does not have a piece).
     *
     * @param path path to be checked
     * @returns {boolean} true only if all the squares on the path are empty
     */
    isPathClear(path) {
        return path.every(it => !this.getPiece(it));
    }

    /**
     * Checks if the given square is attacked by any piece of the given color.
     *
     * @param {Pieces.Square} square square to be checked
     * @param {Pieces.Color} [color] color filter, only pieces of this color will be checked for attacking, optional
     *
     * @returns {boolean} true if the square is attacked
     */
    isAttacked(square, color) {
        for (let pieceLocation in this._pieces) {
            const piece = this._pieces[pieceLocation];

            if (color && color !== piece.color) {
                continue;
            }

            for (let moveKey in piece.validMoves) {
                const move = piece.validMoves[moveKey];

                if (!move.equals(square)) {
                    continue;
                }

                if (!piece.isMoveValid(move, "Q")) {
                    continue;
                }

                return true;
            }
        }

        return false;
    }

    /**
     * Checks if the king with the given color is checked.
     *
     * @param {Pieces.Color} color color to be checked
     *
     * @returns {boolean} true if the king is in check
     */
    isInCheck(color) {
        for (let location in this._pieces) {
            const piece = this._pieces[location];

            if (piece.type !== Pieces.Type.KING || piece.color !== color) {
                // not a king, or a king of invalid color
                continue;
            }

            if (this.isAttacked(piece.location, Pieces.Color.swap(color))) {
                // king is attacked by an enemy piece
                return true;
            }
        }

        return false;
    }

    /**
     * Gets all valid moves for a player with the given color.
     *
     * @param color color to check
     *
     * @returns {Moves.Move[]} list of valid moves
     */
    getValidMovesFor(color) {
        const validMoves = [];

        for (let location in this._pieces) {
            const piece = this._pieces[location];

            if (piece.color !== color) {
                continue;
            }

            for (let moveId in piece.validMoves) {
                const move = piece.validMoves[moveId];
                const board = this.cloneBoard();

                if (!board.makeMoveIfValid(piece.location, move, "Q")) {
                    continue;
                }

                if (board.isInCheck(color)) {
                    continue;
                }

                validMoves.push(board.lastMove);
            }
        }

        return validMoves;
    }

    /**
     * Counts all pieces of the given color and returns the result.
     *
     * @param {Pieces.Color} color piece color to count
     *
     * @returns {Object.<string, number>} count of every piece of the given color. Keys are piece types, values are the counts.
     */
    getPiecesCountByType(color) {
        let count = {
            [Pieces.Type.KING]: 0,
            [Pieces.Type.QUEEN]: 0,
            [Pieces.Type.ROOK]: 0,
            [Pieces.Type.BISHOP]: 0,
            [Pieces.Type.KNIGHT]: 0,
            [Pieces.Type.PAWN]: 0
        };

        for (let location in this._pieces) {
            const piece = this._pieces[location];

            if (piece && piece.color === color) {
                count[piece.type] = (count[piece.type] || 0) + 1;
            }
        }

        return count;
    }

    /**
     * Gets the material count on the board for the given color.
     *
     * @param {Pieces.Color} color color to count
     *
     * @returns {number} total material count for the player of the given color
     */
    getMaterialCount(color) {
        const count = this.getPiecesCountByType(color);

        return count[Pieces.Type.QUEEN] * 9 +
            count[Pieces.Type.ROOK] * 5 +
            count[Pieces.Type.BISHOP] * 3 +
            count[Pieces.Type.KNIGHT] * 3 +
            count[Pieces.Type.PAWN];
    }

    /**
     * Makes an exact copy of this board.
     * The full state of the board and all the pieces on the board are copied onto the new board.
     *
     * @returns {Board} exact copy of this board.
     */
    cloneBoard() {
        const newBoard = new Board();

        // copy castling rights and en passant square
        newBoard.castlingRights.short[Pieces.Color.WHITE] = this.castlingRights.short[Pieces.Color.WHITE];
        newBoard.castlingRights.short[Pieces.Color.BLACK] = this.castlingRights.short[Pieces.Color.BLACK];
        newBoard.castlingRights.long[Pieces.Color.WHITE] = this.castlingRights.long[Pieces.Color.WHITE];
        newBoard.castlingRights.long[Pieces.Color.BLACK] = this.castlingRights.long[Pieces.Color.BLACK];

        newBoard.enPassantSquare = this.enPassantSquare;

        // clone pieces
        for (let location in this._pieces) {
            if (!this._pieces[location]) {
                continue;
            }

            newBoard._pieces[location] = this._pieces[location].cloneToAnotherBoard(newBoard);
        }

        // other copies
        newBoard.highlightedSquares = Array.from(this.highlightedSquares);
        newBoard.lastMove = !!this.lastMove
            ? new Moves.Move(newBoard.getPiece(this.lastMove.piece.location), this.lastMove.from, this.lastMove.to, this.lastMove.capture, this.lastMove.extra)
            : undefined;

        return newBoard;
    }

    /**
     * Recalculates validMoves for all pieces on the board.
     */
    recalculateAllPiecesMoves() {
        for (let location in this._pieces) {
            if (!this._pieces[location]) {
                continue;
            }

            this._pieces[location].recalculateValidMoves();
        }
    }

    /**
     * Makes a move if its valid.
     *
     * @param {Pieces.Square} from square where the piece should be moved from
     * @param {Pieces.Square} to square where the piece should be moved to
     * @param {string} [extra] extra information about the move (i.e. promotion information for pawns)
     *
     * @returns {boolean} true if the move was valid and was successfully made, false if it was not
     */
    makeMoveIfValid(from, to, extra) {
        const piece = this.getPiece(from);

        if (!piece) {
            // no piece there
            return false;
        }

        if (!piece.isMoveValid(to, extra)) {
            // move is invalid
            return false;
        }

        // make a move object
        let lastMove = new Moves.Move(piece, from, to, false, extra);

        const pieceAtDestination = this.getPiece(to);
        if (pieceAtDestination) {
            if (pieceAtDestination.color === piece.color) {
                // cannot capture own pieces
                return false;
            }

            lastMove.capture = true;
            this.removePieceAt(to);
        }

        // remove piece from old location
        this.removePieceAt(from);

        // move it to the new location
        piece.updateLocation(to);
        this.setPiece(piece);

        // after move callbacks
        piece.afterMove(lastMove);
        this.recalculateAllPiecesMoves();

        // update last move and highlight from and to squares
        this.lastMove = lastMove;
        this.highlightedSquares = [to, from];

        return true;
    }

    /**
     * Calculates or gets a cached hash of this position.
     *
     * @returns {string} hash of the position
     */
    calculateHash() {
        if (!this._dirty) {
            return this._hash;
        }

        let hash = 7;

        for (let rank = 1; rank <= 8; rank++) {
            for (let file = 1; file <= 8; file++) {
                const piece = this._pieces[new Pieces.Square(rank, file).asString()];

                if (!piece) {
                    continue;
                }

                let pieceTypeId;

                switch (piece.type) {
                    case Pieces.Type.PAWN:
                        pieceTypeId = 1;
                        break;
                    case Pieces.Type.KNIGHT:
                        pieceTypeId = 2;
                        break;
                    case Pieces.Type.ROOK:
                        pieceTypeId = 3;
                        break;
                    case Pieces.Type.BISHOP:
                        pieceTypeId = 4;
                        break;
                    case Pieces.Type.QUEEN:
                        pieceTypeId = 5;
                        break;
                    case Pieces.Type.KING:
                        pieceTypeId = 6;
                        break;
                }

                const pieceColorId = piece.color === Pieces.Color.WHITE ? 1 : 2;

                hash = 31 * (128 * pieceTypeId + 64 * pieceColorId + piece.location.rankNumber * 8 + piece.location.fileNumber);
                hash |= 0;
            }
        }

        this._dirty = false;
        this._hash = hash.toString();

        return this._hash;
    }

    /**
     * Checks if this board is equal to the other board.
     *
     * For two boards to be equal they must have the same exact pieces located at the same exact squares, have the same
     * castling rights for both players and have the same en passant squre.
     *
     * @param other other board to compare to
     * @returns {boolean} true if this board is equal to the other board
     */
    equals(other) {
        if (
            other.enPassantSquare !== this.enPassantSquare ||
            other.castlingRights.short[Pieces.Color.WHITE] !== this.castlingRights.short[Pieces.Color.WHITE] ||
            other.castlingRights.short[Pieces.Color.BLACK] !== this.castlingRights.short[Pieces.Color.BLACK] ||
            other.castlingRights.long[Pieces.Color.WHITE] !== this.castlingRights.long[Pieces.Color.WHITE] ||
            other.castlingRights.long[Pieces.Color.BLACK] !== this.castlingRights.long[Pieces.Color.BLACK]
        ) {
            return false;
        }

        for (let location in this._pieces) {
            const p1 = this._pieces[location];
            const p2 = other._pieces[location];

            if (!p1) {
                if (p2) {
                    return false;
                }

                continue;
            }

            if (!p2) {
                return false;
            }

            if (p1.color !== p2.color || p1.type !== p2.type) {
                return false;
            }
        }

        return true;
    }
}

module.exports = Board;