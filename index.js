const el = document.getElementById('canvas');       //全局变量
const elContext = el.getContext('2d');      //  全局变量
const width = document.body.clientWidth;    // 全局变量
let locationArr = [];
let status = 0;
let tmpResult = '';
const d = Math.round(width * 0.9 / 6);  // 每一个解锁圆圈直径

// 创建解锁圆圈
const posArr = [[0, 0], [2 * d, 0], [4 * d, 0],
                [0, 2 * d], [2 * d, 2 * d], [4 * d, 2 * d],
                [0, 4 * d], [2 * d, 4 * d], [4 * d, 4 * d]];
const sig = document.createElement('canvas');
sig.width = d;
sig.height = d;
const sigContext = sig.getContext('2d');
sigContext.beginPath();
sigContext.arc(d / 2, d / 2, (d / 2) - 2, 0, 2 * Math.PI, false);
sigContext.fillStyle = '#fff';
sigContext.strokeStyle = '#000';
sigContext.fill();
sigContext.stroke();

// 创建高亮圆圈
const sigLight = document.createElement('canvas');
sigLight.width = d;
sigLight.height = d;
const sigLightContext = sigLight.getContext('2d');
sigLightContext.beginPath();
sigLightContext.arc(d / 2, d / 2, (d / 2) - 10, 0, 2 * Math.PI, false);
sigLightContext.fillStyle = '#ccc';
sigLightContext.strokeStyle = '#000';
sigLightContext.fill();
sigLightContext.stroke();

// 初始化页面
function initial () {
    // 设置解锁区宽高
    el.width = width * 0.9;
    el.height = width * 0.9;

    // 初始化解锁区域
    initLock();
}

// 初始化canvas
function initLock () {
    // 清除画布内容
    elContext.clearRect(0, 0, width * 0.9, width * 0.9);

    // 绘制解锁圆圈
    for (let i = 0; i < 9; i++) {
        elContext.drawImage(sig, d / 2 + posArr[i][0], d / 2 + posArr[i][1]);
    }
}

// 为触摸绑定事件
function startup () {
    el.addEventListener("touchstart", handleStart, false);
    el.addEventListener("touchend", handleEnd, false);
    el.addEventListener("touchmove", handleMove, false);
}

// 开始触摸绑定事件
function handleStart (event) {
    event.preventDefault();
    let circleNum = judgeCircle(event);
    if (circleNum) {
        locationArr.push(circleNum);
        initLock();
        highLight();
    }
}

// 触摸点移动绑定事件
function handleMove (event) {
    event.preventDefault();
    let circleNum = judgeCircle(event);
    if (circleNum) {
        let jud = true;
        for (let nums of locationArr) {
            if (nums.xNum === circleNum.xNum && nums.yNum === circleNum.yNum) {
                jud = false;
            }
        }
        if (jud) {
            locationArr.push(circleNum);
        }
    }
    initLock();
    highLight();
    drawLine(event);
}

// 触摸结束绑定事件
function handleEnd (event) {
    event.preventDefault();
    // judge
    let result = judgeResult();

    switch (status) {
        case 0:
            tmpResult = result;
            status = 1;
            console.log('input again!');
            break;
        case 1:
            if (result === tmpResult) {
                localStorage.setItem('password', result);
                console.log('localStorage save success!');
                status = 2
            }
            else {
                console.log('passwoord inconformity!');
                status = 0;
            }
            break;
        case 2:
            if (result === localStorage.getItem('password')) {
                console.log('passwoord right!');
            }
            break;
        default:
            alert('wrong！');

    }
    locationArr = [];
}

// 判断哪个圈
function judgeCircle (event) {
    let position = getPosition(event);
    let xNum = Math.floor((position.x / d - 0.5)) / 2;
    let yNum = Math.floor((position.y / d - 0.5)) / 2;

    if (Number.isInteger(xNum) && Number.isInteger(yNum)) {
        return {xNum: xNum, yNum: yNum};
    }
    else {
        return false;
    }
}

// 获取touch点相对于canvas的坐标
function getPosition (event) {
    var rect = event.currentTarget.getBoundingClientRect();
    var position = {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    return position;
}

// 高亮locationArr中的圈
function highLight () {
    for (let circleNum of locationArr) {
        let num = circleNum.xNum + circleNum.yNum * 3;
        elContext.drawImage(sigLight, d / 2 + posArr[num][0], d / 2 + posArr[num][1]);
    }
}

// 绘制路径线
function drawLine (event) {
    for (let i = 0; i < locationArr.length - 1; i++) {
        drawSingleLine((locationArr[i].xNum * 2 + 1) * d, (locationArr[i].yNum * 2 + 1) * d, (locationArr[i + 1].xNum * 2 + 1) * d, (locationArr[i + 1].yNum * 2 + 1) * d);
    }
    let position = getPosition (event);
    drawSingleLine((locationArr[locationArr.length - 1].xNum * 2 + 1) * d, (locationArr[locationArr.length - 1].yNum * 2 + 1) * d, position.x, position.y);
}

// 绘制两点之间的路径线
function drawSingleLine (x1, y1, x2, y2) {
    elContext.beginPath();
    elContext.moveTo(x1, y1);
    elContext.lineTo(x2, y2);
    elContext.closePath();
    elContext.stroke();
}

// 输出密码结果
function judgeResult () {
    let result = '';
    for (let circleNum of locationArr) {
        result = result.concat(circleNum.xNum + circleNum.yNum * 3);
    }
    return result;
}

initial();
startup();