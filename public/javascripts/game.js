/**
 * Created by ken on 10/02/15.
 * SOURCE: http://codeperfectionist.com/articles/phaser-js-tutorial-building-a-polished-space-shooter-game-part-1/
 */
/*global Phaser*/
var game;
var player;
var greenEnemies;
var blueEnemies;
var starfield;
var cursors;
var bank;
var shipTrail;
var explosions;
var bullets;
var blueEnemyBullets;
var fireButton;
var tapRestart;
var spaceRestart;
var bulletTimer = 0;
var shields;
var score = 0;
var scoreText;
var greenEnemyLaunchTimer;
var blueEnemyLaunchTimer;
var gameOver;

var ACCELERATION = 600;
var DRAG = 400;
var MAX_SPEED = 400;

function enemyHitsPlayer(player, bullet) {
    "use strict";
    var explosion = explosions.getFirstExists(false);
    explosion.reset(player.body.x + player.body.halfWidth, player.body.halfHeight);
    explosion.alpha = 0.7;
    explosion.play('explosion', 30, false, true);
    bullet.kill();

    player.damage(bullet.damageAmount);
    shields.render();
}

function hitEnemy(enemy, bullet) {
    "use strict";
    var explosion = explosions.getFirstExists(false);
    explosion.reset(enemy.body.x + enemy.body.halfWidth, enemy.body.y + enemy.body.halfHeight);
    explosion.body.velocity.y = enemy.body.velocity.y;
    explosion.alpha = 0.7;
    explosion.play('explosion', 30, false, true);
    enemy.kill();
    bullet.kill();
}

function shipCollide(player, enemy) {
    "use strict";
    var explosion = explosions.getFirstExists(false);
    explosion.reset(enemy.body.x + enemy.body.halfWidth, enemy.body.y + enemy.body.halfHeight);
    explosion.alpha = 0.7;
    explosion.play('explosion', 30, false, true);
    enemy.kill();

    player.damage(enemy.damageAmount);
    shields.render();
}

function launchGreenEnemy() {
    "use strict";
    var MIN_ENEMY_SPACING = 300,
        MAX_ENEMY_SPACING = 3000,
        ENEMY_SPEED = 300,
        enemy = greenEnemies.getFirstExists(false);

    if (enemy) {
        enemy.reset(game.rnd.integerInRange(0, game.width), -20);
        enemy.body.velocity.x = game.rnd.integerInRange(-300, 300);
        enemy.body.velocity.y = ENEMY_SPEED;
        enemy.body.drag.x = 100;

        enemy.trail.start(false, 800, 1);

        // update function for each enemy ship to update rotation etc
        enemy.update = function () {
            enemy.angle = 180 - game.math.radToDeg(Math.atan2(enemy.body.velocity.x, enemy.body.velocity.y));
            enemy.trail.x = enemy.x;
            enemy.trail.y = enemy.y - 10;

            // Kill enemies once they go off screen
            if (enemy.y > game.height + 200) {
                enemy.kill();
            }
        };
    }

    // send another enemy soon
    game.time.events.add(game.rnd.integerInRange(MIN_ENEMY_SPACING, MAX_ENEMY_SPACING), launchGreenEnemy);
}

function launchBlueEnemy() {
    "use strict";
    var startingX = game.rnd.integerInRange(100, game.width - 100),
        verticalSpeed = 180,
        spread = 60,
        frequency = 70,
        verticalSpacing = 70,
        numEnmiesInWave = 5,
        timeBetweenWaves = 7000,
        i,
        enemy,
        enemyBullet,
        firingDelay = 2000,
        bulletSpeed = 400,
        angle;
    function enemyUpdate() {
        // Wave movement
        this.body.x = this.startingX + Math.sin((this.y) / frequency) * spread;

        // Squish and rotate ship for illusion of "banking"
        bank = Math.cos((this.y + 60) / frequency);
        this.scale.x = 0.5 - Math.abs(bank) / 8;
        this.angle = 180 - bank * 2;

        // Fire
        enemyBullet = blueEnemyBullets.getFirstExists(false);
        if (enemyBullet &&
                this.alive &&
                this.bullets &&
                this.y > game.width / 8 &&
                game.time.now > firingDelay + this.lastShot) {
            this.lastShot = game.time.now;
            this.bullets = this.bullets - 1;
            enemyBullet.reset(this.x, this.y + this.height / 2);
            enemyBullet.damageAmount = this.damageAmount;
            angle = game.physics.arcade.moveToObject(enemyBullet, player, bulletSpeed);
            enemyBullet.angle = game.math.radToDeg(angle);
        }

        // Kill enemies once they go off screen
        if (this.y > game.height + 200) {
            this.kill();
            this.y = -20;
        }
    }
    // Launch wave
    for (i = 0; i < numEnmiesInWave; i = i + 1) {
        enemy = blueEnemies.getFirstExists(false);
        if (enemy) {
            enemy.startingX = startingX;
            enemy.reset(game.width / 2, -verticalSpacing * i);
            enemy.body.velocity.y = verticalSpeed;

            // set up firing
            enemy.bullets = 1;
            enemy.lastShot = 0;
            // Update function for each enemy
            enemy.update = enemyUpdate;
        }
    }

    // Send another wave soon
    blueEnemyLaunchTimer = game.time.events.add(timeBetweenWaves, launchBlueEnemy);
}

function addEnemyEmitterTrail(enemy) {
    "use strict";
    var enemyTrail = game.add.emitter(enemy.x, player.y - 10, 100);
    enemyTrail.width = 10;
    enemyTrail.makeParticles('explosion', [1, 2, 3, 4, 5]);
    enemyTrail.setXSpeed(20, -20);
    enemyTrail.setRotation(50, -50);
    enemyTrail.setAlpha(0.4, 0, 800);
    enemyTrail.setScale(0.01, 0.1, 0.01, 0.1, 1000, Phaser.Easing.Quintic.Out);
    enemy.trail = enemyTrail;
}

function fireBullet() {
    "use strict";
    var BULLET_SPEED = 400,
        BULLET_SPACING = 250,
        bullet,
        bulletOffset;

    // to avoid them being allowed to fire too fast we set a time limit
    if (game.time.now > bulletTimer) {
    // Grab the first bullet we can fom the pool
        bullet = bullets.getFirstExists(false);

        if (bullet) {
            // And fire it
            // bullet.reset(player.x, player.y + 8); // fire vertically
            // bullet.body.velocity.y = -400;

            // Make bullet come out of tip of ship with right angle
            bulletOffset = 20 * Math.sin(game.math.degToRad(player.angle));
            bullet.reset(player.x + bulletOffset, player.y);
            bullet.angle = player.angle;
            game.physics.arcade.velocityFromAngle(bullet.angle - 90, BULLET_SPEED, bullet.body.velocity);
            bullet.body.velocity.x += player.body.velocity.x;

            bulletTimer = game.time.now + BULLET_SPACING;
        }
    }
}

function preload() {
    "use strict";
    game.load.image('starfield', '/assets/starfield.png');
    game.load.image('ship', '/assets/player.png');
    game.load.image('bullet', '/assets/bullet.png');
    game.load.image('enemy-green', '/assets/enemy-green.png');
    game.load.image('enemy-blue', '/assets/enemy-blue.png');
    game.load.image('blueEnemyBullet', '/assets/enemy-blue-bullet.png');
    game.load.spritesheet('explosion', 'assets/explode.png', 128, 128);
    game.load.bitmapFont('spacefont', '/assets/spacefont/spacefont.png', '/assets/spacefont/spacefont.xml');
}

function create() {
    "use strict";
    //  The scrolling starfield background
    starfield = game.add.tileSprite(0, 0, 800, 600, 'starfield');

    // Our bullet group
    bullets = game.add.group();
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    bullets.createMultiple(30, 'bullet');
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 1);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);

    // Blue enemy's bullets
    blueEnemyBullets = game.add.group();
    blueEnemyBullets.enableBody = true;
    blueEnemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
    blueEnemyBullets.createMultiple(30, 'blueEnemyBullet');
    blueEnemyBullets.callAll('crop', null, {x: 90, y: 0, width: 90, height: 70});
    blueEnemyBullets.setAll('alpha', 0.9);
    blueEnemyBullets.setAll('anchor.x', 0.5);
    blueEnemyBullets.setAll('anchor.y', 0.5);
    blueEnemyBullets.setAll('outOfBoundsKill', true);
    blueEnemyBullets.setAll('checkBoundsKill', true);
    blueEnemyBullets.forEach(function (enemy) {
        enemy.body.setSize(20, 20);
    });
    //  The hero!
    player = game.add.sprite(400, 500, 'ship');
    player.health = 100;
    player.anchor.setTo(0.5, 0.5);
    game.physics.enable(player, Phaser.Physics.ARCADE);

    // acceleration
    player.body.maxVelocity.setTo(MAX_SPEED, MAX_SPEED);
    player.body.drag.setTo(DRAG, DRAG);

    player.events.onKilled.add(function () {
        shipTrail.kill();
    });

    player.events.onRevived.add(function () {
        shipTrail.start(false, 5000, 10);
    });

    // The baddies
    greenEnemies = game.add.group();
    greenEnemies.enableBody = true;
    greenEnemies.physicsBodyType = Phaser.Physics.ARCADE;
    greenEnemies.createMultiple(5, 'enemy-green');
    greenEnemies.setAll('anchor.x', 0.5);
    greenEnemies.setAll('anchor.y', 0.5);
    greenEnemies.setAll('scale.x', 0.5);
    greenEnemies.setAll('scale.y', 0.5);
    greenEnemies.setAll('angle', 180);
    // greenEnemies.setAll('outOfBoundsKill', true);
    // greenEnemies.setAll('checkWorldBounds', true);
    greenEnemies.forEach(function (enemy) {
        addEnemyEmitterTrail(enemy);
        enemy.body.setSize(enemy.width * 3 / 4, enemy.height * 3 / 4);
        enemy.damageAmount = 20;
        enemy.events.onKilled.add(function () {
            enemy.trail.kill();
        });
    });

    //launchGreenEnemy();
    game.time.events.add(1000, launchGreenEnemy);

    // Blue enemies
    blueEnemies = game.add.group();
    blueEnemies.enableBody = true;
    blueEnemies.physicsBodyType = Phaser.Physics.ARCADE;
    blueEnemies.createMultiple(30, 'enemy-blue');
    blueEnemies.setAll('anchor.x', 0.5);
    blueEnemies.setAll('anchor.y', 0.5);
    blueEnemies.setAll('scale.x', 0.5);
    blueEnemies.setAll('scale.y', 0.5);
    blueEnemies.setAll('angle', 180);
    blueEnemies.forEach(function (enemy) {
        enemy.damageAmount = 40;
    });

    game.time.events.add(1000, launchBlueEnemy);

    // And some controls to play the game with
    cursors = game.input.keyboard.createCursorKeys();
    fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    // Add an emitter for the ship's trail
    shipTrail = game.add.emitter(player.x, player.y + 10, 400);
    shipTrail.width = 10;
    shipTrail.makeParticles('bullet');
    shipTrail.setXSpeed(30, -30);
    shipTrail.setYSpeed(200, 180);
    shipTrail.setRotation(50, -50);
    shipTrail.setAlpha(1, 0.01, 800);
    shipTrail.setScale(0.05, 0.4, 0.05, 0.4, 2000, Phaser.Easing.Quintic.Out);
    shipTrail.start(false, 5000, 10);

    // An explosion pool
    explosions = game.add.group();
    explosions.enableBody = true;
    explosions.physicsBodyType = Phaser.Physics.ARCADE;
    explosions.createMultiple(30, 'explosion');
    explosions.setAll('anchor.x', 0.5);
    explosions.setAll('anchor.y', 0.5);
    explosions.forEach(function (explosion) {
        explosion.animations.add('explosion');
    });

    // Shields stat
    // still font
    //shields = game.add.text(game.world.width - 150,
    //    10,
    //    'Shields: ' + player.health + '%',
    //    {font: '20px Arial', fill: '#fff'});
    // bitmap font
    shields = game.add.bitmapText(game.world.width - 250, 10, 'spacefont', player.health + '%', 50);

    shields.render = function () {
        shields.text = 'Shields: ' + Math.max(player.health, 0) + '%';
    };

    shields.render();

    // Score
    // still font
    //scoreText = game.add.text(10, 10, '', {font: '20px Arial', fill: '#fff'});
    scoreText = game.add.bitmapText(10, 10, 'spacefont', '', 50);
    scoreText.render = function () {
        scoreText.text = 'Score: ' + score;
    };
    scoreText.render();

    // Game over text
    // still font
    //gameOver = game.add.text(game.world.centerX, game.world.centerY, 'GAME OVER!', {font: '84px Arial', fill: '#fff'});
    //gameOver.anchor.setTo(0.5, 0.5);
    gameOver = game.add.bitmapText(game.world.centerX, game.world.centerY, 'spacefont', 'GAME OVER!', 110);
    gameOver.x = gameOver.x - gameOver.textWidth / 2;
    gameOver.y = gameOver.y - gameOver.textHeight / 3;
    gameOver.visible = false;
}

function update() {
    "use strict";
    var minDist,
        dist,
        fadeInGameOver;
    function restart() {
        // Reset the enemies
        greenEnemies.callAll('kill');
        game.time.events.remove(greenEnemyLaunchTimer);
        game.time.events.add(1000, launchGreenEnemy);
        blueEnemyBullets.callAll('kill');

        blueEnemies.callAll('kill');
        game.time.events.remove(blueEnemyLaunchTimer);

        // Revive the player
        player.revive();
        player.health = 100;
        shields.render();
        score = 0;
        scoreText.render();

        // Hide the text
        gameOver.visible = false;
    }

    function setResetHandlers() {
        function restartHandler() {
            tapRestart.detach();
            spaceRestart.detach();
            restart();
        }

        // The "click to restart" handler
        tapRestart = game.input.onTap.addOnce(restartHandler, this);
        spaceRestart = fireButton.onDown.addOnce(restartHandler, this);
    }

    // Scroll the background
    starfield.tilePosition.y += 2;

    // Reset the player, then check for movement keys
    // player.body.velocity.setTo(0, 0); // no acceleration
    player.body.acceleration.x = 0;

    if (cursors.left.isDown) {
        //player.body.velocity.x = -200; // no acceleration
        player.body.acceleration.x = -ACCELERATION;
    } else if (cursors.right.isDown) {
        //player.body.velocity.x = 200; // no acceleration
        player.body.acceleration.x = ACCELERATION;
    }

    // Stop at screen edges
    if (player.x > game.width - 50) {
        player.x = game.width - 50;
        player.body.acceleration.x = 0;
    }
    if (player.x < 50) {
        player.x = 50;
        player.body.acceleration.x = 0;
    }

    // Fire bullet
    if (player.alive && (fireButton.isDown || game.input.activePointer.isDown)) {
        fireBullet();
    }

    // Move ship towards mouse pointer
    if (game.input.x < game.width - 20 &&
            game.input.x > 20 &&
            game.input.y > 20 &&
            game.input.y < game.height - 20) {
        minDist = 200;
        dist = game.input.x - player.x;
        player.body.velocity.x = MAX_SPEED * game.math.clamp(dist / minDist, -1, 1);
    }

    // Squish and rotate ship for illusion of "banking"
    bank = player.body.velocity.x / MAX_SPEED;
    player.scale.x = 1 - Math.abs(bank) / 2;
    player.angle = bank * 30;

    // Keep the shipTrail lined up with the ship
    shipTrail.x = player.x;

    // Check collisions
    game.physics.arcade.overlap(player, greenEnemies, shipCollide, null, this);
    game.physics.arcade.overlap(greenEnemies, bullets, hitEnemy, null, this);

    game.physics.arcade.overlap(player, blueEnemies, shipCollide, null, this);
    game.physics.arcade.overlap(bullets, blueEnemies, hitEnemy, null, this);

    game.physics.arcade.overlap(blueEnemyBullets, player, enemyHitsPlayer, null, this);
    // Game Over?
    if (!player.alive && gameOver.visible === false) {
        gameOver.visible = true;
        gameOver.alpha = 0;
        fadeInGameOver = game.add.tween(gameOver);
        fadeInGameOver.to({alpha: 1}, 1000, Phaser.Easing.Quintic.Out);
        fadeInGameOver.onComplete.add(setResetHandlers);
        fadeInGameOver.start();
    }
}

function render() {
    "use strict";
    return null;
}
game = new Phaser.Game(800,
    600,
    Phaser.AUTO,
    'phaser-demo',
    {preload: preload, create: create, update: update, render: render}
    );
