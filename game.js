const canvas = document.getElementById("gameCanvas");
const next_canvas = document.getElementById("nextCanvas");
const ctx = canvas.getContext("2d");
const next_ctx = next_canvas.getContext("2d");

const speed = 1

const shapes = [
    // I
    [[0, 0, 0, 0],
     [1, 1, 1, 1],
     [0, 0, 0, 0],
     [0, 0, 0, 0]],

    //O
    [[2, 2],
     [2, 2]],

    // T
    [[0, 3, 0],
     [3, 3, 3],
     [0, 0, 0]],

    // S
    [[0, 4, 4],
     [4, 4, 0],
     [0, 0, 0]],

    // Z
    [[5, 5, 0],
     [0, 5, 5],
     [0, 0, 0]],

    // L
    [[0, 0, 6],
     [6, 6, 6],
     [0, 0, 0]],

    // J
    [[7, 0, 0],
     [7, 7, 7],
     [0, 0, 0]],
];

const colours = [
    "#111111",
    "#00FFFF",
    "#FFFF00",
    "#800080",
    "#00FF00",
    "#FF0000",
    "#FFA500",
    "#0000FF"
]

class Display {
    constructor(canvas_ID) {
        this.canvas = document.getElementById(canvas_ID);
        this.ctx = this.canvas.getContext("2d");
        this.grid = new Grid(Math.floor(this.canvas.width / tile_size), Math.floor(this.canvas.height / tile_size))
    }

    update() {
        this.grid.update()
    }

    draw() {
        this.grid.draw()
    }
}

class Grid {
    constructor(width, height, current_ctx) {
        this.current_ctx = (current_ctx) ? current_ctx : ctx;
        this.width = width;
        this.height = height;
        this.matrix = this.new_matrix();
    }

    fits(x, y) {
        return (this.matrix[y] != undefined && this.matrix[y][x] != undefined);
    }

    get_element(x, y) {
        return this.matrix[y][x];
    }

    set_element(x, y, value) {
        this.matrix[y][x] = value;
    }

    new_matrix() {
        return zeros(this.height, this.width)
    }

    clear() {
        this.matrix = this.new_matrix();
    }

    clear_row(row) {
        this.matrix.splice(row, 1);
        this.matrix.unshift(Array(this.width).fill(0));
    }

    check() {
        let cleared = 0
        this.matrix.forEach((row, row_index) => {
            if (Math.min(...row) != 0) {
                this.clear_row(row_index);
                cleared += 1
            };
        })
        return cleared
    }

    draw() {
        this.matrix.forEach((row, y) => {
            row.forEach((element, x) => {
                draw_square(x, y, element, this.current_ctx);
            });
        });
    }
}

class Block {
    constructor(shape) {
        this.dead = false
        this.shape = shape;
        this.x = Math.floor((grid.width - this.shape_width) / 2);
        this.y = 0;
        this.width = this.shape_width * tile_size;
        this.height = this.shape_height * tile_size;
        this.move_pause = FPS
        this.move_timers = {
            "y": 0,
            "x": 0
        };
        this.speed = level + 1
    }

    move(x = 0, y = 0) {
        let moved = false;
        let valid = false;

        // horizontal movement
        this.x += x;
        valid = this.check_move(this.shape);
        if (valid && x != 0) {
            this.move_timers["x"] = 0;
            moved = true;
        } else {
            this.x -= x;
        };

        // vertical movement
        this.y += y;
        valid = this.check_move(this.shape);
        if (valid && y != 0) {
            this.move_timers["y"] = 0;
            moved = true;
        } else {
            this.y -= y;
        };

        return moved
    }

    draw() {
        this.shape.forEach((row, y) => {
            row.forEach((element, x) => {
                if (element != 0) {
                    draw_square(this.x + x, this.y + y, element);
                };
            });
        });
    }

    update() {
        this.move_timers["y"] += (keys["ArrowDown"] ? 30 : 1) * 0.5 * this.speed

        if (this.move_timers["y"] >= this.move_pause) {
            if (!this.move(0, 1)) {
                this.kill();
                return;
            };
        };

        if (this.move_timers["x"] >= this.move_pause) {
            if (keys["ArrowRight"]) {
                this.move(1, 0);
            };

            if (keys["ArrowLeft"]) {
                this.move(-1, 0);
            };
        } else {
            this.move_timers["x"] += 10;
        };

        if (keys_pressed["ArrowUp"]) this.rotate();

        if (keys_pressed[" "]) {
            this.drop()
            this.kill()
            return
        };
    }

    kill() {
        this.dead = true;
        this.shape.forEach((row, y) => {
            row.forEach((element, x) => {
                if (element != 0) {
                    grid.set_element(this.x + x, this.y + y, element);
                };
            });
        });
    }

    drop() {
        while (this.move(0, 1));
    }

    check_move(shape) {
        let legal = true
        shape.forEach((row, y) => {
            row.forEach((element, x) => {
                if (element != 0) {
                    const ex = this.x + x
                    const ey = this.y + y
                    if (!grid.fits(ex, ey) || grid.get_element(ex, ey) != 0) legal = false;
                };
            });
        });
        return legal
    }

    rotate() {
        const new_shape = zeros(this.shape_height, this.shape_width)
        this.shape.forEach((row, y) => {
            row.forEach((element, x) => {
                new_shape[x][this.shape_width - y - 1] = element
            })
        });
        if (this.check_move(new_shape)) this.shape = new_shape;
    }

    get shape_width() {
        return this.shape[0].length
    }

    get shape_height() {
        return this.shape.length
    }
}

let score = 0;
let lines = 0;
let level = 1;

const FPS = 60;
setInterval(() => {
    update();
    draw();
}, 1000 / FPS);

const tile_size = 32
const grid = new Grid(Math.floor(canvas.width / tile_size), Math.floor(canvas.height / tile_size))
const next_grid = new Grid(Math.floor(next_canvas.width / tile_size), Math.floor(next_canvas.height / tile_size), next_ctx)
let piece = new Block(random_shape())
let next_shape = random_shape()

function random_shape() {
    return shapes[Math.floor(Math.random() * shapes.length)]
}

function new_piece() {
    piece = new Block(next_shape)
    next_shape = random_shape()
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    next_ctx.clearRect(0, 0, next_canvas.width, next_canvas.height);
    grid.draw();
    piece.draw();
    next_grid.draw();
    draw_next_shape();
}

function update() {
    if (!gameover) {
        piece.update()
        cleared = grid.check()
        lines += cleared
        score += calc_score(cleared)
        if (lines >= 10 * level) level += 1;
        if (piece.dead) {
            new_piece();
            if (!piece.check_move(piece.shape)) gameover = true;
        };
        document.getElementById("level").innerText = level;
        document.getElementById("score").innerText = score;
        document.getElementById("lines").innerText = lines;
        keys_pressed = {}
    }
}

function draw_next_shape() {
    next_shape.forEach((row, y) => {
        row.forEach((element, x) => {
            draw_square(x, y, element, next_ctx);
        });
    });
}

const img = new Image();
img.src = "block.png";
let gameover = false;

function draw_square(x, y, colour_index, current_ctx = null) {
    if (!current_ctx) current_ctx = ctx
    current_ctx.globalCompositeOperation = 'source-over';
    x *= tile_size
    y *= tile_size
    current_ctx.drawImage(img, x, y)
    current_ctx.fillStyle = colours[colour_index];
    current_ctx.globalCompositeOperation = 'multiply';
    current_ctx.fillRect(x, y, tile_size, tile_size)
}

let keys = {};
let keys_pressed = {}
let locked = {};

document.addEventListener("keydown", (e) => {
    if (!locked[e.key]) keys_pressed[e.key] = true;
    keys[e.key] = true
    locked[e.key] = true;
});
document.addEventListener("keyup", (e) => {
    keys[e.key] = false
    locked[e.key] = false
});

scoring = [
    0,
    40,
    100,
    300,
    1200
]

function calc_score(cleared) {
    return scoring[cleared] * level
}

function zeros(rows, cols) {
    return (Array.from({length: rows}, () =>
                Array(cols).fill(0)
            ));
}