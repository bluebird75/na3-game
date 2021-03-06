'use strict';

const PLAY_WIDTH = 300;
const PLAY_HEIGHT = 356;
const SPT_WIDTH = 30;
const SPT_HEIGHT = 30;
const TOP_ROW_Y = 120 - 2.5*SPT_HEIGHT;
const BOARD_Y   = 118;
const NEXT_ELT_Y = BOARD_Y + SPT_HEIGHT * 1.2;
const NEXT_ELT_X1 = SPT_WIDTH * 7;
const NEXT_ELT_X2 = SPT_WIDTH * 8;
const NB_ROWS = 7;
const TOP_ROW = NB_ROWS-1;
const NB_COLS = 6;
const DELTA_MOVE_X = 3;
const DELTA_MOVE_Y = 5;
const DEFAULT_COL = 2;
const DIR_LEFT = 'DIR_LEFT';
const DIR_RIGHT = 'DIR_RIGHT';
const DIR_DOWN = 'DIR_DOWN';
const DIR_UP = 'DIR_UP';
const DELTA_ALPHA = 0.02;

const ELT_GEN_WEIGHT = [18, 18, 18, 18, 12, 8, 7, 5, 4, 1, 1];
const ALL_ELT_NAMES = [
    'na3-assets/elt0.png',
    'na3-assets/elt1.png',
    'na3-assets/elt2.png',
    'na3-assets/elt3.png',
    'na3-assets/elt4.png',
    'na3-assets/elt5.png',
    'na3-assets/elt6.png',
    'na3-assets/elt7.png',
    'na3-assets/elt12.png',
    'na3-assets/elt17.png',
    'na3-assets/elt18.png',
];

const NB_ELT = ALL_ELT_NAMES.length; // 11 elements

const STATE_LANDING     = 'STATE_LANDING';
const STATE_NEW_ELEM    = 'STATE_NEW_ELEM';
const STATE_IDLE        = 'STATE_IDLE';
const STATE_MOVING_LR   = 'STATE_MOVING_LR';
const STATE_ROTATING    = 'STATE_ROTATING';
const STATE_MOVING_DOWN = 'STATE_MOVING_DOWN';
const STATE_ALCHEMY     = 'STATE_ALCHEMY';
const STATE_TRANSMUTATION = 'STATE_TRANSMUTATION';
const STATE_ALCHEMY_FALL  = 'STATE_ALCHEMY_FALL';

/***********************************
 *                                 *
 *              Game concept       *

state:
- new element
    * put the next element into the current element
    * generate random element + new sprite for the next element and display it
    * place it on screen
        -> landing
     
- landing:
    * move element until it reaches the top row
        -> idle

- idle
    * catch keyboard events
    * if move element right, left 
        -> moving_lr
    * if move element down
        -> moving_down
    * if rotating
        -> rotating

- moving left/right
    * move element left/right
        -> idle

- moving down
    * move element to the bottom of the screen
        -> alchemy

- rotating
    * rotate the element to a new position
        -> idle

- alchemy
    * calculate elements to remove and to add
    * if new elements
        -> transmutation
    * no changes
        -> check if player lost
        -> new element

- transmutation
    * fade out and fade in elements
        -> alchemy fall

- alchemy fall
    * move elements falling
        -> alchemy

************************************/

let game = { 
    // current state of the game: STATE_xxx
    state: '',

    // current base position of our sprite pair in the top row
    base_col: 0, 

    // where the sprites are actually located vs the base position    
    row_delta1: 0,  // 0 or 1
    col_delta1: 0,  // 0 or 1
    row_delta2: 0,  // 0 or 1
    col_delta2: 0,  // 0 or 1

    // our current element index pair
    elt1: -1,
    elt2: -1,

    // our next element index pair
    next_elt1: -1,
    next_elt2: -1,

    // current max element (inclusive), defaults to 2, meaning: green + yellow + red potions
    cur_max_elt: 2,

    // set to: down, up, left, right when a key is pressed, nothing else
    keypressed: [],

    // set to true when accepting key presses
    accept_key_press: false,

    // list of group of moves:
    // [ 
    //   [move1, move2]
    //   ...
    // ]
    move_in_progress: [],

    // list of all alchemic operations in progress
    transmutation_in_progress: [],

    // board[row][col] for the elements
    // board[0] is the row of the bottom of the screen
    // board[TOP_ROW] is the upper valid row of the screen
    // board[TOP_ROW+1] and board[TOP_ROW+2] are extra row, for allowing transmutations
    //      when placing an item above the maximum
    board: [],

    // map of every sprite of the game
    // sprites[ [1,2] ] -> sprite at row 1, column 2
    // sprites[ 'current1' ] -> sprite manipulated by the cursor
    // sprites[ 'current2' ] -> sprite manipulated by the cursor
    // sprites[ 'next1' ] -> next sprite to appear
    // sprites[ 'next2' ] -> next sprite to appear
    sprites: {},
};


let assets = {
    // our PIXI application
    app: null,

    // store all the textures to use for our sprites
    textures: [],
};

/*********************************************************
 * 
 *                Utilities
 * 
 *********************************************************/


/** return a random number r: 0 <= r < top_limit */
function random_nb(top_limit)
{
    return Math.floor(Math.random()*top_limit);
}

function na3_max(v1, v2)
{
    if (v1 >= v2) return v1;
    return v2;
}

function na3_min(v1, v2)
{
    if (v1 <= v2) return v1;
    return v2;
}

/** Return the y value for a sprite in a given row.
 *  0 - TOP_ROW+2: row in the board
 */
function sprite_y_from_row(row)
{
    return BOARD_Y + (TOP_ROW - row) * SPT_HEIGHT;
}

function sprite_x_from_col(col)
{
    return col * SPT_WIDTH;

}

/*********************************************************
 * 
 *                Game initialisation
 * 
 *********************************************************/

/** Global initialisation of the game */
export function na3_start() {
    console.log("Attention, on alchimise ici!!");

    // our main drawing area
    assets.app = new PIXI.Application({ width: PLAY_WIDTH, height: PLAY_HEIGHT });
    let placeholder = document.getElementById("na3-implem-host");
    placeholder.appendChild(assets.app.view);
    placeholder.setAttribute('tabindex', '0');
    placeholder.onkeydown = (e) => na3_onkeydown(e);
    placeholder.focus();

    // our background
    let bg = PIXI.Sprite.from('na3-assets/bg_clipped.png');
    bg.width = PLAY_WIDTH;
    bg.height = PLAY_HEIGHT;
    assets.app.stage.addChild(bg);


    // the textures for all our sprites
    ALL_ELT_NAMES.forEach((e) => {
        assets.textures.push( PIXI.Texture.from(e) );
    });

    for (let i=0; i<NB_ROWS+2; i++) {
        game.board.push( [-1, -1, -1, -1, -1, -1] );
    }

    generate_next_element_pair();
    enter_state(STATE_NEW_ELEM);

    assets.app.ticker.add(game_loop);
}

/** Close the loop, unload all textures */
export function na3_end() {
    console.log('The end already ?');
    for (let k in game.sprites) {
        let sp = game.sprites[k];
        if (sp !== undefined && sp !== null) {
            sp.destroy();
        }
    }
    assets.textures.foreach((t) => { t.destroy(); });
    assets.app.destroy();
    game = null;
}


/*******************************************************
 * 
 *                Game logic
 * 
 *******************************************************/

/* Switch the state of the game */
function enter_state(state)
{
    console.log('Entering state ', state);
    game.state = state;

    switch (state) {
        case STATE_IDLE: 
        case STATE_LANDING:
        case STATE_MOVING_LR:
        case STATE_ROTATING:
            game.accept_key_press = true;
            break;
        default:
            game.keypressed = [];
            game.accept_key_press = false;
            break;
    }
}


function game_loop()
{

    switch (game.state)
    {
        case STATE_NEW_ELEM:
            land_new_element_pair();
            return;

        case STATE_IDLE:
            handle_game_key();
            return;

        case STATE_MOVING_LR:
        case STATE_ROTATING:
        case STATE_MOVING_DOWN:
        case STATE_LANDING:
        case STATE_ALCHEMY_FALL:
            handle_moving();
            return;

        case STATE_ALCHEMY:
            perform_alchemy();
            break;

        case STATE_TRANSMUTATION:
            perform_transmutation();
            break;

        default:
            console.error('default clause reached, unexpected!');
    }
}

/*******************************************************
 * 
 *                New element generation
 * 
 *******************************************************/

/** Generate a new element according to the weight */
function generate_random_elt(cur_max_elt, elt_gen_weight)
{
    let max_weigth = 0;
    // note that cur_max_elt is inclusive
    for (let i=0; i<=cur_max_elt; i++) {
        max_weigth += elt_gen_weight[i];
    }
    let random_idx = random_nb(max_weigth);
    let elt = 0;
    while (random_idx > elt_gen_weight[elt] && elt < elt_gen_weight.length) {
        random_idx -= elt_gen_weight[elt];
        elt += 1;
    }

    if (elt == elt_gen_weight.length) {
        // we went through all the array of elements and the index is still above
        // problem !!!
        throw new Error('Invalid random element: ' + random_idx.toString());
    }
    return elt;
}

// Generate next element sprite
function generate_next_element_pair()
{
    game.next_elt1 = generate_random_elt(game.cur_max_elt, ELT_GEN_WEIGHT);
    game.next_elt2 = generate_random_elt(game.cur_max_elt, ELT_GEN_WEIGHT);
    game.sprites.next1 = new PIXI.Sprite(assets.textures[game.next_elt1]);
    game.sprites.next2 = new PIXI.Sprite(assets.textures[game.next_elt2]);
    assets.app.stage.addChild(game.sprites.next1);
    assets.app.stage.addChild(game.sprites.next2);
    game.sprites.next1.x = NEXT_ELT_X1;
    game.sprites.next2.x = NEXT_ELT_X2;
    game.sprites.next1.y = NEXT_ELT_Y;
    game.sprites.next2.y = NEXT_ELT_Y;
}

// Place a new element on the landing row and generate next element
function land_new_element_pair()
{
    game.sprites.current1 = game.sprites.next1;
    game.sprites.current2 = game.sprites.next2;
    game.elt1 = game.next_elt1;
    game.elt2 = game.next_elt2;
    generate_next_element_pair();

    game.base_col = DEFAULT_COL;
    game.col_delta1 = 0;
    game.col_delta2 = 1;
    game.row_delta1 = 0;
    game.row_delta2 = 0;

    // init sprite position
    game.sprites.current1.x = sprite_x_from_col(game.base_col + game.col_delta1);
    game.sprites.current2.x = sprite_x_from_col(game.base_col + game.col_delta2);
    game.sprites.current1.y = -SPT_HEIGHT;
    game.sprites.current2.y = -SPT_HEIGHT;

    // Move(sprite, dir, dest_x, dest_y, done = null) {
    game.move_in_progress.push( [
        new Move(
            game.sprites.current1,
            game.sprites.current1.x, 
            TOP_ROW_Y
        ),
        new Move(
            game.sprites.current2,
            game.sprites.current2.x, 
            TOP_ROW_Y
        )
    ]);

    enter_state(STATE_LANDING);
}

/*********************************************************************
 * 
 *                  Board logic
 * 
 *********************************************************************/

/** return the next row available to put an element in a given column.
 * 
 * When there are 0 elements in the board, this is row 0.
 * The last position of the column to put an element is row TOP_ROW+2
 * Returning -1 means there is no room left in the column at all
 * 
 */
function column_next_row(board, col)
{
    for (let row=0; row<TOP_ROW+3; row++) {
        if (board[row][col] === -1) {
            return row;
        }
    }
    return -1;
}


/*********************************************************************
 * 
 *                  Movement
 * 
 *********************************************************************/

/** Create a new move:
 * sprite: the sprite object to move
 * dest_x, dest_y: coordinates of the destination
 */
function Move(sprite, dest_x, dest_y) {
    this.sp = sprite;
    this.pos_it = generate_translation_move(sprite.x, sprite.y, dest_x, dest_y);
}


/** Generator for moving from (x,y) to (dest_x, dest_y).
 * 
 * On each iteration, returns a (x,y) pair adjusted by a delta of (DELTA_X, DELTA_Y)
 */
function* generate_translation_move(x, y, dest_x, dest_y)
{
    let dir_x = x < dest_x ? 1 : -1;
    let dir_y = y < dest_y ? 1 : -1;

    while (x !== dest_x || y !== dest_y) {
        // We use the dir value to handle in one block the case where dest_x > x and dest_x < x
        if (x*dir_x < dest_x*dir_x) {
            x += DELTA_MOVE_X*dir_x;
            x = dir_x*na3_min(dir_x*x, dir_x*dest_x);
        }

        if (y*dir_y < dest_y*dir_y) {
            y += DELTA_MOVE_Y*dir_y;
            y = dir_y*na3_min(dir_y*y, dir_y*dest_y);
        }
        yield [x, y];
    }
    return;
}

function handle_moving()
{
    let move_group_to_remove = [];

    for (let i=0; i<game.move_in_progress.length; i++) {
        let move_group = game.move_in_progress[i];
        let group_goal_reached = 0;

        for (let j=0; j<move_group.length; j++) {
            let move = move_group[j];

            let next_pos_it = move.pos_it.next();
            if (next_pos_it.done) {
                group_goal_reached += 1;
            } else {
                // unpack x, y from the iterator
                [move.sp.x, move.sp.y] = next_pos_it.value;
            }
        }

        // check all the objects of the group have reached their destination
        if (group_goal_reached === move_group.length) {
            // we have reached our destination for the group, register this move group for deletion
            move_group_to_remove.push(i);
        }
    }

    // we must remove the indices in backward order, to avoid them
    // changing in the middle
    for (let i=move_group_to_remove.length-1; i>=0 ;i--) {
        game.move_in_progress.splice(move_group_to_remove[i], 1);
    }

    // if all moves are completed, we can begin our next step
    if (game.move_in_progress.length === 0) {
        switch (game.state) {
            case STATE_MOVING_DOWN:
            case STATE_ALCHEMY_FALL:
                enter_state(STATE_ALCHEMY);
                break;

            case STATE_MOVING_LR:
            case STATE_LANDING:
            case STATE_ROTATING:
                enter_state(STATE_IDLE);
                break;

            default:
                console.error('Should not be reached...');
        }
    }

}


/*********************************************************************
 * 
 *                  Alchemy
 * 
 *********************************************************************/

/** A transmutation
 * - new_elem_row: row of the new element generated
 * - new_elem_col: column of the new element generated
 * - new_elem_val: value of the new element generated
 * - new_elem_sprite: sprite representing the new element
 * - old_elem_pos: list of (row,col) of old elements
 * - old_elem_sprites: list of sprites representing the old elements
 */
function Transmutation(new_elem_row, new_elem_col, new_elem_val, old_elem_pos)
{
    this.new_elem_row = new_elem_row;
    this.new_elem_col = new_elem_col;
    this.new_elem_val = new_elem_val;
    this.new_elem_sprite = null;
    this.new_elem_alpha = 0;

    this.old_elem_pos = old_elem_pos;
    this.old_elem_sprites = [];
}

// return true if the array contains any other value than value itself
function contains_other_than(array, value)
{
    for (let v of array) {
        if (v !== value) {
            return true;
        }
    }
    return false;
}

function perform_alchemy()
{
    // analyse board for alchemic operations
    let transmutations_desc = na3_shared_utils.calc_transmutations(game.board, NB_ELT);

    game.transmutation_in_progress = [];

    // if no operations, generate new element
    if (transmutations_desc.length === 0) {
        // all transumtations done, check if lost ?
        if (contains_other_than(game.board[TOP_ROW+2], -1)
            || contains_other_than(game.board[TOP_ROW+1], -1)) {
            alert('You lost!');
            na3_end();
            return;
        }

        enter_state(STATE_NEW_ELEM);
        return;
    }

    transmutations_desc.forEach((trans_desc) => {
        let trans = new Transmutation(
            trans_desc[1][0],
            trans_desc[1][1],
            trans_desc[1][2],
            trans_desc[0]
        );

        // remove the old sprites from the sprite map
        trans.old_elem_pos.forEach((pos) => {
            trans.old_elem_sprites.push(game.sprites[ pos ]);
            delete game.sprites[ pos ];
        });

        // create the new sprite
        trans.new_elem_sprite = new PIXI.Sprite(assets.textures[trans.new_elem_val]);
        trans.new_elem_sprite.alpha = 0;
        assets.app.stage.addChild(trans.new_elem_sprite);
        trans.new_elem_sprite.y = sprite_y_from_row(trans.new_elem_row);
        trans.new_elem_sprite.x = sprite_x_from_col(trans.new_elem_col);
        game.sprites[ [trans.new_elem_row, trans.new_elem_col] ] = trans.new_elem_sprite;

        game.transmutation_in_progress.push(trans);

        let new_max_elt =  na3_max(game.cur_max_elt, trans.new_elem_val);
        if (new_max_elt > game.cur_max_elt) {
            new_element_discovered(new_max_elt);
        }
        game.cur_max_elt = new_max_elt;
    });

    game.board = na3_shared_utils.apply_transmutations(game.board, transmutations_desc);
    enter_state(STATE_TRANSMUTATION);
}

function perform_transmutation()
{
    let trans_to_remove = [];
    game.transmutation_in_progress.forEach((trans, i) => {

        // transmutation is done ?
        if (trans.new_elem_alpha === 1) {
            for (let old_sp of trans.old_elem_sprites) {
                old_sp.destroy();
            }

            trans.old_elem_sprites = [];
            trans_to_remove.push(i);
        } 
        else {
            // transmutation in progress
            trans.new_elem_alpha = na3_min(trans.new_elem_alpha + DELTA_ALPHA, 1);
            for (let old_sp of trans.old_elem_sprites) {
                old_sp.alpha = 1 - trans.new_elem_alpha;
            }
            trans.new_elem_sprite.alpha = trans.new_elem_alpha;
        }
    });

    if (trans_to_remove.length === game.transmutation_in_progress.length) {
        // we are really done with transmutation
        game.transmutation_in_progress = [];
        start_alchemy_fall();
    }
}

// Update the HTML to display the new element in the transmutation chain
function new_element_discovered(new_max_elt)
{
    let elt_id_target = `#ch_${new_max_elt}`;
    let html_elt = document.querySelector(elt_id_target);
    if (html_elt === null) {
        console.error('Could not find new element:' + elt_id_target);
        return;
    }

    html_elt.src = ALL_ELT_NAMES[new_max_elt];
}


function start_alchemy_fall()
{
    enter_state(STATE_ALCHEMY_FALL);
    // identify holes in the map
    let falls = na3_shared_utils.detect_falls(game.board);
    falls.forEach((fall) => {
        let [row, col, target_row] = fall;
        let sp = game.sprites[ [row, col] ];

        // register move
        game.move_in_progress.push( [
            new Move(
                sp, 
                sp.x, 
                sprite_y_from_row(target_row)
            )
        ]);

        // update our map of sprite positions
        delete game.sprites[ [row,col] ];
        game.sprites[ [target_row, col] ] = sp;

        // update the board
        // note: because falls are recorded from bottom to top
        //       the overlapping of new positiosn is correctly handled
        game.board[target_row][col] = game.board[row][col];
        game.board[row][col] = -1;
    });
}


/*********************************************************************
 * 
 *                  Keyboard Events
 * 
 *********************************************************************/

/** event handler for key presses */
function na3_onkeydown(e)
{
    let k = '';
    switch (e.key)
    {
        case 'ArrowDown':
        case 'Down':
            k = DIR_DOWN;
            break;
        case 'ArrowUp':
        case 'Up':
            k = DIR_UP;
            break;
        case 'ArrowLeft':
        case 'Left':
            k = DIR_LEFT;
            break;
        case 'ArrowRight':
        case 'Right':
            k = DIR_RIGHT;
            break;
        default:
            // do nothing, let the keyboard event propagate
            return;
    }

    e.stopPropagation();
    e.preventDefault();

    if (e.repeat) {
        // we are not interested in repeated events of arrow key
        // but we don't want them to propagate either, that's why it's after
        // the e.preventDefault() call
        return;
    }

    if (game.accept_key_press) {
        game.keypressed.push(k);
        console.log('Registering keypress: ' + k);
    }
}


/** Called during state idle to handle the key pressed by the user: left, right, down */
function handle_game_key()
{
    if (game.keypressed.length === 0) {
        return;
    }

    let k = game.keypressed.pop();

    if (k === '') {
        // nothing to do if nothing happens
        return;
    }

    if (k === DIR_DOWN) {
        handle_arrow_down();
        return;
    }

    if (k === DIR_UP) {
        handle_arrow_up();
        return;
    }

    if (k === DIR_LEFT || k === DIR_RIGHT) {
        handle_arrow_left_right(k);
        return;
    }

    throw new Error(`Invalid key pressed: ${k}`);

}


function handle_arrow_left_right(k)
{
    let dir_dict = {    // row, col
        DIR_LEFT:    -1,
        DIR_RIGHT:    1,
    };

    let dir_col = dir_dict[k];
    if (dir_col === undefined) {
        console.error('Unknown key pressed: ', k);

    }

    // check if move is possible
    let new_col1 = game.base_col + game.col_delta1 + dir_col;
    let new_col2 = game.base_col + game.col_delta2 + dir_col;

    if ( (new_col1 >= NB_COLS) 
         || (new_col2 >= NB_COLS)
         || (new_col1 < 0)
         || (new_col2 < 0)
        ) {
        // ignore the move
        return;
    }

    /** Generator for a translation of the sprite from coordinates (x,y) to (dest_x, dest_y).
     * 
     * This generates a move by DELTA_X, DELTA_Y on each iteration until the destination is reached.
     */
    game.move_in_progress.push( [
        new Move(
            game.sprites.current1, 
            game.sprites.current1.x + dir_col*SPT_WIDTH, 
            game.sprites.current1.y
        ),
        new Move(
            game.sprites.current2, 
            game.sprites.current2.x + dir_col*SPT_WIDTH, 
            game.sprites.current2.y
        )
    ] );
    
    game.base_col += dir_col;
    enter_state(STATE_MOVING_LR);
}


function handle_arrow_down()
{
    let col1 = game.base_col + game.col_delta1, col2 = game.base_col + game.col_delta2;
    let target_row1 = column_next_row(game.board, col1);
    let target_row2 = column_next_row(game.board, col2);

    // one element above the other
    if (col1 === col2) {
        // both elemnts are on the same column, so target_row is identical
        // this needs to be adjusted
        if (game.row_delta2 > game.row_delta1) {
            target_row2 += 1;
        } else {
            target_row1 += 1;
        }
    }

    if (target_row1 == -1 || target_row2 == -1) {
        na3_end();
        throw new Error(`Invalid row destionation: ${target_row1} and ${target_row2}`);
    } else {
        game.board[target_row1][col1] = game.elt1;
        game.board[target_row2][col2] = game.elt2;
        game.sprites[ [target_row1, col1] ] = game.sprites.current1;
        game.sprites[ [target_row2, col2] ] = game.sprites.current2;
    }


    game.move_in_progress.push( [
        new Move(
            game.sprites.current1, 
            game.sprites.current1.x, 
            sprite_y_from_row(target_row1)
        ),
        new Move(
            game.sprites.current2, 
            game.sprites.current2.x, 
            sprite_y_from_row(target_row2)
        )
    ]);

    enter_state(STATE_MOVING_DOWN);
}

/** Rotate the top row element pair.
 * 
 * Input:
 * - row_delta: 0 or 1
 * - col_delta: 0 or 1
 * 
 * Returns a list of :
 * - new_row_delta: 0 or 1 
 * - new_col_delta: 0 or 1 
 */
function rotate_elt(row_delta, col_delta)
{
    let new_row, new_col;

    switch([row_delta, col_delta].toString()) {

        case [0, 0].toString():
            new_row = 1;
            new_col = 0;
            break;

        case [1, 0].toString():
            new_row = 1;
            new_col = 1;
            break;

        case [1, 1].toString():
            new_row = 0;
            new_col = 1;
            break;

        case [0, 1].toString():
            new_row = 0;
            new_col = 0;
            break;

        default:
            throw new Error('Invalid rotation input: ' + [row_delta, col_delta].toString());
    }

    return [new_row, new_col];
}


function handle_arrow_up()
{
    let new_row_delta1, new_col_delta1, new_row_delta2, new_col_delta2;

    [new_row_delta1, new_col_delta1] = rotate_elt(game.row_delta1, game.col_delta1);
    [new_row_delta2, new_col_delta2] = rotate_elt(game.row_delta2, game.col_delta2);

    let delta_base_col = 0;
    if (game.base_col === -1) {
        // if we went too far on the left, we need to move the base to
        // display the sprites within the board
        delta_base_col = 1;
    }  

    if (game.base_col === NB_COLS-1) {
        // if we went too far on the right, we need to move the base to
        // dispaly the sprites within the board
        delta_base_col = -1;
    }  

    game.move_in_progress.push( [
        new Move(
            game.sprites.current1, 
            game.sprites.current1.x + (new_col_delta1 - game.col_delta1 + delta_base_col)*SPT_WIDTH, 
            game.sprites.current1.y - (new_row_delta1 - game.row_delta1)*SPT_HEIGHT 
        ),
        new Move(
            game.sprites.current2, 
            game.sprites.current2.x + (new_col_delta2 - game.col_delta2 + delta_base_col)*SPT_WIDTH, 
            game.sprites.current2.y - (new_row_delta2 - game.row_delta2)*SPT_HEIGHT 
        )
    ]);

    // update game information
    [game.row_delta1, game.col_delta1] = [new_row_delta1, new_col_delta1];
    [game.row_delta2, game.col_delta2] = [new_row_delta2, new_col_delta2];
    game.base_col += delta_base_col;

    enter_state(STATE_ROTATING);
}
