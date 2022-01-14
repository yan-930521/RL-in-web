/**
 * Copyright 2021 yan-930521  All Rights Reserved.
 */
console.log('start');
const ww = window.innerWidth;
const wh = window.innerHeight;

// 移動指令的暫存
var keysDown = {};

// 遊戲畫面的實際中心
const px = ww / 2;
const py = wh / 2;

var canvas = document.createElement('canvas');
canvas.className = 'canvas';
document.body.appendChild(canvas);
canvas.width = ww;
canvas.height = wh;
var ctx = canvas.getContext('2d');
var data_green = [];
// var data_red = [];
const maxDataLen = 1000;

var Net_green = new NeuralNet();
Net_green.init(5, 3, 1);
var trained = false;
var training = false;

var player_green = new Player(px * 0.8, py, 2);
var player_red = new Player(px * 1.2, py, 2);
var last = [0, 0];

var btn = document.querySelector(".train");
btn.onclick = () => {
  train();
}

requestAnimationFrame(update);
// update()

/* All Evevt */
document.onkeydown = e => {
  keysDown[e.keyCode] = true;
}

document.onkeyup = e => {
  delete keysDown[e.keyCode];
}
/* */


async function update() {
  if (!training) {
    // 計算上一次的獎勵
    let r = reward();
    if (data_green.length != 0) {
      data_green[data_green.length - 1].push([r]);
    }

    // 更新上一次(在這一輪)的向量差，供這一次(在下一輪)的獎勵計算使用
    last[0] = player_green['x'] - player_red['x'];
    last[1] = player_green['y'] - player_red['y'];


    let s = [player_green['x'], player_green['y']];
    let action;
    if (random(maxDataLen) <= (maxDataLen - data_green.length) || !trained) {
      // 隨機 1~73
      action = random(72) + 1;
    } else if (trained) {
      let max = [0, 0];
      for (let act = 1; act < 74; act++) {
        let rew = Net_green.test([
          s[0],
          s[1],
          s[0] - player_red['x'],
          s[1] - player_red['y'],
          act
        ]);
        if (max[0] < rew) {
          max[0] = act;
          max[1] = rew;
        }
      }
      
      action = max[0];
    }

    let m = move(player_green['speed'], action);

    player_green['x'] -= m[0];

    player_green['y'] -= m[1];

    // 邊界限制
    if (player_green['y'] < 20) {
      player_green['y'] = 20;
    }
    if (player_green['y'] > wh - 20) {
      player_green['y'] = wh - 20;
    }
    if (player_green['x'] < 20) {
      player_green['x'] = 20;
    }
    if (player_green['x'] > ww - 20) {
      player_green['x'] = ww - 20;
    }

    // 移動
    if (87 in keysDown) {
      if (player_red['y'] >= 20) {
        player_red['y'] += player_red['speed'];
      }
    }
    if (83 in keysDown) {
      if (player_red['y'] <= wh - 20) {
        player_red['y'] -= player_red['speed'];
      }
    }
    if (65 in keysDown) {
      if (player_red['x'] >= 20) {
        player_red['x'] += player_red['speed'];
      }
    }
    if (68 in keysDown) {
      if (player_red['x'] <= ww - 20) {
        player_red['x'] -= player_red['speed'];
      }
    }

    if (player_red['y'] < 20) {
      player_red['y'] = 20;
    }
    if (player_red['y'] > wh - 20) {
      player_red['y'] = wh - 20;
    }
    if (player_red['x'] < 20) {
      player_red['x'] = 20;
    }
    if (player_red['x'] > ww - 20) {
      player_red['x'] = ww - 20;
    }

    // 新增資料
    data_green.push([[
      s[0],
      s[1],
      m[0],
      m[1],
      action
    ]]);
    if( data_green.length > maxDataLen) {
      data_green.shift();
    }

    ctx.clearRect(0, 0, ww, wh);
    bg();
    draw(player_green['x'], player_green['y'], 20, "green");
    draw(player_red['x'], player_red['y'], 20, "red");
  }
  requestAnimationFrame(update)
}


function move(s, a) {
  if(a == 73) {
    return [0, 0];
  }
  let nx = Math.cos(Math.PI * a / 36) * s;
  let ny = Math.sin(Math.PI * a / 36) * s;
  return [nx, ny];
}

function draw(x, y, r, c) {
  ctx.beginPath();
  ctx.fillStyle = c;
  ctx.arc(ww - x, wh - y, r, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.stroke();
  ctx.save();
}

function bg() {
  ctx.fillStyle = '#3498DB';
  ctx.fillRect(0, 0, ww, wh)
  ctx.fillStyle = 'black';
}

function random(length) {
  return Math.floor(Math.random() * length);
}

function reward() {
  let r = 0;
  let gx = player_green['x'];
  let gy = player_green['y'];
  let rx = player_red['x'];
  let ry = player_red['y'];

  // 邊界計算
  if (gx == ww || gx == 0 || gy == wh || gy == 0) {
    r += -1000;
  }

  // 死亡判定
  if ((Math.pow((gx - rx), 2) + Math.pow((gy - ry), 2)) <= 400) {
    // console.log("距離 "+ Math.pow(( gx - rx ), 2) + Math.pow(( gy - ry ), 2) )
    r += -2000;
  }

  // 距離判定
  if ((Math.pow((gx - rx), 2) + Math.pow((gy - ry), 2)) > (Math.pow(last[0], 2) + Math.pow(last[1], 2))) {
    r += 100;
  } else {
    r += -50;
  }
  return r;
}

function train() {
  training = true;
  alert('訓練開始，已暫停遊戲');
  let data = data_green;
  data.pop();
  console.log(data);
  Net_green.train(data, 5000, 0.5, 0.0001);
  alert('finish !');
  training = false;
  trained = true;
  console.log(Net_green)
}