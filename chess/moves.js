const Pieces = require('./pieces');

/**
 * Represents a chess move.
 */
class Move {
    /**
     * The piece that was moved.
     *
     * @type {Pieces.Piece}
     */
    piece;

    /**
     * Square where the piece was moved from.
     *
     * @type {Pieces.Square}
     */
    from;

    /**
     * Square where the piece was moved to.
     *
     * @type {Pieces.Square}
     */
    to;

    /**
     * Was this move a capture?
     *
     * @type {boolean}
     */
    capture;

    /**
     * Extra information about the move (i.e. promotion information for pawns)
     *
     * @type {string}
     */
    extra;

    /**
     * Constructs a new move.
     *
     * @param {Pieces.Piece} piece the piece that was moved
     * @param {Pieces.Square} from square where the piece was moved from
     * @param {Pieces.Square} to square where the piece was moved to
     * @param {boolean} capture was this move a capture
     * @param {string} extra extra information about the move
     */
    constructor(piece, from, to, capture, extra) {
        this.piece = piece;
        this.from = from;
        this.to = to;
        this.capture = capture;
        this.extra = extra;
    }
}

module.exports = {
    Move
};
