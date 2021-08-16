const BOARD_WIDTH = 40
const BOARD_HEIGHT = 24

const BOARD_VISIBLE_WIDTH = 20
const BOARD_VISIBLE_HEIGHT = 13

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

const SPRITE_WALL = 30
const SPRITE_MUD = 33
const SPRITE_SPAWN = 31
const SPRITE_BICKS = 32
const SPRITE_STONE = 35
const SPRITE_DIAMOND = 40

const SPEED = 0.2

const VEC_ZERO = vec2(0, 0)
const DIR_LEFT = vec2(-1, 0)
const DIR_RIGHT = vec2(1, 0)
const DIR_UP = vec2(0, -1)
const DIR_DOWN = vec2(0, 1)

const SPRITE_FILENAME = "spritesheet_A.png"

loadRoot('http://localhost:8000/resources/')
loadSprite('man', SPRITE_FILENAME, {
    sliceX: 10,
    sliceY: 13,
    anims: {
        iddle: {
            from: 0,
            to: 6,
        },
        runLeft: {
            from: 10,
            to: 16,
        },
        runRight: {
            from: 20,
            to: 26,
        },
    },
})
loadSprite('bd', SPRITE_FILENAME, {
    sliceX: 10,
    sliceY: 13,
    anims: {
        explosion: {
            from: 100,
            to: 102,
        }
    }
})
loadSprite('spawn', SPRITE_FILENAME, {
    sliceX: 10,
    sliceY: 13,
    anims: {
        born: {
            from: 100,
            to: 104,
        },
        start: {
            from: SPRITE_WALL,
            to: SPRITE_SPAWN,
        },
        exitOpened: {
            from: SPRITE_WALL,
            to: SPRITE_SPAWN,
        },
    }
})

loadSprite('diamond', SPRITE_FILENAME, {
    sliceX: 10,
    sliceY: 13,
    anims: {
        diamond: {
            from: 40,
            to: 47,
        }
    }
})

scene("game", () => {
    layers(['bg', 'obj', 'ui'], 'obj')
    var sa = 0
    var playing = false

    // Cave Debug
    // const map = [
    //     '                                   ',
    //     '                                   ',
    //     '                                   ',
    //     '===================================',
    //     '=.................*****+*.........=',
    //     '=..* * ...........*******.........=',
    //     '=..... .....*.... *******S.++..E..=',
    //     '=......*.*..*.... ===+=== ........=',
    //     '=................         ........=',
    //     '=.........****...         ........=',
    //     '=....************         ........=',
    //     '=................         ........=',
    //     '=....                     ........=',
    //     '=................         ........=',
    //     '=.................................=',
    //     '=.................................=',
    //     '=.................................=',
    //     '=.................................=',
    //     '===================================',
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
        //'=': [sprite('bd', { frame: SPRITE_WALL }, solid()), "wall"],
        //'.': [sprite('bd', { frame: SPRITE_MUD }, solid()), "mud"],
        any(ch) {
            return []
        }
    }

    function createPlayer() {
        var obj = add([
            sprite("man", {
                animSpeed: 0.3, // time per frame (defaults to 0.1)
                frame: 0, // start frame (defaults to 0)
            }),
            {
                position: VEC_ZERO,
                direction: VEC_ZERO,
                lastSideAnim: "runRight",
                currentAnim: "iddle",
                isDead: false,
                pushAttempts: 0,
            },
            "man",
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
    
    var player = createPlayer()
    var lastKeyDown = "null2"

    function calculateWantedCamPos() {
        camPosWanted = camOffset.add(BOARD_VISIBLE_WIDTH / 2, BOARD_VISIBLE_HEIGHT / 2).scale(BLOCK_SIZE)
    }

    function calculateCamPos() {
        var oldCamOffset = camOffset.clone()

        // X
        if (player.position.x - camOffset.x < 5) {
            if (camOffset.x > 0) {
                camOffset = camOffset.add(DIR_LEFT)
            }
        }

        if (player.position.x - camOffset.x > BOARD_VISIBLE_WIDTH - 5) {
            if (camOffset.x < BOARD_WIDTH - BOARD_VISIBLE_WIDTH) {
                camOffset = camOffset.add(DIR_RIGHT)
            }
        }

        // Y
        if (player.position.y - camOffset.y < 5) {
            if (camOffset.y > 0) {
                camOffset = camOffset.add(DIR_UP)
            }
        }

        if (player.position.y - camOffset.y > BOARD_VISIBLE_HEIGHT - 5) {
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

    player.action(() => {
        calculateCamPos()
    })


    const spawn = add([
        sprite("spawn", {
            animSpeed: 0.1,
            frame: SPRITE_SPAWN,
        }),
        {
            spawnAnimated: 0,
        },
    ])
    spawn.on("animEnd", (anim) => {
        if (anim === "start") {
            spawn.spawnAnimated++
            if (spawn.spawnAnimated == 5) {
                spawn.play("born", false)
            } else {
                spawn.play("start", false)
            }
        }
        if (anim === "born") {
            destroy(spawn)
            player.hidden = false
            player.animSpeed = 0.3
            player.play("iddle")
            playing = true
        }
    });


    const exit = add([
        sprite("spawn", {
            animSpeed: 0.2,
            frame: SPRITE_WALL,
        }),
        solid(),
        "exit",
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
    var stonesInMove = new Array(mapHeight).fill(null).map(() => new Array(mapWidth).fill(null));
    for (var y = 0; y < mapHeight; y++) {
        var row = map[y]
        for (var x = 0; x < mapWidth; x++) {
            stonesInMove[y][x] = null

            var ch = row[x]
            if (ch === '*') {
                var objSprite = sprite('bd', { frame: SPRITE_STONE }, solid(), "stone")
                var obj = add([
                    objSprite,
                    solid(),
                    "stone",
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
                var objSprite = sprite('diamond', { frame: SPRITE_DIAMOND, animSpeed: 0.05 }, solid(), "diamond")
                var obj = add([
                    objSprite,
                    solid(),
                    "stone",
                    "diamond",
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                        isFalling: false,
                        direction: VEC_ZERO,
                        fallScenario: null,
                        moveProcessed: false,
                    }
                ])
                obj.play('diamond')
                items[y][x] = obj
            } else if (ch === '.') {
                var objSprite = sprite('bd', { frame: SPRITE_MUD }, solid(), "mud")
                var obj = add([
                    objSprite,
                    solid(),
                    "mud",
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                    }
                ])
                items[y][x] = obj
            } else if (ch === '=') {
                var objSprite = sprite('bd', { frame: SPRITE_WALL }, solid(), "wall")
                var obj = add([
                    objSprite,
                    solid(),
                    "wall",
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                    }
                ])
                items[y][x] = obj
            } else if (ch === '-') {
                var objSprite = sprite('bd', { frame: SPRITE_BICKS }, solid(), "bricks")
                var obj = add([
                    objSprite,
                    solid(),
                    "wall",
                    "bricks",
                    pos(x * BLOCK_SIZE, y * BLOCK_SIZE),
                    {
                        position: vec2(x, y),
                    }
                ])
                items[y][x] = obj
            } else if (ch === 'S') {
                player.position = vec2(x, y)
                player.pos = player.position.scale(BLOCK_SIZE)
                items[player.position.y][player.position.x] = player

                calculateWantedCamPos()
                camPosCurrent = camPosWanted

                spawn.position = player.position
                spawn.pos = player.pos
            } else if (ch === 'E') {
                exit.position = vec2(x, y)
                exit.pos = vec2(x, y).scale(BLOCK_SIZE)
                items[exit.position.y][exit.position.x] = exit
            }
        }
    }


    spawn.play("start", false)

    const gameLevel = addLevel(map, levelCfg)

    var lastDelta = 0


    function setupPlayer() {
        return {
            playAnimByDirection() {
                if (player.direction.eq(DIR_LEFT)) {
                    player.playAnimIfIsDifferent("runLeft")
                } else if (player.direction.eq(DIR_RIGHT)) {
                    player.playAnimIfIsDifferent("runRight")
                } else if (player.direction.eq(DIR_UP) || player.direction.eq(DIR_DOWN)) {
                    player.animSpeed = 0.05
                    player.play(player.lastSideAnim)
                    player.currentAnim = player.lastSideAnim
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
                this.currentAnim = "iddle"
                this.play("iddle")
            },
            canPush() {
                if (randomInteger(0, 5) > 1 || player.pushAttempts < 2) {
                    player.pushAttempts++
                    return false
                }
                player.pushAttempts = 0
                return true
            },
        }
    }

    function removeMud(mudPos) {
        var mud = items[mudPos.y][mudPos.x]
        if (mud == null) {
            return
        }
        if (mud.is("mud")) {
            items[mud.position.y][mud.position.x] = null
            destroy(mud)
        }
    }

    function removeDiamond(diamondPos) {
        var diamond = items[diamondPos.y][diamondPos.x]
        if (diamond == null) {
            return
        }
        if (diamond.is("diamond")) {
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
                    exit.play("exitOpened")
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

    function movePlayer() {
        // is player iddle?
        if (player.direction.eq(VEC_ZERO)) {
            if (player.lastSideAnim != "iddle") {
                player.setIddle()
            }

            return
        }

        player.playAnimByDirection()
        var directedPosition = player.position.add(player.direction)
        var obj = items[directedPosition.y][directedPosition.x]
        if (obj != null && obj.is("exit")) {
            destroy(obj)
            player.move()
            playing = false
            go("win", {
                score: scoreLabel.value,
                level: levelLabel.value,
            })
        } else if (obj != null && obj.is("diamond")) {
            removeDiamond(player.position.add(player.direction))
            player.move()
            return
        } else if (obj != null && obj.is("mud")) {
            removeMud(player.position.add(player.direction))
            player.move()
            return
        } else if (obj == null) {
            player.move()
            return
        }


        if (player.direction.eq(DIR_LEFT)) {
            var stone = obj
            if (stone != null && stone.is("stone")) {
                var nextToStone = items[player.position.y][player.position.x - 2]
                if (nextToStone != null) {
                    return;
                }

                if (!player.canPush()) {
                    return
                }

                var underStone = items[player.position.y + 1][player.position.x - 1]
                newFallingState = (underStone == null)
                if (newFallingState) {
                    stone.position = stone.position.add(DIR_DOWN)
                    stone.pos = stone.position.scale(BLOCK_SIZE)
                    items[player.position.y][player.position.x - 1] = null
                    items[player.position.y + 1][player.position.x - 1] = stone
                } else {
                    stone.position = stone.position.add(player.direction)
                    stone.pos = stone.position.scale(BLOCK_SIZE)
                    items[player.position.y][player.position.x - 1] = null
                    items[player.position.y][player.position.x - 2] = stone
                }
                stone.isFalling = newFallingState
                player.move()
            }

        } else if (player.direction.eq(DIR_RIGHT)) {
            var stone = obj
            if (stone != null && stone.is("stone")) {
                var nextToStone = items[player.position.y][player.position.x + 2]
                if (nextToStone != null) {
                    return;
                }

                if (!player.canPush()) {
                    return
                }

                var underStone = items[player.position.y + 1][player.position.x + 1]
                newFallingState = (underStone == null)
                if (newFallingState) {
                    stone.position = stone.position.add(DIR_DOWN)
                    stone.pos = stone.position.scale(BLOCK_SIZE)
                    items[player.position.y][player.position.x + 1] = null
                    items[player.position.y + 1][player.position.x + 1] = stone
                } else {
                    stone.position = stone.position.add(player.direction)
                    stone.pos = stone.position.scale(BLOCK_SIZE)
                    items[player.position.y][player.position.x + 1] = null
                    items[player.position.y][player.position.x + 2] = stone
                }
                stone.isFalling = newFallingState
                player.move()
            }

        } else if (player.direction.eq(DIR_UP) || player.direction.eq(DIR_DOWN)) {
            if (obj != null && obj.is("stone")) {
                return;
            }
        }
    }

    function markStonesToMove() {
        for (var y = mapHeight - 1; y >= 0; y--) {
            for (var x = 0; x < mapWidth; x++) {
                var stone = items[y][x]
                if (stone == null) {
                    continue
                }
                if (stone.is("stone")) {
                    var under = items[stone.position.y + 1][stone.position.x]
                    if (under == null || (under != null && under.is("man") && stone.isFalling)) {
                        var isTargetreserved = stonesInMove[stone.position.y + 1][stone.position.x] != null
                        if (!isTargetreserved) {
                            stone.isFalling = true
                            stone.direction = DIR_DOWN
                            stone.fallScenario = null
                            stonesInMove[stone.position.y + 1][stone.position.x] = stone
                        }
                        continue
                    } else {
                        if (under.is("stone")) {
                            var above = items[stone.position.y - 1][stone.position.x]
                            var isStoneAbove = above != null && above.is("stone")
                            isStoneAbove = false

                            var aboveLeft = items[stone.position.y - 1][stone.position.x - 1]
                            var isStoneAboveLeft = aboveLeft != null && aboveLeft.is("stone")
                            var underLeft = items[stone.position.y + 1][stone.position.x - 1]
                            var nextToLeft = items[stone.position.y][stone.position.x - 1]
                            var isTargetreserved = stonesInMove[stone.position.y][stone.position.x - 1] != null
                            if (!isStoneAbove && !isStoneAboveLeft && nextToLeft == null && underLeft == null && stone.fallScenario == null && !isTargetreserved) {
                                stone.isFalling = true
                                stone.direction = DIR_LEFT
                                stone.fallScenario = "left"
                                stonesInMove[stone.position.y][stone.position.x - 1] = stone
                                continue
                            }

                            var aboveRight = items[stone.position.y - 1][stone.position.x + 1]
                            var isStoneAboveRight = aboveRight != null && aboveRight.is("stone")
                            var underRight = items[stone.position.y + 1][stone.position.x + 1]
                            var nextToRight = items[stone.position.y][stone.position.x + 1]
                            var isTargetreserved = stonesInMove[stone.position.y][stone.position.x + 1] != null
                            if (!isStoneAbove && !isStoneAboveRight && nextToRight == null && underRight == null && stone.fallScenario == null && !isTargetreserved) {
                                stone.isFalling = true
                                stone.direction = DIR_RIGHT
                                stone.fallScenario = "right"
                                stonesInMove[stone.position.y][stone.position.x + 1] = stone
                                continue
                            }
                        }
                        stone.isFalling = false
                        stone.direction = VEC_ZERO
                        stone.fallScenario = null
                        continue
                    }
                }
            }
        }
    }

    function moveStones() {
        for (var y = mapHeight - 1; y >= 0; y--) {
            for (var x = 0; x < mapWidth; x++) {
                stonesInMove[y][x] = null
                var obj = items[y][x]
                if (obj == null) {
                    continue
                }
                if (obj.is("stone")) {
                    obj.moveProcessed = false
                }
            }
        }
        for (var y = mapHeight - 1; y >= 0; y--) {
            for (var x = 0; x < mapWidth; x++) {
                var stone = items[y][x]
                if (stone == null) {
                    continue
                }
                if (stone.is("stone") && stone.isFalling && !stone.moveProcessed) {
                    stone.moveProcessed = true
                    var stonePos = stone.position.clone()

                    stone.position = stone.position.add(stone.direction)
                    stone.pos = stone.position.scale(BLOCK_SIZE)

                    items[stonePos.y][stonePos.x] = null
                    var obj = items[stone.position.y][stone.position.x];
                    items[stone.position.y][stone.position.x] = stone

                    if (obj != null && obj.is("man")) {
                        playerBoom()
                    }
                }
            }
        }
    }

    function playerBoom() {
        playing = false
        var position = player.position
        destroy(player)
        player = createPlayer()
        player.isDead = true

        boom(position)
    }

    function boom(position) {
        for (var x = position.x - 1; x < position.x + 2; x++) {
            for (var y = position.y - 1; y < position.y + 2; y++) {
                var obj = items[y][x]
                if (obj != null) {
                    if (obj.is("wall")) {
                        continue
                    }

                    destroy(obj)
                }

                var explosion = add([
                    sprite('bd', { frame: 100 }, solid(), "explosion"),
                    solid(),
                    "explosion",
                    {
                        position: vec2(x, y)
                    }
                ])
                items[y][x] = explosion
                explosion.pos = explosion.position.scale(BLOCK_SIZE)
                explosion.play("explosion", false)
            }
        }
    }

    function reposObjects() {
        //return
        for (var y = mapHeight - 1; y >= 0; y--) {
            for (var x = 0; x < mapWidth; x++) {
                var obj = items[y][x]
                if (obj == null) {
                    continue
                }
                obj.position = vec2(x, y)
                obj.pos = obj.position.scale(BLOCK_SIZE)
            }
        }
    }


    // every frame ...
    action(() => {
        if (playing) {
            player.direction = getDirectionByKey()
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
        if (lastDelta == 0 || lastDelta > SPEED) {
            movePlayer()
            moveStones()
            markStonesToMove()
            reposObjects()
            lastDelta = 0
        }

        lastDelta += dt()
    })

    on("animEnd", "explosion", (obj) => {
        items[obj.position.y][obj.position.x] = null
        destroy(obj)
    })
})

go("game")