
// 创建GestureLock类，实现手势密码锁的各项功能
class GestureLock {

    /**
     * @name constructor
     * @description GestureLock类的构造函数，初始化解锁页面
     *
     * @param    {string}  id  canvas元素的id
     * @param    {string}  info  显示提示信息元素的id
     * @param    {string}  option  含有操作选项的form元素的id
     *
     * @returns  void
     */
    constructor (id, info, option) {
        // stage：需要绘图的解锁区
        this.stage = document.getElementById(id);
        // stageCtx：解锁区的2d上下文
        this.stageCtx = this.stage.getContext('2d');
        // info：显示提示信息的元素
        this.info = document.getElementById(info);
        // option：含有操作选项的form元素
        this.option = document.getElementById(option);
        // status：密码锁的三种状态（0：开始设置密码；1：再次输入设置密码；2：验证输入密码）
        this.status = 0;
        // locationArr：记录已经划过的圆圈的相对坐标（{xNum: X方向相对坐标（0,1,2）, yNum: Y方向相对坐标（0,1,2）}）
        this.locationArr = [];
        // tmpResult：设置密码时第一次输入的密码
        this.tmpResult = '';

        // 设置canvas元素的宽高
        let _windowWidth = document.body.clientWidth;
        // 若比iphone6屏幕宽度（359）大的设备，canvas元的宽高设为323
        if (_windowWidth > 359) {
            this.stage.width = 323;
            this.stage.height = 323;
        }
        // 若比iphone6屏幕宽度（359）小的设备，canvas元的宽高屏幕宽的90%
        else {
            this.stage.width = _windowWidth * 0.9;
            this.stage.height = _windowWidth * 0.9;
        }
        
        // circleDia：解锁区内每个圆圈区域（正方形）的边长（每两个圆之间隔一个直径，圆与边框隔半个直径）
        this.circleDia = Math.round(this.stage.clientWidth / 6);
        // posArr：九个圆圈区域左上角相对解锁区左上角的X,Y偏移
        this.posArr = [[0, 0], [2 * this.circleDia, 0], [4 * this.circleDia, 0],
                [0, 2 * this.circleDia], [2 * this.circleDia, 2 * this.circleDia], [4 * this.circleDia, 2 * this.circleDia],
                [0, 4 * this.circleDia], [2 * this.circleDia, 4 * this.circleDia], [4 * this.circleDia, 4 * this.circleDia]];

        /**
         * @name drawCircle
         * @description 绘制解锁区圆圈
         *
         * @param   {number}  deta  正方形区域边长一半 - 圆圈半径
         * @param   {string}  fillColor  圆圈的填充颜色
         * @param   {string}  strokeColor  圆圈的轮廓颜色
         *
         * @returns  {object}  sig  canvas元素
         */
        let drawCircle = (deta, fillColor, strokeColor) => {
            const sig = document.createElement('canvas');
            let d = this.circleDia;
            sig.width = d;
            sig.height = d;
            const sigContext = sig.getContext('2d');
            sigContext.beginPath();
            sigContext.arc(d / 2, d / 2, (d / 2) - deta, 0, 2 * Math.PI, false);
            sigContext.fillStyle = fillColor;
            sigContext.strokeStyle = strokeColor;
            sigContext.fill();
            sigContext.stroke();
            return sig;
        };

        // sigleCircle：初始状态的圆圈（灰色）
        this.sigleCircle = drawCircle(2, '#fff', '#CCC');        
        // sigleCircleLight：初始高亮状态的圆圈（灰色）
        this.sigleCircleLight = drawCircle(10, '#CCC', '#CCC');
        // sigleCircle：正确状态的圆圈（绿色）
        this.sigleCircleGreen = drawCircle(2, '#fff', '#00FF66');        
        // sigleCircleLight：正确状态的高亮圆圈（绿色）
        this.sigleCircleLightGreen = drawCircle(10, '#00FF66', '#00FF66');
        // sigleCircle：错误状态的圆圈（红色）
        this.sigleCircleRed = drawCircle(2, '#fff', '#CC0033');
        // sigleCircleLight：错误状态的高亮圆圈（红色）
        this.sigleCircleLightRed = drawCircle(10, '#CC0033', '#CC0033');

        // 为form元素中选项绑定change事件
        let _inputNodes = this.option.elements['pattern']
        for (let inputNode of _inputNodes) {
            inputNode.addEventListener("change", (event) => {
                // 选择设置密码
                if (_inputNodes.value === 'set') {
                    this.status = 0;
                    this.info.innerHTML = '请输入手势密码';
                }
                // 选择验证密码
                else if (_inputNodes.value === 'verify') {
                    // 判断localStorage内有无密码
                    if (localStorage.getItem('password')) {
                        this.status = 2;
                        this.info.innerHTML = '请输入手势密码';
                    }
                    // 若localStorage内无密码，强制选择设置密码
                    else {
                        this.status = 0;
                        this.info.innerHTML = '请先设置密码';
                        _inputNodes[0].checked = 'checked';
                    }
                }
            }, false);
        }

        // 为解锁区绑定touchstart事件
        this.stage.addEventListener("touchstart", (event) => {
            event.preventDefault();
            // 判断是否触摸到圆圈
            let circleNum = this.judgeCircle(event);
            if (circleNum) {
                this.locationArr.push(circleNum);       //将触摸到的圆圈的位置信息记录
                this.initLock();        // 重置解锁区
            }
        }, false);

        // 为解锁区绑定touchmove事件
        this.stage.addEventListener("touchmove", (event) => {
            event.preventDefault();
            // 判断是否触摸到圆圈
            let circleNum = this.judgeCircle(event);
            if (circleNum) {
                let jud = true;
                // 判断触摸的圆圈是否已经被记录过，没记录过则记录圆圈信息，已记录过就不重复记录
                for (let nums of this.locationArr) {
                    if (nums.xNum === circleNum.xNum && nums.yNum === circleNum.yNum) {
                        jud = false;
                    }
                }
                if (jud) {
                    this.locationArr.push(circleNum);
                }
            }
            this.initLock();        // 重置解锁区
            this.drawLine('#CCC', event);       // 绘制一条联通已触摸圆圈以及手指停留点的折线
        }, false);

        // 为解锁区绑定touchend事件
        this.stage.addEventListener("touchend", (event) => {
            event.preventDefault();
            // 判断本次解锁结果
            let result = this.judgeResult();
            switch (this.status) {
                // 处于 开始设置密码 状态
                case 0:
                    // 若密码长度符合要求，将密码存入暂存区，密码锁状态变为 再次输入设置密码 状态
                    if (result.length > 3) {
                        this.tmpResult = result;
                        this.status = 1;
                        this.info.innerHTML = '请再次输入手势密码';
                        this.showRight();       // 显示绿色圆圈
                        this.drawLine('#00FF66');       // 显示绿色连线
                    }
                    // 若密码长度不符合要求，显示提示，等待下次输入
                    else {
                        this.info.innerHTML = '密码太短（至少需要四个点），请重新输入';
                        this.showWrong();       // 显示红色圆圈
                        this.drawLine('#CC0033');       // 显示红色连线
                    }
                    break;

                // 处于 再次输入设置密码 状态
                case 1:
                    // 如果两次输入密码一致，提示设置成功，并将密码保存入localStorage，自动跳转到 验证输入密码 状态
                    if (result === this.tmpResult) {
                        localStorage.setItem('password', result);
                        this.info.innerHTML = '密码设置成功';
                        this.status = 2;
                        this.option.elements['pattern'][1].checked = 'checked';
                        this.showRight();       // 显示绿色圆圈
                        this.drawLine('#00FF66');       // 显示绿色连线
                    }
                    // 如果两次输入密码不一致，显示提示，自动跳转到 开始设置密码 状态
                    else {
                        this.info.innerHTML = '两次输入的不一致，请重新输入';
                        this.status = 0;
                        this.showWrong();       // 显示红色圆圈
                        this.drawLine('#CC0033');       // 显示红色连线
                    }
                    break;

                // 处于 验证输入密码 状态
                case 2:
                    // 如果输入密码和localStorage内保存的密码一致，提示密码正确
                    if (result === localStorage.getItem('password')) {
                        this.info.innerHTML = '密码正确';
                        this.showRight();       // 显示绿色圆圈
                        this.drawLine('#00FF66');       // 显示绿色连线
                    }
                    // 如果输入密码和localStorage内保存的密码不一致，提示密码不正确
                    else {
                        this.info.innerHTML = '输入的密码不正确';
                        this.showWrong();       // 显示红色圆圈
                        this.drawLine('#CC0033');       // 显示红色连线
                    }
                    break;

                // 解锁器出现问题，弹出信息
                default:
                    alert('解锁器状态错误！！！');
            }
            // 清空已经划过的点的位置信息
            this.locationArr = [];
        }, false);

        // 初始化解锁区
        this.initLock();
    }

    /**
     * @name initLock
     * @description 重置解锁区
     *
     * @param   void
     *
     * @returns  void
     */
    initLock () {
        // 清除解锁区内容
        this.stageCtx.clearRect(0, 0, this.stage.width, this.stage.width);

        // 绘制解锁圆圈，将九个圆圈canvas元素绘制到解锁区
        for (let i = 0; i < 9; i++) {
            this.stageCtx.drawImage(this.sigleCircle, this.circleDia / 2 + this.posArr[i][0], this.circleDia / 2 + this.posArr[i][1]);
        }

        // 绘制高亮解锁圆圈，将locationArr数组内已有的圆圈位置上绘制高亮圆圈canvas元素
        for (let circleNum of this.locationArr) {
            let num = circleNum.xNum + circleNum.yNum * 3;
            this.stageCtx.drawImage(this.sigleCircleLight, this.circleDia / 2 + this.posArr[num][0], this.circleDia / 2 + this.posArr[num][1]);
        }
    }

    /**
     * @name showRight
     * @description 解锁成功时，显示绿色的解锁圆圈和线条
     *
     * @param   void
     *
     * @returns  void
     */
    showRight () {
        // 清除解锁区内容
        this.stageCtx.clearRect(0, 0, this.stage.width, this.stage.width);

        // 绘制解锁圆圈，将九个绿色的圆圈canvas元素绘制到解锁区
        for (let i = 0; i < 9; i++) {
            this.stageCtx.drawImage(this.sigleCircleGreen, this.circleDia / 2 + this.posArr[i][0], this.circleDia / 2 + this.posArr[i][1]);
        }

        // 绘制高亮解锁圆圈，将locationArr数组内已有的圆圈位置上绘制绿色的高亮圆圈canvas元素
        for (let circleNum of this.locationArr) {
            let num = circleNum.xNum + circleNum.yNum * 3;
            this.stageCtx.drawImage(this.sigleCircleLightGreen, this.circleDia / 2 + this.posArr[num][0], this.circleDia / 2 + this.posArr[num][1]);
        }
    }

    /**
     * @name showWrong
     * @description 解锁未成功时，显示红色的解锁圆圈和线条
     *
     * @param   void
     *
     * @returns  void
     */
    showWrong () {
        // 清除解锁区内容
        this.stageCtx.clearRect(0, 0, this.stage.width, this.stage.width);

        // 绘制解锁圆圈，将九个红色的圆圈canvas元素绘制到解锁区
        for (let i = 0; i < 9; i++) {
            this.stageCtx.drawImage(this.sigleCircleRed, this.circleDia / 2 + this.posArr[i][0], this.circleDia / 2 + this.posArr[i][1]);
        }

        // 绘制高亮解锁圆圈，将locationArr数组内已有的圆圈位置上绘制红色的高亮圆圈canvas元素
        for (let circleNum of this.locationArr) {
            let num = circleNum.xNum + circleNum.yNum * 3;
            this.stageCtx.drawImage(this.sigleCircleLightRed, this.circleDia / 2 + this.posArr[num][0], this.circleDia / 2 + this.posArr[num][1]);
        }
    }

    /**
     * @name getPosition
     * @description 获取touch点相对于canvas的坐标
     *
     * @param    {object}  event  触摸事件的event对象
     *
     * @returns  {object}  position
     */
    getPosition (event) {
        // 获得解锁区与页面上边和左边的距离
        let rect = event.currentTarget.getBoundingClientRect();
        // 获得相对坐标
        let position = {
            x: event.touches[0].clientX - rect.left,
            y: event.touches[0].clientY - rect.top
          };
        return position;
    }

    /**
     * @name judgeCircle
     * @description 判断触摸点在哪个圆圈上
     *
     * @param    {object}  event  触摸事件的event对象
     *
     * @returns  {boolean} false / {object} {xNum: xNum, yNum: yNum}
     */
    judgeCircle (event) {
        // 获取touch点相对于canvas的坐标
        let position = this.getPosition(event);

        // 判断touch点在哪个圆上
        let xNum = Math.floor((position.x / this.circleDia - 0.5)) / 2;
        let yNum = Math.floor((position.y / this.circleDia - 0.5)) / 2;
        if (Number.isInteger(xNum) && Number.isInteger(yNum)) {
            return {xNum: xNum, yNum: yNum};    // 若touch点在圆圈上，记录圆圈信息
        }
        else {
            return false;       // 若touch点不在圆圈上，返回false
        }
    }

    /**
     * @name drawLine
     * @description 绘制解锁路径线
     *
     * @param    {string}  color  绘制线的颜色
     * @param    {object}  event  触摸事件的event对象
     *
     * @returns  void
     */
    drawLine (color, event) {

        /**
         * @name drawSingleLine
         * @description 绘制两点之间的路径线
         *
         * @param    {string}  color  绘制线的颜色
         * @param    {number}  x1  初始点x坐标
         * @param    {number}  y1  初始点y坐标
         * @param    {number}  x2  结束点x坐标
         * @param    {number}  y2  结束点y坐标
         *
         * @returns  void
         */
        let drawSingleLine = (color, x1, y1, x2, y2) => {
            this.stageCtx.strokeStyle = color;
            this.stageCtx.beginPath();
            this.stageCtx.moveTo(x1, y1);
            this.stageCtx.lineTo(x2, y2);
            this.stageCtx.closePath();
            this.stageCtx.stroke();
        };

        // 将已经划过的圆圈的圆心用线连起来
        for (let i = 0; i < this.locationArr.length - 1; i++) {
            drawSingleLine(color, (this.locationArr[i].xNum * 2 + 1) * this.circleDia, (this.locationArr[i].yNum * 2 + 1) * this.circleDia, (this.locationArr[i + 1].xNum * 2 + 1) * this.circleDia, (this.locationArr[i + 1].yNum * 2 + 1) * this.circleDia);
        }

        // 显示解锁结果时跳过此步
        if (event) {
            // 将最后一个已经划过的圆圈的圆心和触摸点用线连起来
            let position = this.getPosition (event); 
            // 必须要有划过的圈圈     
            if (this.locationArr.length !== 0){
                // 为了美观，触摸点离开最后一个已经划过的圆圈的圆心一定距离（直径的一半）后，再显示连接线
                if (Math.abs(position.x - (this.locationArr[this.locationArr.length - 1].xNum * 2 + 1) * this.circleDia) > this.circleDia / 2 || Math.abs(position.y - (this.locationArr[this.locationArr.length - 1].yNum * 2 + 1) * this.circleDia) > this.circleDia / 2){
                    drawSingleLine(color, (this.locationArr[this.locationArr.length - 1].xNum * 2 + 1) * this.circleDia, (this.locationArr[this.locationArr.length - 1].yNum * 2 + 1) * this.circleDia, position.x, position.y);
                } 
            }
        }

        
    }

    /**
     * @name judgeResult
     * @description 输出密码结果
     *
     * @param   void
     *
     * @returns  {string}  result
     */
    judgeResult () {
        let result = '';
        // 将记录的已经划过的圆圈的相对坐标转换为数字（0-8）
        for (let circleNum of this.locationArr) {
            result = result.concat(circleNum.xNum + circleNum.yNum * 3);
        }
        return result;
    }
}

// 创建匿名的GestureLock类的实例
new GestureLock('canvas', 'info', 'option');