'use strict';

let shared_utils = require("./na3_shared_utils.js");



/** Transform the input of a multi-line string containing the two boards
 *  in ascii to two sets of board as double-arrays.
 * 
 * Returns: [ 
 *      [title, board_input, board_expected], 
 *      ...
 * ]
 */
function extract_input_output_boards(string_board)
{
    let boards_to_test = [];
    let idx = 0;
    while (idx < string_board.length) {
        let title = string_board[idx++];
        let two_boards_desc = string_board[idx++];
        // console.log(title, two_boards_desc);
        let two_boards = extract_two_boards_from_string(two_boards_desc);
        boards_to_test.push([title, two_boards[0], two_boards[1]]);
    }

    return boards_to_test;
}

const ELT_TAB = 'abcdefghijk';

/** Returns two boards from a multi-line string board

Example:
`
......    ......
......    ......
......    ......
......    ......
......    ......
......    ......
..aaa.    ..b...

`

=> 
[
    [
        [-1, -1, -1, -1, -1, -1],
        ... (repeated 5 times)
        [-1, -1, 0, 0, -1, -1],
    ],
    [
        [-1, -1, -1, -1, -1, -1],
        ... (repeated 5 times)
        [-1, -1, 1, -1, -1, -1],
    ],
]
*/
function extract_two_boards_from_string(two_boards_desc)
{
    let board1 = [], board2 = [];
    let lines = two_boards_desc.split('\n');
    for (let i=0; i<lines.length; i++) {
        let l = lines[i].replace(' ', '');

        // skip empty lines
        if (l.length === 0) {
            continue;
        }

        let parts = l.split(/\s+/);
        let b1_line = parts[0];
        let b2_line = parts[1];

        let b1_board_line = Array.from(b1_line, (c) => ELT_TAB.indexOf(c));
        let b2_board_line = Array.from(b2_line, (c) => ELT_TAB.indexOf(c));

        board1.push(b1_board_line);
        board2.push(b2_board_line);
    }

    return [board1, board2];
}

/** Return a board updated with one combination 
 * 
 * board: Array of lines, each line is an array of element number
 * output: Array of lines, each line is an array of element number
 * */
function updated_board(input)
{
    let transmutations = shared_utils.calc_transmutations(input);
    return apply_transmutations(input, transmutations);
}

test('find_new_elt_position', () => {
    expect(shared_utils.find_new_elt_position([[0,0]])).toStrictEqual([0,0]);
    expect(shared_utils.find_new_elt_position([[0,0], [0, 1]])).toStrictEqual([0,0]);
    expect(shared_utils.find_new_elt_position([[0,0], [0, 1]])).toStrictEqual([0,0]);
    expect(shared_utils.find_new_elt_position([[0,0], [0, 1], [1,0]])).toStrictEqual([1,0]);
    expect(shared_utils.find_new_elt_position([[0,0], [0, 1], [1,1]])).toStrictEqual([1,1]);
    expect(shared_utils.find_new_elt_position([[0,0], [1, 0], [1,1]])).toStrictEqual([1,0]);
});

/** Apply a given a list of transmutation to a board and return the updated board */
function apply_transmutations(input, transmutations)
{
    // console.log(input, transmutations);
    let output = Array.from(input, (line) => line.slice());
    transmutations.forEach((trans) => {
        let old_elt = trans[0];
        let new_elt = trans[1];
        old_elt.forEach((pos) => { output[pos[0]][pos[1]] = -1; });
        output[new_elt[0]][new_elt[1]] = new_elt[2];
    });
    return output;    
}


/***********************************************************************
 * 
 * This is all our test data to make sure we assemble elements correctly
 * 
 ***********************************************************************/

let na3_data = [
'1 combination - 1 element - 1', `
......    ......
......    ......
......    ......
......    ......
......    ......
......    ......
......    ......

`,'1 combination - 1 element - 2', `
......    ......
......    ......
......    ......
......    ......
......    ......
......    ......
..a...    ..a...


`,'1 combination - 3 elements - height 1 - 1', `
......    ......
......    ......
......    ......
......    ......
......    ......
......    ......
aaa...    b.....


`,'1 combination - 3 elements - height 1 - 2', `
......    ......
......    ......
......    ......
......    ......
......    ......
......    ......
..aaa.    ..b...

`,'1 combination - 3 elements - height 1 - 3', `
......    ......
......    ......
......    ......
......    ......
......    ......
......    ......
..aa.a    ..aa.a


`,'1 combination - 3 elements - height 1 - 4', `
......    ......
......    ......
......    ......
......    ......
......    ......
...aaa    ...b..
..ccdd    ..ccdd



`,'1 combination - 3 elements - height 2 - 1', `
......    ......
......    ......
......    ......
......    ......
......    ......
a.....    ......
aa....    b.....


`,'1 combination - 3 elements - height 2 - 2', `
......    ......
......    ......
......    ......
......    ......
......    ......
..cac.    ..c.c.
..aac.    ..b.c.


`,'1 combination - 3 elements - height 2 - 3', `
......    ......
......    ......
......    ......
......    ......
......    ......
..aac.    ....c.
..adc.    ..bdc.


`,'1 combination - 3 elements - height 2 - 4', `
......    ......
......    ......
......    ......
......    ......
......    ......
..aac.    ....c.
..dac.    ..dbc.

`,'1 combination - 3 elements - height 2 - 5', `
......    ......
......    ......
......    ......
......    ......
......    ......
..aca.    ..aca.
..adc.    ..adc.

`,'1 combination - 3 elements - height 3 - 1', `
......    ......
......    ......
......    ......
......    ......
a.....    ......
a.....    ......
a.....    b.....

`,'1 combination - 3 elements - height 3 - 2', `
......    ......
......    ......
a.....    ......
a.....    ......
a.....    b.....
d.....    d.....
d.....    d.....


`,'1 combination - 4 elements - height 1 - 1', `
......    ......
......    ......
......    ......
......    ......
......    ......
......    ......
bbbb..    c.....


`,'1 combination - 5 elements - height 1 - 1', `
......    ......
......    ......
......    ......
......    ......
......    ......
......    ......
.bbbbb    .c....


`,'1 combination - 6 elements - height 1 - 1', `
......    ......
......    ......
......    ......
......    ......
......    ......
......    ......
bbbbbb    c.....

`,'1 combination - all elements', `
bbbbbb    ......
bbbbbb    ......
bbbbbb    ......
bbbbbb    ......
bbbbbb    ......
bbbbbb    ......
bbbbbb    c.....

`,'2 combinations - 1', `
......    ......
......    ......
......    ......
......    ......
......    ......
aa....    ......
aa.aaa    b..b..

`,'0 combination - no diagonal', `
......    ......
......    ......
......    ......
......    ......
.a....    .a....
ab....    ab....
ab....    ab....

`,'4 combinations - 1', `
......    ......
......    ......
......    ......
a..cc.    ......
aa..c.    b...d.
bb....    ......
bb.ddd    c..e..

`
];


describe.each(extract_input_output_boards(na3_data.slice(0))
)('title: %s', (title, input, output) => {
        test('=>', () => {
            expect(updated_board(input)).toStrictEqual(output);
        });
    }
);

