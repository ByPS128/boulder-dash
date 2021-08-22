const BOARD_WIDTH = 40
const BOARD_HEIGHT = 24

const BOARD_VISIBLE_WIDTH = 28//20
const BOARD_VISIBLE_HEIGHT = 16//13

const BLOCK_SIZE = 16

const KABOOM_WIDTH = BOARD_VISIBLE_WIDTH * BLOCK_SIZE
const KABOOM_HEIGHT = BOARD_VISIBLE_HEIGHT * BLOCK_SIZE

const KABOOM_HALF_WIDTH = KABOOM_WIDTH / 2
const KABOOM_HALF_HEIGHT = KABOOM_HEIGHT / 2

kaboom({
    global: true,
    width: KABOOM_WIDTH,
    height: KABOOM_HEIGHT,
    fullScreen: true,
    scale: 3,
    debug: true,
    clearColor: [0, 0, 0, 1],
})

const SPEED = 0.4

const VEC_ZERO = vec2(0, 0)
const DIR_LEFT = vec2(-1, 0)
const DIR_RIGHT = vec2(1, 0)
const DIR_UP = vec2(0, -1)
const DIR_DOWN = vec2(0, 1)

const STR_LEFT = "left"
const STR_RIGHT = "right"
const STR_UP = "up"
const STR_DOWN = "down"

const SPRITES_BOULDER_DASH = "bd"

const FIREFLY_INIT_DIRECTIONS = [DIR_LEFT, DIR_DOWN, DIR_RIGHT, DIR_UP]
const BUTTERFLY_INIT_DIRECTIONS = [DIR_LEFT, DIR_UP, DIR_RIGHT, DIR_DOWN]

var CURRENT_DIRECTION = [];
CURRENT_DIRECTION[STR_LEFT] = DIR_LEFT
CURRENT_DIRECTION[STR_DOWN] = DIR_DOWN
CURRENT_DIRECTION[STR_RIGHT] = DIR_RIGHT
CURRENT_DIRECTION[STR_UP] = DIR_UP

var NEXT_DIRECTION_TO_LEFT = []
NEXT_DIRECTION_TO_LEFT[STR_LEFT] = DIR_DOWN
NEXT_DIRECTION_TO_LEFT[STR_DOWN] = DIR_RIGHT
NEXT_DIRECTION_TO_LEFT[STR_RIGHT] = DIR_UP
NEXT_DIRECTION_TO_LEFT[STR_UP] = DIR_LEFT

var NEXT_DIRECTION_TO_RIGHT = []
NEXT_DIRECTION_TO_RIGHT[STR_LEFT] = DIR_UP
NEXT_DIRECTION_TO_RIGHT[STR_UP] = DIR_RIGHT
NEXT_DIRECTION_TO_RIGHT[STR_RIGHT] = DIR_DOWN
NEXT_DIRECTION_TO_RIGHT[STR_DOWN] = DIR_LEFT

// Character tags
const ROCKFORD_TAG = "rockford"
const FIREFLY_TAG = "firefly"
const BUTTERFLY_TAG = "butterfly"

// Item/sprite tags
const DIRT_TAG = "dirt"
const BOULDER_TAG = "boulder"
const DIAMOND_TAG = "diamond"
const WALL_TAG = "wall"
const TITANIUM_WALL_TAG = "titan"
const MAGIC_WALL_TAG = "magicWall"
const AMOEBA_TAG = "amoeba"
const EXIT_TAG = "exit"
const SPAWN_TAG = "spawn"
const EXPLOSION_TAG = "explosion"

// Role name tags
const ENEMY_ROLE_TAG = "enemy"
const MOVEABLE_ROLE_TAG = "moveable"


const SPRITE_FILENAME = "spritesheet_A.png"

const TITAN_WALL_FRAME = 30
const DIRT_FRAME = 33
const SPAWN_FRAME = 31
const BICKS_WALL_FRAME = 32
const BOULDER_FRAME = 35
const DIAMOND_FRAME = 40
const FIREFLY_FRAME = 80
const BUTTERFLY_FRAME = 90
const EXPLOSION_FRAME = 100

const FIREFLY_ANIMATION = "firefly_anim"
const BUTTERFLY_ANIMATION = "butterfly_anim"
const DIAMOND_ANIMATION = "diamond_anim"
const EXPLOSION_ANIMATION = "explosion_anim"
const IDDLE_ANIMATION = "iddle_anim"
const RUN_LEFT_ANIMATION = "runLeft_anim"
const RUN_RIGHT_ANIMATION = "runRight_anim"
const BORN_ANIMATION = "born_anim"
const SPAWN_ANIMATION = "spawn_anim"
const EXIT_OPENED_ANIMATION = "exitOpened_anim"

loadRoot('http://localhost:8000/resources/')
loadSprite(SPRITES_BOULDER_DASH, SPRITE_FILENAME, {
    sliceX: 10,
    sliceY: 13,
    anims: {
        iddle_anim: {
            from: 0,
            to: 6,
        },
        runLeft_anim: {
            from: 10,
            to: 16,
        },
        runRight_anim: {
            from: 20,
            to: 26,
        },
        born_anim: {
            from: 100,
            to: 104,
        },
        spawn_anim: {
            from: TITAN_WALL_FRAME,
            to: SPAWN_FRAME,
        },
        exitOpened_anim: {
            from: TITAN_WALL_FRAME,
            to: SPAWN_FRAME,
        },
        explosion_anim: {
            from: EXPLOSION_FRAME,
            to: EXPLOSION_FRAME + 2,
        },
        firefly_anim: {
            from: FIREFLY_FRAME,
            to: FIREFLY_FRAME + 3,
        },
        butterfly_anim: {
            from: BUTTERFLY_FRAME,
            to: BUTTERFLY_FRAME + 3,
        },
        diamond_anim: {
            from: DIAMOND_FRAME,
            to: DIAMOND_FRAME + 7,
        }
    }
})

function directionVecToStr(vector) {
    if (vector.eq(DIR_LEFT)) {
        return STR_LEFT
    } else if (vector.eq(DIR_RIGHT)) {
        return STR_RIGHT
    } else if (vector.eq(DIR_UP)) {
        return STR_UP
    } else if (vector.eq(DIR_DOWN)) {
        return STR_DOWN
    }
}

function directionStrToVec(direction) {
    return CURRENT_DIRECTION[direction]
}

scene("game", () => {
    layers(['bg', 'obj', 'ui'], 'obj')
    var initialized = false
    var playing = false

    // // Cave Debug
    // const map = [
    //     '                                        ',
    //     '========================================',
    //     '=.................*****+*..............=',
    //     '=..* * ...........*******..............=',
    //     '=..... .....*.... *******S.++..E.......=',
    //     '=......*.*..*.... ===+=== .............=',
    //     '=................    .    ..  .   . O .=',
    //     '=.........****...         ..  . . . . .=',
    //     '=....************    O    ..  . O .   .=',
    //     '=................    .    ..O .........=',
    //     '=....                     .............=',
    //     '=................         . O .........=',
    //     '=......................................=',
    //     '=......................................=',
    //     '=......................................=',
    //     '=......................................=',
    //     '========================================',
    // ]

    // // Firefly demo cave
    // const map = [
    //     '                                        ',
    //     '========================================',
    //     '=E......................S..............=',
    //     '=.........................*..*....*....=',
    //     '=   . P .   .   .     ....O............=',
    //     '= . . . . .P.P. .  P  ..O. ............=',
    //     '= P .   .   .   .     .... ............=',
    //     '=.....................* O *............=',
    //     '=..P       P.P...   ...***.............=',
    //     '=. .......... ...   ...................=',
    //     '=. .P      P.  P. X ...................=',
    //     '=.P.......... .........................=',
    //     '=============P==========================',
    //     '            ===                         ',
    // ]

    // Cave A. Intro
    const map = [
        '                                        ',
        '========================================',
        '=...... ..+.* .....*.*....... ....*....=',
        '=.*S*...... .........*+..*.... ..... ..=',
        '=.......... ..*.....*.*..*........*....=',
        '=*.**.........*......*..*....*...*.....=',
        '=*. *......... *..*........*......*.**.=',
        '=... ..*........*.....*. *........*.**.=',
        '=------------------------------...*..*.=',
        '=. ...*..+. ..*.*..........+.*+...... .=',
        '=..+.....*..... ........** *..*....*...=',
        '=...*..*.*..............* .*..*........=',
        '=.*.....*........***.......*.. .+....*.=',
        '=.+.. ..*.  .....*.*+..+....*...*..+. .=',
        '=. *..............* *..*........+.....*=',
        '=........------------------------------=',
        '= *.........*...+....*.....*...*.......=',
        '= *......... *..*........*......*.**..E=',
        '=. ..*........*.....*.  ....+...*.**...=',
        '=....*+..*........*......*.*+......*...=',
        '=... ..*. ..*.**.........*.*+...... ..*=',
        '=.+.... ..... ......... .*..*........*.=',
        '========================================',
    ]

    const levelCfg = {
        width: BLOCK_SIZE,
        height: BLOCK_SIZE,
        caveDelay: 15,
        caveTime: 150, // 0-infinity, othervise seconds, max 999
        diamondsNeeded: 12,
        diamondValue: 10,
        diamondBonusValue: 15,
        slimePermeability: 0,
        AmoebaTimeOfGrowth: 0,
        MagicWallMillingTime: 0,
        any(ch) {
            return []
        }
    }

    function createRockford() {
        var obj = add([
            sprite(SPRITES_BOULDER_DASH, {
                animSpeed: 0.3,
                frame: 0,
            }),
            {
                position: VEC_ZERO,
                direction: VEC_ZERO,
                lastSideAnim: RUN_RIGHT_ANIMATION,
                currentAnim: IDDLE_ANIMATION,
                isDead: false,
                pushAttempts: 0,
            },
            ROCKFORD_TAG,
            scale(1),
            setupPlayer(),
        ])
        obj.frame = 0
        obj.hidden = true

        return obj
    }

    // returns an integer random number between min (included) and max (included)
    function randomInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }


    // Camera handling
    // 
    var camPosCurrent = VEC_ZERO.clone()
    var camPosWanted = VEC_ZERO.clone()
    var camOffset = VEC_ZERO.clone()

    var rockford = createRockford()
    var lastKeyDown = "null2"

    function calculateWantedCamPos() {
        camPosWanted = camOffset.add(BOARD_VISIBLE_WIDTH / 2, BOARD_VISIBLE_HEIGHT / 2).scale(BLOCK_SIZE)
    }

    function calculateCamPos() {
        var oldCamOffset = camOffset.clone()

        // X
        if (rockford.position.x - camOffset.x < 5) {
            if (camOffset.x > 0) {
                camOffset = camOffset.add(DIR_LEFT)
            }
        }

        if (rockford.position.x - camOffset.x > BOARD_VISIBLE_WIDTH - 5) {
            if (camOffset.x < BOARD_WIDTH - BOARD_VISIBLE_WIDTH) {
                camOffset = camOffset.add(DIR_RIGHT)
            }
        }

        // Y
        if (rockford.position.y - camOffset.y < 5) {
            if (camOffset.y > 0) {
                camOffset = camOffset.add(DIR_UP)
            }
        }

        if (rockford.position.y - camOffset.y > BOARD_VISIBLE_HEIGHT - 5) {
            if (camOffset.y < BOARD_HEIGHT - BOARD_VISIBLE_HEIGHT) {
                camOffset = camOffset.add(DIR_DOWN)
            }
        }

        // change in camera pos?
        // if so, calculate new camera pos
        if (!camOffset.eq(oldCamOffset)) {
            calculateWantedCamPos()
        }
    }

    rockford.action(() => {
        calculateCamPos()
    })


    const spawn = add([
        sprite(SPRITES_BOULDER_DASH, {
            animSpeed: 0.1,
            frame: SPAWN_FRAME,
        }),
        {
            spawnAnimated: 0,
        },
    ])
    spawn.on("animEnd", (anim) => {
        if (anim === SPAWN_ANIMATION) {
            spawn.spawnAnimated++
            if (spawn.spawnAnimated == 5) {
                spawn.play(BORN_ANIMATION, false)
            } else {
                spawn.play(SPAWN_ANIMATION, false)
            }
        }
        if (anim === BORN_ANIMATION) {
            destroy(spawn)
            rockford.hidden = false
            rockford.animSpeed = 0.3
            rockford.play(IDDLE_ANIMATION)
            playing = true
        }
    });


    const exit = add([
        sprite(SPRITES_BOULDER_DASH, {
            animSpeed: 0.2,
            frame: TITAN_WALL_FRAME,
        }),
        solid(),
        EXIT_TAG,
    ])


    const uiBackground = add([
        rect(BOARD_WIDTH * BLOCK_SIZE, BLOCK_SIZE),
        color(0, 0, 0),
        pos(0, 0),
        layer('ui'),
        {
            setPos(currentCamPos) {
                this.pos = currentCamPos.sub(KABOOM_HALF_WIDTH, KABOOM_HALF_HEIGHT)
            },
        },
    ])

    const scoreLabel = add([
        text("score: -", 8),
        pos(30, 6),
        layer('ui'),
        {
            value: 0,
            inc() {
                this.value++
                this.text = "score: " + this.value
            },
            inc(value) {
                this.value += value
                this.text = "score: " + this.value
            },
            set(newValue) {
                this.value = newValue
                this.text = "score: " + this.value
            },
            setPos(currentCamPos) {
                this.pos = currentCamPos.sub(KABOOM_HALF_WIDTH, KABOOM_HALF_HEIGHT).add(30, 6)
            },
        },
    ])

    const diamondsNeededLabel = add([
        text("nedded: -", 8),
        pos(130, 6),
        layer('ui'),
        {
            value: 0,
            set(newValue) {
                this.value = newValue
                this.setText()
            },
            dec() {
                this.value--
                this.setText()
            },
            setPos(currentCamPos) {
                this.pos = currentCamPos.sub(KABOOM_HALF_WIDTH, KABOOM_HALF_HEIGHT).add(130, 6)
            },
            setText() {
                this.text = "needed: " + (this.value < 0 ? 0 : this.value)
            }
        },
    ])

    const levelLabel = add([
        text("level: -", 8),
        pos(240, 6),
        layer('ui'),
        {
            value: 0,
            set(newValue) {
                this.value = newValue
                this.text = "level: " + this.value
            },
            setPos(currentCamPos) {
                this.pos = currentCamPos.sub(KABOOM_HALF_WIDTH, KABOOM_HALF_HEIGHT).add(240, 6)
            },
        }
    ])

    function UISetPos(currentCamPos) {
        uiBackground.setPos(currentCamPos)
        scoreLabel.setPos(currentCamPos)
        diamondsNeededLabel.setPos(currentCamPos)
        levelLabel.setPos(currentCamPos)
    }

    var mapHeight = map.length
    var mapWidth = map[0].length
    scoreLabel.set(0)
    levelLabel.set(1)
    diamondsNeededLabel.set(levelCfg.diamondsNeeded)
    var exitOpened = false


    var items = new Array(mapHeight).fill(null).map(() => new Array(mapWidth).fill(null));
    var bouldersInMove = new Array(mapHeight).fill(null).map(() => new Array(mapWidth).fill(null));
    for (var y = 0; y < mapHeight; y++) {
        var row = map[y]
        for (var x = 0; x < mapWidth; x++) {
            bouldersInMove[y][x] = null

            var ch = row[x]
            if (ch === '*') {
                var objSprite = sprite(SPRITES_BOULDER_DASH, { frame: BOULDER_FRAME })
                var obj = add([
                    objSprite,
                    solid(),
                    BOULDER_TAG,
                    MOVEABLE_ROLE_TAG,
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                        isFalling: false,
                        direction: VEC_ZERO,
                        fallScenario: null,
                        moveProcessed: false,
                    }
                ])
                items[y][x] = obj
            } else if (ch === '+') {
                var objSprite = sprite(SPRITES_BOULDER_DASH, { frame: DIAMOND_FRAME, animSpeed: 0.05 })
                var obj = add([
                    objSprite,
                    solid(),
                    BOULDER_TAG,
                    DIAMOND_TAG,
                    MOVEABLE_ROLE_TAG,
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                        isFalling: false,
                        direction: VEC_ZERO,
                        fallScenario: null,
                        moveProcessed: false,
                    }
                ])
                obj.play(DIAMOND_ANIMATION)
                items[y][x] = obj
            } else if (ch === 'O') {
                var objSprite = sprite(SPRITES_BOULDER_DASH, { frame: FIREFLY_FRAME, animSpeed: 0.1 })
                var obj = add([
                    objSprite,
                    solid(),
                    FIREFLY_TAG,
                    MOVEABLE_ROLE_TAG,
                    ENEMY_ROLE_TAG,
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                        direction: VEC_ZERO,
                        moveProcessed: false,
                        mustWait: false,
                    }
                ])
                obj.play(FIREFLY_ANIMATION)
                items[y][x] = obj
            } else if (ch === 'X') {
                var objSprite = sprite(SPRITES_BOULDER_DASH, { frame: BUTTERFLY_FRAME, animSpeed: 0.1 })
                var obj = add([
                    objSprite,
                    solid(),
                    BUTTERFLY_TAG,
                    MOVEABLE_ROLE_TAG,
                    ENEMY_ROLE_TAG,
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                        direction: VEC_ZERO,
                        moveProcessed: false,
                        mustWait: false,
                    }
                ])
                obj.play(BUTTERFLY_ANIMATION)
                items[y][x] = obj
            } else if (ch === '.') {
                var objSprite = sprite(SPRITES_BOULDER_DASH, { frame: DIRT_FRAME })
                var obj = add([
                    objSprite,
                    solid(),
                    DIRT_TAG,
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                    }
                ])
                items[y][x] = obj
            } else if (ch === '=') {
                var objSprite = sprite(SPRITES_BOULDER_DASH, { frame: TITAN_WALL_FRAME })
                var obj = add([
                    objSprite,
                    solid(),
                    TITANIUM_WALL_TAG,
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                    }
                ])
                items[y][x] = obj
            } else if (ch === '-') {
                var objSprite = sprite(SPRITES_BOULDER_DASH, { frame: BICKS_WALL_FRAME })
                var obj = add([
                    objSprite,
                    solid(),
                    WALL_TAG,
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                    }
                ])
                items[y][x] = obj
            } else if (ch === 'S') {
                rockford.position = vec2(x, y)
                rockford.pos = rockford.position.scale(BLOCK_SIZE)
                items[rockford.position.y][rockford.position.x] = rockford

                calculateWantedCamPos()
                camPosCurrent = camPosWanted

                spawn.position = rockford.position
                spawn.pos = rockford.pos
            } else if (ch === 'E') {
                exit.position = vec2(x, y)
                exit.pos = vec2(x, y).scale(BLOCK_SIZE)
                items[exit.position.y][exit.position.x] = exit
            }
        }
    }


    spawn.play(SPAWN_ANIMATION, false)

    const gameLevel = addLevel(map, levelCfg)

    var cumulatedDelta = 0


    function setupPlayer() {
        return {
            playAnimByDirection() {
                if (rockford.direction.eq(DIR_LEFT)) {
                    rockford.playAnimIfIsDifferent(RUN_LEFT_ANIMATION)
                } else if (rockford.direction.eq(DIR_RIGHT)) {
                    rockford.playAnimIfIsDifferent(RUN_RIGHT_ANIMATION)
                } else if (rockford.direction.eq(DIR_UP) || rockford.direction.eq(DIR_DOWN)) {
                    rockford.animSpeed = 0.05
                    rockford.play(rockford.lastSideAnim)
                    rockford.currentAnim = rockford.lastSideAnim
                }
            },
            playAnimIfIsDifferent(animationName) {
                if (this.currentAnim != animationName) {
                    this.lastSideAnim = animationName
                    this.currentAnim = animationName
                    this.animSpeed = 0.05
                    this.play(this.lastSideAnim)
                }
            },
            move() {
                this.lastPosition = this.position.clone()
                this.position = this.position.add(this.direction)
                this.pos = this.position.scale(BLOCK_SIZE);
                items[this.lastPosition.y][this.lastPosition.x] = null
                items[this.position.y][this.position.x] = this
            },
            setIddle() {
                this.animSpeed = 0.2
                this.currentAnim = IDDLE_ANIMATION
                this.play(IDDLE_ANIMATION)
            },
            canPush() {
                if (randomInteger(0, 5) > 1 || rockford.pushAttempts < 2) {
                    rockford.pushAttempts++
                    return false
                }
                rockford.pushAttempts = 0
                return true
            },
        }
    }

    function removeDirt(mudPos) {
        var mud = items[mudPos.y][mudPos.x]
        if (mud == null) {
            return
        }
        if (mud.is(DIRT_TAG)) {
            items[mud.position.y][mud.position.x] = null
            destroy(mud)
        }
    }

    function removeDiamond(diamondPos) {
        var diamond = items[diamondPos.y][diamondPos.x]
        if (diamond == null) {
            return
        }
        if (diamond.is(DIAMOND_TAG)) {
            items[diamond.position.y][diamond.position.x] = null
            destroy(diamond)
            scoreLabel.inc(exitOpened ? levelCfg.diamondBonusValue : levelCfg.diamondValue)
            diamondsNeededLabel.dec()

            if (diamondsNeededLabel.value == 0) {
                layer("bg").clearColor = rgb(1, 1, 1)
                layer("bg").color = rgb(1, 1, 1)
                const bgRect = add([
                    rect(BOARD_WIDTH * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE),
                    color(1, 1, 1),
                    layer("bg"),
                ]);
                wait(0.2, () => {
                    destroy(bgRect)
                    exit.play(EXIT_OPENED_ANIMATION)
                    exitOpened = true
                })
            }
        }
    }

    function getDirectionByKey() {
        if (!keyIsDown(lastKeyDown)) {
            if (keyIsDown("left")) {
                lastKeyDown = "left"
            } else if (keyIsDown("right")) {
                lastKeyDown = "right"
            } else if (keyIsDown("up")) {
                lastKeyDown = "up"
            } else if (keyIsDown("down")) {
                lastKeyDown = "down"
            } else {
                lastKeyDown = "null2"
            }
        }

        return keyToDirection(lastKeyDown)
    }

    function keyToDirection(key) {
        if (key == "left") {
            return DIR_LEFT
        } else if (key == "right") {
            return DIR_RIGHT
        } else if (key == "up") {
            return DIR_UP
        } else if (key == "down") {
            return DIR_DOWN
        } else {
            return VEC_ZERO
        }
    }

    function moveRockford() {
        // is rockford iddle?
        if (rockford.direction.eq(VEC_ZERO)) {
            if (rockford.lastSideAnim != IDDLE_ANIMATION) {
                rockford.setIddle()
            }

            return
        }

        rockford.playAnimByDirection()
        var directedPosition = rockford.position.add(rockford.direction)
        var obj = items[directedPosition.y][directedPosition.x]
        if (obj != null && obj.is(EXIT_TAG)) {
            destroy(obj)
            rockford.move()
            playing = false
            go("win", {
                score: scoreLabel.value,
                level: levelLabel.value,
            })
        } else if (obj != null && obj.is(DIAMOND_TAG)) {
            removeDiamond(rockford.position.add(rockford.direction))
            rockford.move()
            return
        } else if (obj != null && obj.is(DIRT_TAG)) {
            removeDirt(rockford.position.add(rockford.direction))
            rockford.move()
            return
        } else if (obj == null) {
            rockford.move()
            return
        }


        if (rockford.direction.eq(DIR_LEFT)) {
            if (obj != null && boulder.is(BOULDER_TAG)) {
                var boulder = obj
                var nextToBoulder = items[rockford.position.y][rockford.position.x - 2]
                if (nextToBoulder != null) {
                    return;
                }

                if (!rockford.canPush()) {
                    return
                }

                var belowBoulder = items[rockford.position.y + 1][rockford.position.x - 1]
                newFallingState = (belowBoulder == null)
                if (newFallingState) {
                    boulder.position = boulder.position.add(DIR_DOWN)
                    boulder.pos = boulder.position.scale(BLOCK_SIZE)
                    items[rockford.position.y][rockford.position.x - 1] = null
                    items[rockford.position.y + 1][rockford.position.x - 1] = boulder
                } else {
                    boulder.position = boulder.position.add(rockford.direction)
                    boulder.pos = boulder.position.scale(BLOCK_SIZE)
                    items[rockford.position.y][rockford.position.x - 1] = null
                    items[rockford.position.y][rockford.position.x - 2] = boulder
                }
                boulder.isFalling = newFallingState
                rockford.move()
            }

        } else if (rockford.direction.eq(DIR_RIGHT)) {
            if (obj != null && boulder.is(BOULDER_TAG)) {
                var boulder = obj
                var nextToBoulder = items[rockford.position.y][rockford.position.x + 2]
                if (nextToBoulder != null) {
                    return;
                }

                if (!rockford.canPush()) {
                    return
                }

                var belowBoulder = items[rockford.position.y + 1][rockford.position.x + 1]
                newFallingState = (belowBoulder == null)
                if (newFallingState) {
                    boulder.position = boulder.position.add(DIR_DOWN)
                    boulder.pos = boulder.position.scale(BLOCK_SIZE)
                    items[rockford.position.y][rockford.position.x + 1] = null
                    items[rockford.position.y + 1][rockford.position.x + 1] = boulder
                } else {
                    boulder.position = boulder.position.add(rockford.direction)
                    boulder.pos = boulder.position.scale(BLOCK_SIZE)
                    items[rockford.position.y][rockford.position.x + 1] = null
                    items[rockford.position.y][rockford.position.x + 2] = boulder
                }
                boulder.isFalling = newFallingState
                rockford.move()
            }

        } else if (rockford.direction.eq(DIR_UP) || rockford.direction.eq(DIR_DOWN)) {
            if (obj != null && obj.is(BOULDER_TAG)) {
                return;
            }
        }
    }

    function initFireflies() {
        for (var y = mapHeight - 1; y >= 0; y--) {
            for (var x = 0; x < mapWidth; x++) {
                var obj = items[y][x]
                if (obj == null || !obj.is(FIREFLY_TAG)) {
                    continue
                }

                var firefly = obj
                firefly.direction = getFirstAvailableFireflyDirection(firefly)
            }
        }
    }

    function getFirstAvailableFireflyDirection(firefly) {
        for (var i = 0; i < 4; i++) {
            var nextTo = items[firefly.position.y + FIREFLY_INIT_DIRECTIONS[i].y][firefly.position.x + FIREFLY_INIT_DIRECTIONS[i].x]
            if (nextTo == null) {
                return FIREFLY_INIT_DIRECTIONS[i]
            }
        }
        return VEC_ZERO
    }

    function markFirefliesToMove() {
        for (var y = mapHeight - 1; y >= 0; y--) {
            for (var x = 0; x < mapWidth; x++) {
                var obj = items[y][x]
                if (obj == null || !obj.is(FIREFLY_TAG)) {
                    continue
                }

                var firefly = obj
                firefly.mustWait = false

                // Trapped or paused firefly?
                if (firefly.direction.eq(VEC_ZERO)) {
                    firefly.direction = getFirstAvailableFireflyDirection(firefly)
                    // Still trapped? (can be released by near explsion(s) or by released or moved boulder(s))
                    if (firefly.direction.eq(VEC_ZERO)) {
                        continue
                    }
                }

                // Firefly can navigate by following the left side (clockwise)
                var directionStr = directionVecToStr(firefly.direction)
                var nextDirection = NEXT_DIRECTION_TO_LEFT[directionStr]
                var nextObj = items[firefly.position.y + nextDirection.y][firefly.position.x + nextDirection.x]
                if (nextObj == null || (nextObj != null && nextObj.is(FIREFLY_TAG))) {
                    // Turning left is free way
                    firefly.direction = nextDirection
                    continue
                }

                // Can continue stright?
                var nextDirection = CURRENT_DIRECTION[directionStr]
                var nextObj = items[firefly.position.y + nextDirection.y][firefly.position.x + nextDirection.x]
                if (nextObj == null || (nextObj != null && nextObj.is(FIREFLY_TAG))) {
                    // Contonue stringht, there is free way
                    firefly.direction = nextDirection
                    continue
                }

                var directionStr = directionVecToStr(firefly.direction)
                firefly.direction = NEXT_DIRECTION_TO_RIGHT[directionStr]

                // Firefly can stop for a brief moment if there is no Empty Space to the left side before resuming navigation
                firefly.mustWait = true
                continue;
            }
        }
    }

    function moveFirefly() {
        for (var y = mapHeight - 1; y >= 0; y--) {
            for (var x = 0; x < mapWidth; x++) {
                var obj = items[y][x]
                if (obj == null || !obj.is(FIREFLY_TAG)) {
                    continue
                }

                var firefly = obj
                if (firefly.moveProcessed || firefly.mustWait || firefly.direction.eq(VEC_ZERO)) {
                    continue
                }

                var fireflyPositionClone = firefly.position.clone()

                var newPosition = firefly.position.add(firefly.direction)
                // Does some boulder plan to fall to there?
                if (bouldersInMove[newPosition.y][newPosition.x] != null) {
                    // skip step.
                    continue
                }

                var crossingObj = items[newPosition.y][newPosition.x]
                if (crossingObj != null && crossingObj.is(FIREFLY_TAG) && crossingObj.moveProcessed) {
                    continue
                }

                firefly.position = firefly.position.add(firefly.direction)
                firefly.pos = firefly.position.scale(BLOCK_SIZE)

                firefly.moveProcessed = true

                items[fireflyPositionClone.y][fireflyPositionClone.x] = null
                items[firefly.position.y][firefly.position.x] = firefly

                if (crossingObj != null) {
                    crossingObj.position = crossingObj.position.add(crossingObj.direction)
                    crossingObj.pos = crossingObj.position.scale(BLOCK_SIZE)
                    items[crossingObj.position.y][crossingObj.position.x] = crossingObj
                    crossingObj.moveProcessed = true
                }
            }
        }
    }

    function detectEnemyCollisions() {
        // Is rockford touching something dangerous?
        for (var i = 0; i < 4; i++) {
            var nextTo = items[rockford.position.y + FIREFLY_INIT_DIRECTIONS[i].y][rockford.position.x + FIREFLY_INIT_DIRECTIONS[i].x]
            if (nextTo != null && nextTo.is(ENEMY_ROLE_TAG)) {
                boomRockford()
                break
            }
        }
    }

    function resetMovingFlags() {
        for (var y = mapHeight - 1; y >= 0; y--) {
            for (var x = 0; x < mapWidth; x++) {
                bouldersInMove[y][x] = null
                var obj = items[y][x]
                if (obj == null || (obj != null && !obj.is(MOVEABLE_ROLE_TAG))) {
                    continue
                }
                obj.moveProcessed = false
            }
        }
    }

    function markBouldersToMove() {
        for (var y = mapHeight - 1; y >= 0; y--) {
            for (var x = 0; x < mapWidth; x++) {
                var obj = items[y][x]
                if (obj == null) {
                    continue
                }
                if (obj.is(BOULDER_TAG)) {
                    var boulder = obj
                    var below = items[boulder.position.y + 1][boulder.position.x]
                    if (below == null || (below != null && (below.is(ROCKFORD_TAG) || below.is(ENEMY_ROLE_TAG)) && boulder.isFalling)) {
                        var isTargetreserved = bouldersInMove[boulder.position.y + 1][boulder.position.x] != null
                        if (!isTargetreserved) {
                            boulder.isFalling = true
                            boulder.direction = DIR_DOWN
                            boulder.fallScenario = null
                            bouldersInMove[boulder.position.y + 1][boulder.position.x] = boulder
                        }
                        continue
                    } else {
                        if (below.is(BOULDER_TAG)) {
                            var above = items[boulder.position.y - 1][boulder.position.x]
                            var isBoulderAbove = above != null && above.is(BOULDER_TAG)
                            isBoulderAbove = false

                            var aboveLeft = items[boulder.position.y - 1][boulder.position.x - 1]
                            var isBoulderAboveLeft = aboveLeft != null && aboveLeft.is(BOULDER_TAG)
                            var belowLeft = items[boulder.position.y + 1][boulder.position.x - 1]
                            var nextToLeft = items[boulder.position.y][boulder.position.x - 1]
                            var isTargetreserved = bouldersInMove[boulder.position.y][boulder.position.x - 1] != null
                            if (!isBoulderAbove && !isBoulderAboveLeft && nextToLeft == null && belowLeft == null && boulder.fallScenario == null && !isTargetreserved) {
                                boulder.isFalling = true
                                boulder.direction = DIR_LEFT
                                boulder.fallScenario = "set"
                                bouldersInMove[boulder.position.y][boulder.position.x - 1] = boulder
                                continue
                            }

                            var aboveRight = items[boulder.position.y - 1][boulder.position.x + 1]
                            var isBoulderAboveRight = aboveRight != null && aboveRight.is(BOULDER_TAG)
                            var belowRight = items[boulder.position.y + 1][boulder.position.x + 1]
                            var nextToRight = items[boulder.position.y][boulder.position.x + 1]
                            var isTargetreserved = bouldersInMove[boulder.position.y][boulder.position.x + 1] != null
                            if (!isBoulderAbove && !isBoulderAboveRight && nextToRight == null && belowRight == null && boulder.fallScenario == null && !isTargetreserved) {
                                boulder.isFalling = true
                                boulder.direction = DIR_RIGHT
                                boulder.fallScenario = "set"
                                bouldersInMove[boulder.position.y][boulder.position.x + 1] = boulder
                                continue
                            }
                        }
                        boulder.isFalling = false
                        boulder.direction = VEC_ZERO
                        boulder.fallScenario = null
                        continue
                    }
                }
            }
        }
    }

    function moveBoulders() {
        for (var y = mapHeight - 1; y >= 0; y--) {
            for (var x = 0; x < mapWidth; x++) {
                var obj = items[y][x]
                if (obj == null) {
                    continue
                }
                if (obj.is(BOULDER_TAG) && obj.isFalling && !obj.moveProcessed) {
                    var boulder = obj
                    boulder.moveProcessed = true
                    var boulderPositionClone = boulder.position.clone()

                    boulder.position = boulder.position.add(boulder.direction)
                    boulder.pos = boulder.position.scale(BLOCK_SIZE)

                    items[boulderPositionClone.y][boulderPositionClone.x] = null
                    var obj = items[boulder.position.y][boulder.position.x];
                    items[boulder.position.y][boulder.position.x] = boulder

                    boulderImpactedOn(obj)
                }
            }
        }
    }

    function boulderImpactedOn(obj) {
        if (obj == null) {
            return
        }

        if (obj.is(ROCKFORD_TAG)) {
            boomRockford()
        } else if (obj.is(FIREFLY_TAG)) {
            boomObject(obj)
        }
    }

    function boomObject(obj) {
        if (obj == null) {
            return
        }

        boom(obj.position)
        destroy(obj)
    }

    function boomRockford() {
        playing = false
        var position = rockford.position
        destroy(rockford)
        rockford = createRockford()
        rockford.isDead = true

        boom(position)
    }

    function boom(position) {
        for (var x = position.x - 1; x < position.x + 2; x++) {
            for (var y = position.y - 1; y < position.y + 2; y++) {
                var obj = items[y][x]
                if (obj != null) {
                    if (obj.is(TITANIUM_WALL_TAG) || obj.is(EXIT_TAG)) {
                        continue
                    }

                    destroy(obj)
                }

                var explosionObj = add([
                    sprite(SPRITES_BOULDER_DASH, { frame: EXPLOSION_FRAME }),
                    solid(),
                    EXPLOSION_TAG,
                    {
                        position: vec2(x, y)
                    }
                ])
                items[y][x] = explosionObj
                explosionObj.pos = explosionObj.position.scale(BLOCK_SIZE)
                explosionObj.play(EXPLOSION_ANIMATION, false)
            }
        }
    }


    initFireflies()
    markBouldersToMove()
    markFirefliesToMove()

    initialized = true

    // every frame ...
    action(() => {
        if (!initialized) {
            return
        }

        if (playing) {
            rockford.direction = getDirectionByKey()
        }

        // camera movement
        var distance = camPosCurrent.dist(camPosWanted)
        if (distance != 0) {
            var diff = camPosWanted.sub(camPosCurrent)
            camPosCurrent = camPosCurrent.add(diff.scale(dt() * /*speed*/4))
            if (distance < 1) {
                camPosCurrent = camPosWanted
            }

            camPos(camPosCurrent)
            UISetPos(camPosCurrent)
        }

        // is it time to move objects?
        if (cumulatedDelta > SPEED) {
            resetMovingFlags()
            moveRockford()
            moveBoulders()
            moveFirefly()

            if (playing) {
                detectEnemyCollisions()
            }

            markBouldersToMove()
            markFirefliesToMove()
            cumulatedDelta = 0
        }

        cumulatedDelta += dt()
    })

    // destroy object everytime when animation of explosion finishes
    on("animEnd", EXPLOSION_ANIMATION, (obj) => {
        items[obj.position.y][obj.position.x] = null
        destroy(obj)
    })
})

go("game")