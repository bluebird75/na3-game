'use strict';
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
    let transmutations = calc_transmutations(input);
    return apply_transmutations(input, transmutations);
}

/** In a list of [row, col], find the lowest, left-est position */
function find_new_elt_position(cluster)
{
    let copy_cluster = cluster.slice();
    copy_cluster.sort((a, b) => {
        if (a[0] > b[0]) return -1;     // visually lowest board row first
        if (a[0] < b[0]) return 1;      
        // both rows are equals
        if (a[1] < b[1]) return -1;     // left-est col
        if (a[1] > b[1]) return 1;
        return 0;
    });
    return copy_cluster[0];
}

test('find_new_elt_position', () => {
    expect(find_new_elt_position([[0,0]])).toStrictEqual([0,0]);
    expect(find_new_elt_position([[0,0], [0, 1]])).toStrictEqual([0,0]);
    expect(find_new_elt_position([[0,0], [0, 1]])).toStrictEqual([0,0]);
    expect(find_new_elt_position([[0,0], [0, 1], [1,0]])).toStrictEqual([1,0]);
    expect(find_new_elt_position([[0,0], [0, 1], [1,1]])).toStrictEqual([1,1]);
    expect(find_new_elt_position([[0,0], [1, 0], [1,1]])).toStrictEqual([1,0]);
});

/** Analyse the board and returns the list of transmutation on this board
 * 
 * A transmutation is: [ old_elements, new_element ]
 * - old_elements is a list of [row, col]
 * - new_element  is [row, col, element]
 */
function calc_transmutations(input)
{
    let transmutations = [];

    // flood algorithm
    let clusters = [];
    let in_cluster = [];

    for( let row=0; row<input.length; row++) {
        for (let col=0; col<input[row].length; col++) {
            // find next cluster start, not visited
            if (in_cluster.includes([row, col].toString())) { continue; }

            // we have found an element not already in a cluster
            let elt = input[row][col];

            // we build clusters only for non empty cells
            if (elt === -1) { continue; }

            // start our new cluster
            let cluster_idx = clusters.length;
            clusters.push([]);

            // our exporation stack
            let to_process = [ [row, col] ];
            let visited = [];

            // explore
            while (to_process.length) {
                let pos = to_process.pop();
                if (visited.includes(pos.toString())) { continue; }
                visited.push(pos.toString());

                let r = pos[0], c = pos[1];

                // check if this is the same element
                if (input[r][c] !== elt) { continue; }

                // add to our cluster
                clusters[cluster_idx].push(pos);
                in_cluster.push(pos.toString());

                // add all neighbour to visit
                if (r > 0)                  to_process.push([r-1, c]);
                if (r+1 < input.length)     to_process.push([r+1, c]);
                if (c > 0)                  to_process.push([r, c-1]);
                if (c+1 < input[row].length) to_process.push([r, c+1]);
            }
        }
    }

    // find all clusters with more than 3 elements
    clusters.forEach(cluster => {
        if (cluster.length < 3) return;

        let pos = cluster[0];
        let elt = input[pos[0]][pos[1]];

        if (elt < 0 || elt+1>=ELT_TAB.length) return;

        let pos_new_elt = find_new_elt_position(cluster);

        transmutations.push([
            cluster, [pos_new_elt[0], pos_new_elt[1], elt+1]
        ]);
    });

    // console.log('generated transmutations:', transmutations);
    return transmutations;
}


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

