/**
 * Copyright 2021 yan-930521  All Rights Reserved.
 */

//#region 版本宣告
console.log('start');
alert(`
 < ver 1.1.3 >\n
累積500則資料就會自動按下 train 按鈕來訓練小球
建議：
訓練一次後便按下 lock auto train net
之後點下手動控制
然後點下隨機動作
 `);
//#endregion

//#region 遊戲畫面的大小
const ww = window.innerWidth;
const wh = window.innerHeight;
const px = ww / 2;
const py = wh / 2;
// 鼠標位置
var mX = px;
var mY = py;
//#endregion

//#region 宣告畫布
var canvas = document.createElement('canvas');
canvas.className = 'canvas';
document.body.appendChild(canvas);
canvas.width = ww;
canvas.height = wh;
var ctx = canvas.getContext('2d');
// #endregion

//#region 宣告多層感知器
var Net_green = new NeuralNet();
Net_green.init(3, 2, 2);
//#endregion

//#region 宣告玩家實體
var player_red = new Player(px * 1.01, py, 3);
var player_green = new Player(px * 0.99, py, 3);
//#endregion

//#region document物件
var btn = document.querySelector(".train");
var div = document.querySelector(".datas");
var time = document.querySelector('.times');
var hand_div = document.querySelector('.hand');
var talk = document.querySelector(".talk");
var die = document.querySelector(".die");
var ran_btn = document.querySelector(".ran");
var lock = document.querySelector(".lock");
var lock2 = document.querySelector(".lock2");
//#endregion

//#region 參數
var data_g = []; 
const maxDataLen = 500; // 資料集的長度限制
var datas = 0; // 即時反應資料的長度
var times = 0; // 訓練次數
var trained = false; // 是否訓練
var training = false; // 是否為訓練中
var hand = false; // 手動訓練開關
var last = [0, 0]; // 上一次兩個玩家間的向量差
var ran_distence = 50; // 隨機移動的誤差距離
var die_times = 0; // 每次訓練後的死亡次數
var locked = false;
var locked2 = false;
var ran = true;
const ran_move = 80;
const die_str = "死亡次數 => ";
const times_str = "訓練次數 => ";
const datas_str = "資料數量 => ";
//#endregion

//#region 事件
hand_div.onclick = () => {
  // 是否手動控制玩家
  if (hand) {
    hand = false;
  } else {
    hand = true;
  }
}

btn.onclick = () => {
  // 手動訓練
  train();
  /**
   * 註. 為保持性能，已暫時鎖死
   */
}

document.onmousemove = (e) => {
  mX = e.clientX;
  mY = e.clientY;
}

ran_btn.onclick = () => {
  if (ran) {
    ran = false;
  } else {
    ran = true;
  }
}

lock.onclick = () => {
  // 是否手動控制玩家
  if (locked) {
    locked = false;
  } else {
    locked = true;
  }
}

lock2.onclick = () => {
  // 是否手動控制玩家
  if (locked2) {
    locked2 = false;
  } else {
    locked2 = true;
  }
}
//#endregion

die.innerHTML = die_str + die_times;
time.innerHTML = times_str + times;

requestAnimationFrame(update);

/*
setInterval(()=>{
  update()
},100);
*/

async function update() {
  if (!training && !locked2) {
    // 計算上一次的獎勵
    let r_g = reward_green();
    if (data_g.length != 0) {
      data_g[data_g.length - 1].push(r_g);
    }
    // if(r_r[0]) train(true); // 死亡自動學習
    if (data_g.length >= maxDataLen) {
      train(true);
    }

    // 更新上一次(在這一輪)的向量差，供這一次(在下一輪)的獎勵計算使用
    last[0] = player_green['x'] - player_red['x'];
    last[1] = player_green['y'] - player_red['y'];

    if (!hand) red_move1();
    if (hand) red_move2();

    let s_g = [player_red['x'], player_red['y']];
    let s_r = [player_green['x'], player_green['y']];
    let action_r = 9;

    if ((!trained || random(100) < ran_move) && (ran)) {
      action_r = random(9) + 1;
    } else if (trained) {
      let max_r = [-999, 0];
      for (let act = 1; act < 10; act++) {
        let rew_r = Net_green.test([
          (s_r[0] - s_g[0]) / 100,
          (s_r[1] - s_g[1]) / 100,
          act
        ]);
        rew_r = C_reward(rew_r);
        if (max_r[1] <= rew_r) {
          max_r[0] = act;
          max_r[1] = rew_r;
        }
      }
      action_r = max_r[0];
    } else {
      action_r = random(9) + 1;
    }

    // 新增資料
    data_g.push([[
      (s_r[0] - s_g[0]) / 100,
      (s_r[1] - s_g[1]) / 100,
      action_r
    ]]);

    datas++;

    if (data_g.length > maxDataLen) {
      data_g.shift();
    }

    let m_r = move(player_green['speed'], action_r);

    player_green['x'] -= m_r[0];
    player_green['y'] -= m_r[1];

    // 邊界限制
    player_green = bg_limit(player_green, player_red)

    ctx.clearRect(0, 0, ww, wh);
    bg();
    draw(player_red['x'], player_red['y'], 20, "red");
    draw(player_green['x'], player_green['y'], 20, "green");

    div.innerHTML = datas_str + (datas>maxDataLen?maxDataLen:datas) + " / " + maxDataLen;
  }

  requestAnimationFrame(update);
}


function move(s, a) {
  if (a == 9) {
    return [0, 0];
  }
  let nx = Math.cos(Math.PI * (a / 4)) * s;
  let ny = Math.sin(Math.PI * (a / 4)) * s;
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
  // ctx.fillStyle = '#3498DB';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, ww, wh)
}

function random(length) {
  return Math.floor(Math.random() * length);
}

function reward_green() {
  let r = [0, 0];
  let rx = player_red['x'];
  let ry = player_red['y'];
  let gx = player_green['x'];
  let gy = player_green['y'];

  // 1. 死亡判定 *
  if ((Math.pow((rx - gx), 2) + Math.pow((ry - gy), 2)) <= 1600) {
    die_times++;
    r[0] = -0.99;
  }

  // 2. 距離上升
  if ((Math.pow((rx - gx), 2) + Math.pow((ry - gy), 2)) > (Math.pow(last[0], 2) + Math.pow(last[1], 2))) {
    r[1] = 0.99;
  } else {
    // 3. 距離靠近
    r[1] = -0.99;
  }

  die.innerHTML = die_str + die_times;
  return r;
}
function C_reward(r) {
  return r[0] * 10 + r[1] * 5;
}

function train(s) {

  // 暫時鎖死
  //if (trained) return;

  if(training || locked) return;
  training = true;
  if (!s) alert('訓練開始\n已暫停遊戲。');
  data_g.pop();
  talk.innerHTML = JSON.stringify(data_g, 0, 1);
  Net_green.train(data_g, 10000, 0.5, 0.1);
  console.log(Net_green);
  data_g = [];
  training = false;
  trained = true;
  datas = 0;
  die_times = 0;
  times++;
  time.innerHTML = times_str + times;
  if (!s) alert('finish !\n訓練結束!');
  die.innerHTML = times_str + die_times;
}

function bg_limit(p, p2) {
  if (p['y'] < 100) {
    p['y'] = 100;
  }
  if (p['y'] > wh - 100) {
    p['y'] = wh - 100;
  }
  if (p['x'] < 100) {
    p['x'] = 100;
  }
  if (p['x'] > ww - 100) {
    p['x'] = ww - 100;
  }
  if ((Math.pow((p['x'] - p2['x']), 2) + Math.pow((p['y'] - p2['y']), 2)) <= 1600) {
    die_times++;
    p['x'] = px + random(100);
    p['y'] = py + random(100);
  }
  return p;
}

function red_move1() {
  if (random(4) == 1) {
    player_red['x'] = player_green['x'] + random(ran_distence);
    player_red['y'] = player_green['y'] + random(ran_distence);
  } else if (random(4) == 1) {
    player_red['x'] = player_green['x'] - random(ran_distence);
    player_red['y'] = player_green['y'] - random(ran_distence);
  } else if (random(4) == 1) {
    player_red['x'] = player_green['x'] + random(ran_distence);
    player_red['y'] = player_green['y'] - random(ran_distence);
  } else if (random(4) == 1) {
    player_red['x'] = player_green['x'] - random(ran_distence);
    player_red['y'] = player_green['y'] + random(ran_distence);
  }
}

function red_move2() {
  player_red['x'] = ww - mX;
  player_red['y'] = wh - mY;
}