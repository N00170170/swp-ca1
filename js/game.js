// create a new scene
let gameScene = new Phaser.Scene('Game');

// set the configuration of the game
let config = {
    type: Phaser.AUTO, // Phaser will use WebGL if available, if not it will use Canvas
    width: 360,
    height: 640,
    physics: {
        default: 'arcade',
        arcade: {
            debug: true
        }
    },
    scene: gameScene
};

// create a new game, pass the configuration
let game = new Phaser.Game(config);



//score and timer
var scoreTimer;
var score = 0;
var scoreText;

//fuel pickup sound
var fuelpickupsound;

// some parameters for our scene
gameScene.init = function () {
    this.playerSpeed = 1.5;
    this.enemyMaxX = 0;
    this.enemyMinY = 360;
}

// load assets
gameScene.preload = function () {
    // load images
    this.load.image('background', 'assets/background.png');
    this.load.image('player', 'assets/player.png');
    this.load.image('enemy', 'assets/traffic_cone.png');
    this.load.image('fuel', 'assets/fuel.png');
    this.load.image('gameOver', 'assets/endscreen.png');
    this.load.image('restartbtn', 'assets/restartbtn.png');
    this.load.image('menubtn', 'assets/menubtn.png');
    this.load.image('volumebtn', 'assets/volume.png');
    this.load.spritesheet('volbtns', 'assets/volume_spritesheet.png', {
        frameWidth: 600,
        frameHeight: 600
    });
    //load audio
    this.load.audio('fuelpickup', 'assets/fuelpickup.mp3');
};

// called once after the preload ends
gameScene.create = function () {
    // create bg sprite
    let bg = this.add.sprite(0, 0, 'background');

    // change the origin to the top-left corner
    bg.setOrigin(0, 0);

    // create the player
    this.player = this.add.sprite(this.sys.game.config.width / 2, 560, 'player');

    // we are reducing the width and height by 50%
    this.player.setScale(0.1);

    //rotate 180 degrees
    this.player.angle = 180;


    //create and hide fuel
    this.fuel = this.add.sprite(Math.floor(Math.random() * 190 + 90), 0, 'fuel');
    this.fuel.setScale(0.4);
    this.fuel.visible = false;


    //create group of traffic cones
    this.enemies = this.add.group({
        key: 'enemy',
        repeat: 3,
        setXY: {
            x: 0,
            y: 0,
            stepX: 0,
            stepY: -190

        }
    });

    // scale traffic cones down
    Phaser.Actions.ScaleXY(this.enemies.getChildren(), -0.95, -0.95);

    // set speeds
    Phaser.Actions.Call(this.enemies.getChildren(), function (enemy) {
        enemy.speed = 5;
    }, this);

    //create audio
    fuelpickupsound = this.sound.add('fuelpickup');

    //volume button
    this.volbtn = this.add.sprite(320, 50, 'volbtns').setInteractive();
    this.volbtn.setScale(0.1);

    //score text
    this.scoreText = this.add.text(40, 12, '0').setFontStyle('bold').setFill('#ffffff');
    this.scoreText.setOrigin(0.5);

    //player is alive
    this.isPlayerAlive = true;

    //reset camera effects. Not sure if this is needed
    this.cameras.main.resetFX();

    //score timer
    scoreTimer = this.time.addEvent({
        delay: 100,
        loop: true,
        callback: scoreCounter,
        callbackScope: this
    });

    //fuel spawn timer
    fuelSpawnTimer = this.time.addEvent({
        delay: 6000,
        loop: true,
        callback: spawnFuel,
        callbackScope: this
    });

};

//function to increase score
function scoreCounter() {
    score++;
}


// this is called up to 60 times per second
gameScene.update = function () {

    //check is player isPlayer dead -> exit the update loop
    if (!this.isPlayerAlive) {
        return;
    }
    // check for active input
    if (this.input.activePointer.isDown) {

        this.input.on('pointermove', function (pointer) {
            if (pointer.x < 290 && pointer.y > 100) { //check that the pointer isnt near the volume button
                this.player.setPosition(pointer.x, 560);

                if (this.player.x < 103) {
                    this.player.setPosition(103, 560);
                }

                if (this.player.x > 256) {
                    this.player.setPosition(256, 560);
                }
            }

        }, this);


    }

    //update the score text with the current score
    this.scoreText.setText(score);


    //add collision detection for each member of the enemies/traffic cone group
    let enemies = this.enemies.getChildren();
    let numEnemies = enemies.length;

    //fix random traffic cone positioning
    for (let i = 0; i < numEnemies; i++) {
        if (enemies[i].x == 0) {
            enemies[i].x = Math.floor(Math.random() * 190 + 90);
        }
    }


    for (let i = 0; i < numEnemies; i++) {

        // move traffic cones
        enemies[i].y += enemies[i].speed;

        //reset enemy if reached the edges
        if (enemies[i].y == 640) {
            enemies[i].y = 0;

        }


        // collision
        if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), enemies[i].getBounds()) && enemies[i].y < 560) {
            this.gameOver();
            break;
        }

    }

    //move fuel
    if (this.fuel.visible) {
        this.fuel.y += enemies[1].speed;

        if (this.fuel.y == 640) {
            this.fuel.visible = false;
            this.fuel.y = 0;
            this.fuel.x = Math.floor(Math.random() * 190 + 90);

        }
    } else {
        this.fuel.y = 0;
    }

    //
    if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), this.fuel.getBounds())) {

        fuelpickupsound.play();
        this.fuel.visible = false;
        this.fuel.y = 0;
        this.fuel.x = Math.floor(Math.random() * 190 + 90);
        score += 100;
        //        break;
    }

    //volume control

    this.volbtn.on('pointerdown', function (pointer) {
        this.volPressed = true;
        if (!game.sound.mute) {
            this.volbtn.setFrame(1);
            game.sound.mute = true;
        } else {
            this.volbtn.setFrame(0);
            game.sound.mute = false;
        }
    }, this);

};

//Spawn bonus
function spawnFuel() {
    //set fuel sprite to be visible
    this.fuel.visible = true;
}

// end the game
gameScene.gameOver = function () {

    //destroy timer to prevent score from increasing when game has ende
    scoreTimer.destroy();

    //player alive flag set to dead
    this.isPlayerAlive = false;
    

    //08: fading out
    this.cameras.main.fade(100);

    this.time.delayedCall(250, function () {


        this.cameras.main.resetFX();
        //adding game over bg
        gameOver = this.add.sprite(0, 0, 'gameOver');
        gameOver.setOrigin(0, 0);

        //adding the final score onto the canvas
        this.finalScoreText = this.add.text(this.sys.game.config.width / 2, 300, score).setFontStyle('bold').setFill('#ffffff').setFontSize(26);

        //setting origin to center of the text object to allow it to be centered on the canvas
        this.finalScoreText.setOrigin(0.5);

        //adding restart button sprite and setting interactive
        this.restartbtn = this.add.sprite(180, 400, 'restartbtn').setInteractive();

        //adding menu button sprite and setting interactive
        this.menubtn = this.add.sprite(180, 500, 'menubtn').setInteractive();

        //
        this.restartbtn.on('pointerdown', function (pointer) {
            this.scene.restart();
            score = 0;
        }, this);


        this.menubtn.on('pointerdown', function (pointer) {
            //open the menu in same tab
            window.open("index.html", "_self");
        }, this);

    }, [], this);

}
