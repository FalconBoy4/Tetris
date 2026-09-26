const canvas = document.getElementById("gameCanvas");
const next_canvas = document.getElementById("nextCanvas");
const grid_ctx = canvas.getContext("2d");
const next_ctx = next_canvas.getContext("2d");

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
    "#0000FF",
    "#ffffff"
]

class Display {
    constructor(canvas_ID) {
        this.canvas = document.getElementById(canvas_ID);
        this.ctx = this.canvas.getContext("2d");
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.grid = new Grid(Math.floor(this.canvas.width / tile_size), Math.floor(this.canvas.height / tile_size))
        this.animator = new AnimationManager()
        this.paused = false
    }

    update(dt) {
        this.animator.update(dt)

        if (this.paused) return;

        this.grid.update(dt)
    }

    draw() {
        this.clear()
        this.grid.draw(this.ctx)
        this.animator.draw(ctx)
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
}

class Grid {
    constructor(width, height, ctx) {
        this.ctx = ctx
        this.width = width;
        this.height = height;
        this.matrix = this.new_matrix();
        this.anims = [];
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
        animations.anim_row(row)
    }

    _clear_row(row) {
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

    update(dt) {
        score(this.check())
    }

    draw(ctx) {
        this.matrix.forEach((row, y) => {
            row.forEach((element, x) => {
                draw_square_fill(ctx, x, y, element);
            });
        });
    }

    get is_clear() {
        return Math.max(...this.matrix) === 0;
    }
}

class AnimationManager {
    constructor() {
        this.anims = []
    }

    update(dt) {
        this.anims = this.anims.filter(anim => {
            anim.elapsed += dt;
            const done = anim.elapsed >= anim.duration
            if (done) anim.on_end(...anim.params);
            return !done;
        })

        paused = this.anims.length !== 0;
    }

    draw(ctx) {
        this.anims.forEach(anim => {
            const progress = Math.min(1, anim.elapsed / anim.duration);
            anim.draw(ctx, progress, ...anim.params);
        })
    }

    add(draw, on_end = () => {}, duration, params = []) {
        paused = true
        this.anims.push({
            draw,
            on_end: on_end.bind(grid),
            duration,
            elapsed: 0,
            params
        });
    }

    anim_row(row) {
        this.add(this.anim_row_draw, grid._clear_row, 0.3, [row])
    }

    anim_row_draw(ctx, progress, row) {
        if (progress < 0.5) {
            const fill_progress = progress / 0.5
            const fill_squares = Math.ceil(grid.width * fill_progress)
            for (let x = 0; x < fill_squares; x++) {
                draw_square_fill(ctx, x, row, 8)
            }
        } else {
            const empty_progress = (progress - 0.5) / 0.5
            const empty_squares = Math.floor(grid.width * empty_progress)

            for (let x = empty_squares; x < grid.width; x++) {
                draw_square_fill(ctx, x, row, 8)
            }
        }
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
        this.move_progress = {
            "y": 0,
            "x": 0
        };
    }

    move(x = 0, y = 0) {
        let moved = false;
        let valid = false;

        // horizontal movement
        this.x += x;
        valid = this.check_move(this.shape);
        if (valid && x != 0) {
            moved = true;
        } else {
            this.x -= x;
        };

        // vertical movement
        this.y += y;
        valid = this.check_move(this.shape);
        if (valid && y != 0) {
            moved = true;
        } else {
            this.y -= y;
        };

        return moved
    }

    draw(ctx) {
        this.shape.forEach((row, y) => {
            row.forEach((element, x) => {
                if (element != 0) {
                    draw_square_outline(ctx, this.x + x, this.drop_y + y, element);
                    draw_square_fill(ctx, this.x + x, this.y + y, element);
                };
            });
        });
    }

    update(dt) {
        this.move_progress.y += dt / (keys["ArrowDown"] ? intervals.min : intervals.fall);
        if (this.move_progress.y >= 1) {
            this.move_progress.y = 0;
            if (!this.move(0, 1)) {
                this.kill();
                return;
            };
        };

        this.move_progress.x += dt / intervals.side;
        if (this.move_progress.x >= 1) {
            if (keys["ArrowRight"]) {
                if (this.move(1, 0)) this.move_progress.x = 0;
            };

            if (keys["ArrowLeft"]) {
                if (this.move(-1, 0)) this.move_progress.x = 0;
            };
        };

        if (keys_pressed["ArrowUp"]) this.rotate();

        if (keys_pressed[" "]) {
            this.drop();
            this.kill();
            return;
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
        this.y = this.drop_y
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

    get drop_y() {
        const old_y = this.y
        while (this.move(0, 1, false));
        const new_y = this.y
        this.y = old_y
        return new_y
    }
}

let current_score = 0;
let last_cleared = 0;
let lines = 0;
let level = 1;

let gameover = false

const animations = new AnimationManager()
const tile_size = 32
const grid = new Grid(Math.floor(canvas.width / tile_size), Math.floor(canvas.height / tile_size), grid_ctx)
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

function draw_next_shape(ctx) {
    next_shape.forEach((row, y) => {
        row.forEach((element, x) => {
            draw_square_fill(ctx, x, y, element, next_ctx);
        });
    });
}

const img = new Image();
img.src = "block.png";

function draw_square_fill(ctx, x, y, colour_index) {
    ctx.globalCompositeOperation = 'source-over';
    x *= tile_size
    y *= tile_size
    ctx.drawImage(img, x, y)
    ctx.fillStyle = colours[colour_index];
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(x, y, tile_size, tile_size)
}

function draw_square_outline(ctx, x, y, colour_index) {
    ctx.globalCompositeOperation = 'source-over';
    thickness = Math.floor(tile_size / 16)
    x = x * tile_size + thickness
    y = y * tile_size + thickness
    size = tile_size - thickness * 2
    ctx.strokeStyle = colours[colour_index];
    ctx.strokeRect(x, y, size, size)

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

const score_dict = [
    0,
    40,
    100,
    300,
    1200
]

function calc_score(cleared) {
    return score_dict[cleared] * level
}

function score(cleared) {
    if (cleared === 0) return;

    const added = score_dict[cleared] * level;
    if (last_cleared === cleared === 4) added *= 2;
    current_score += added
}

function zeros(rows, cols) {
    return (Array.from({length: rows}, () =>
                Array(cols).fill(0)
            ));
}

let last_time = performance.now()
let paused = false

function game_loop(now) {
    if (gameover) return;

    const dt = (now - last_time) / 1000;
    last_time = now;

    update(dt);
    draw();

    requestAnimationFrame(game_loop);
}

// Start
requestAnimationFrame(game_loop)

function draw() {
    grid_ctx.clearRect(0, 0, canvas.width, canvas.height);
    next_ctx.clearRect(0, 0, next_canvas.width, next_canvas.height);
    grid.draw(grid_ctx);
    piece.draw(grid_ctx);
    next_grid.draw(next_ctx);
    draw_next_shape(next_ctx);
    animations.draw(grid_ctx)
}

function update(dt) {
    animations.update(dt)

    if (!paused) {
        piece.update(dt)
        cleared = grid.check()
        lines += cleared
        score += calc_score(cleared)
        if (lines >= 10 * level) level += 1;
        if (piece.dead) {
            new_piece();
            if (!piece.check_move(piece.shape)) gameover = true;
        };
        document.getElementById("level").innerText = level;
        document.getElementById("score").innerText = current_score;
        document.getElementById("lines").innerText = lines;
    };

    keys_pressed = {};
}

const intervals = {
    "min": 0.05,
    "side": 0.1,
    get fall() {
        return Math.max(intervals.min, Math.pow(0.8, level - 1))
    }
}