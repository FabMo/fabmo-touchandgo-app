// todo: implement visual tweening for smooth movement via easing functions

rangeSlider = function(canvas) {
    this.setOptions();
    this.init(canvas);
};

rangeSlider.prototype = {
    constructor: rangeSlider,

    init: function(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.cw = this.ctx.canvas.width;
        this.ch = this.ctx.canvas.height;
        this.width = this.cw - (this.padding);
        this.height = this.ch - (this.padding);
        this.currentPosition = (this.height + this.padding) / 2;
        this.percent = ((this.height - this.padding) - (this.currentPosition - this.padding)) / (this.height - this.padding);
        this.actual = this.minZ + ((this.maxZ - this.minZ) * this.percent);
        this.lastActual = 0;
        this.lastCurrent = 0;
        this.lastClickY = 0;
        this.lastMove = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.pinch_dist = null;
        this.snap = true;
        this.draggable = false;

        // mouse events
        this.canvas.addEventListener('mousedown', this.mouseDown.bind(this), false);
        this.canvas.addEventListener('mouseup', this.mouseUp.bind(this), false);
        this.canvas.addEventListener('mousemove', this.mouseMove.bind(this), false);
        this.canvas.addEventListener('mousewheel', this.mouseWheel.bind(this), false);
        this.canvas.addEventListener('DOMMouseScroll', this.mouseWheel.bind(this), false);
        this.canvas.addEventListener('onmouseout', this.onMouseOut.bind(this), false);

        // touch events
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));

        // focus events
        this.canvas.addEventListener('blur', this.onMouseOut.bind(this), false);
        this.canvas.addEventListener('focus', this.onFocus.bind(this));

        this.draw();
    },

    setOptions: function() {
        this.cursorColor = 'rgba(0, 255, 0, 0.85)';
        this.ghostColor = 'rgba(0, 255, 0, 0.35)';
        this.trackColor = 'black';
        this.scalar = 1;
        this.minTicks = 1;
        this.maxTicks = 9;
        this.padding = 15;
        this.minZ = -1;
        this.maxZ = 1;
    },

    calculateUpdate: function(mouseY) {
        var currentPosition = Math.max(mouseY, this.padding);
        currentPosition = Math.min(currentPosition, this.height);
        var percent = (this.height - currentPosition) / (this.height - this.padding);
        var actual = this.minZ + ((this.maxZ - this.minZ) * percent);
        if (this.snap) {
            var check = Math.round(actual / this.scalar) * this.scalar;
            if (check <= this.maxZ && check >= this.minZ) {
                return check;
            }
        }
        return actual;
    },

    update: function(mouseY) {
        this.currentPosition = Math.max(mouseY, this.padding);
        this.currentPosition = Math.min(this.currentPosition, this.height);
        this.percent = (this.height - this.currentPosition) / (this.height - this.padding);
        this.actual = this.minZ + ((this.maxZ - this.minZ) * this.percent);
    },

    updatePosition: function() {
        this.percent = (this.actual - this.minZ) / (this.maxZ - this.minZ);
        this.currentPosition = this.height - (this.percent * (this.height - this.padding));
        requestAnimationFrame(this.draw.bind(this));
    },

    updateFromPosition: function(pos) {
        this.actual = pos;
        this.percent = (this.actual - this.minZ) / (this.maxZ - this.minZ);
        this.currentPosition = this.height - (this.percent * (this.height - this.padding));
        requestAnimationFrame(this.draw.bind(this));
    },

    centerCursor: function() {
        var center = this.minZ + (this.maxZ - this.minZ) / 2;
        var difference = this.actual - center;
        this.minZ += difference;
        this.maxZ += difference;
        this.updatePosition();
    },

    draw: function() {
        this.clearCanvas();
        this.drawTrack();
        this.drawMajorTicks();
        this.drawMinorTicks();
        this.drawCursor();
    },

    drawTrack: function() {
        var difference = this.actual - this.lastActual;
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding, this.padding);
        this.ctx.lineTo(this.padding, this.height);
        this.ctx.strokeStyle = this.trackColor;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.closePath();

        if (difference !== 0) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.ghostColor;
            this.ctx.moveTo(this.padding, this.lastCurrent);
            this.ctx.lineTo(this.padding, this.currentPosition);
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
            this.ctx.closePath();
        }
    },

    drawCursor: function() {
        var difference = this.actual - this.lastActual;

        this.ctx.beginPath();
        this.ctx.strokeStyle = this.cursorColor;
        this.ctx.fillStyle = this.cursorColor;
        this.ctx.arc(this.padding, this.currentPosition, 5, 0, 2 * Math.PI, true);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.closePath();
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.trackColor;
        this.ctx.lineWidth = 1;
        this.ctx.arc(this.padding, this.currentPosition, 5, 0, 2 * Math.PI, true);
        this.ctx.stroke();


        if (difference !== 0) {
            this.ctx.closePath();
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.ghostColor;
            this.ctx.fillStyle = this.ghostColor;
            this.ctx.arc(this.padding, this.lastCurrent, 5, 0, 2 * Math.PI, true);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.beginPath();
        }

        this.ctx.fillStyle = this.trackColor;

        if ((difference !== 0) && (this.percent > 0.1 && this.percent < 0.99)) {
            var sign;
            if (difference > 0) {
                sign = "+";
            } else {
                sign = "";
            }
            this.ctx.fillText(this.actual.toFixed(3) + " (" + sign + difference.toFixed(3) + ")", this.padding + 11, this.currentPosition + 3);
        } else if (this.percent > 0.01 && this.percent < 0.99) {
            this.ctx.fillText(this.actual.toFixed(3), this.padding + 11, this.currentPosition + 3);
        }
    },

    drawMajorTicks: function() {
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding - 7, this.padding);
        this.ctx.lineTo(this.padding + 7, this.padding);
        this.ctx.closePath();
        this.ctx.strokeStyle = this.trackColor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.closePath();
        this.ctx.fillStyle = this.trackColor;
        this.ctx.fillText(this.maxZ.toFixed(3), this.padding + 11, this.padding + 3);

        this.ctx.beginPath();
        this.ctx.moveTo(this.padding - 7, this.height);
        this.ctx.lineTo(this.padding + 7, this.height);
        this.ctx.closePath();
        this.ctx.strokeStyle = this.trackColor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.closePath();
        this.ctx.fillStyle = this.trackColor;
        this.ctx.fillText(this.minZ.toFixed(3), this.padding + 11, this.height + 3);
    },

    drawMinorTicks: function() {
        var length = this.maxZ - this.minZ;
        while (length / this.scalar > this.maxTicks) {
            this.scalar *= 10;
        }
        while (length / this.scalar < this.minTicks) {
            this.scalar /= 10;
        }

        for (var i = Math.floor(this.maxZ / this.scalar) * this.scalar; i > Math.floor(this.minZ / this.scalar) * this.scalar; i -= this.scalar) {
            var percent = (i - this.minZ) / (this.maxZ - this.minZ);
            var tick = this.height - (percent * (this.height - this.padding));
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding - 5, tick);
            this.ctx.lineTo(this.padding + 5, tick);
            this.ctx.closePath();
            this.ctx.strokeStyle = this.trackColor;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            this.ctx.closePath();
        }
    },

    mouseDown: function(e) {
        this.draggable = true;
        var c = this.canvas;
        this.lastActual = this.actual;
        this.lastCurrent = this.currentPosition;
        this.lastClickY = e.layerY - c.offsetTop;
        this.updatePosition();
    },

    mouseUp: function(e) {
        this.draggable = false;
        this.lastMove = 0;
        var c = this.canvas;
        this.mouseY = e.layerY - c.offsetTop;
        if (Math.abs(this.mouseY - this.lastClickY) < 0.1) {
            var cursorDistance = this.getDistance(this.padding, this.currentPosition);
            var location = this.calculateUpdate(this.mouseY);
            var dialog = "Are you sure you want to move the reticule to (" + location.toFixed(3) + ")?";
            if (cursorDistance <= 20) {
                this.centerCursor();
            } else {
                $.confirm({
                    text: dialog,
                    confirm: function() {
                        this.updateFromPosition(location);
                    }.bind(this),
                    cancel: function() {
                        // nothing to do
                    }
                });
            }
        }
        this.updatePosition();
    },

    mouseMove: function(e) {
        var c = this.canvas;
        this.draw();
        e.stopPropagation();
        e.preventDefault();
        this.mouseX = e.layerX - c.offsetLeft;
        this.mouseY = e.layerY - c.offsetTop;

        if (!this.draggable) {
            this.lastActual = this.actual;
            this.draw();
        } else {
            var cursorDistance = this.getDistance(this.padding, this.currentPosition);
            var moveDistance = Math.abs(this.mouseY - this.lastClickY);
            var moveDiff = moveDistance - this.lastMove;
            var pixelCompensation = (this.maxZ - this.minZ) / (this.height - this.padding);

            if (cursorDistance <= 20) {
                this.update(this.mouseY);
                return;
            } else {
                if (this.mouseY < this.lastClickY && this.checkSlideBoundaries(moveDiff * pixelCompensation, true)) {
                    this.maxZ -= moveDiff * pixelCompensation;
                    this.minZ -= moveDiff * pixelCompensation;
                    this.updatePosition();
                } else {
                    if (this.checkSlideBoundaries(moveDiff * pixelCompensation, false)) {
                        this.minZ += moveDiff * pixelCompensation;
                        this.maxZ += moveDiff * pixelCompensation;
                        this.updatePosition();
                    }
                }
            }
            this.lastMove = moveDistance;
        }
    },

    mouseWheel: function(e) {
        var delta = e.wheelDelta ? e.wheelDelta : -e.detail;
        this.handleZoom(delta);
        e.preventDefault();
        this.updatePosition();
    },

    onMouseOut: function(e) {
        this.draggable = false;
        this.lastMove = 0;
        requestAnimationFrame(this.draw.bind(this));
    },

    onTouchStart: function(e) {
        this.draggable = true;
        var c = this.canvas;
        this.lastActual = this.actual;
        this.lastCurrent = this.currentPosition;
        this.lastClickY = e.touches[0].clientY - c.offsetTop;
        this.updatePosition();
    },

    onTouchEnd: function(e) {
        this.pinch_dist = null;
        this.draggable = false;
        this.lastMove = 0;
        var c = this.canvas;
        if(e.changedTouches.length === 1) {
            this.mouseX = e.changedTouches[0].clientX - c.offsetLeft;
            this.mouseY = e.changedTouches[0].clientY - c.offsetTop;
            if (Math.abs(this.mouseY - this.lastClickY) < 0.1) {
                var cursorDistance = this.getDistance(this.padding, this.currentPosition);
                var location = this.calculateUpdate(this.mouseY);
                var dialog = "Are you sure you want to move the reticule to (" + location.toFixed(3) + ")?";
                if (cursorDistance <= 20) {
                    this.centerCursor();
                } else {
                    $.confirm({
                        text: dialog,
                        confirm: function() {
                            this.updateFromPosition(location);
                        }.bind(this),
                        cancel: function() {
                            // nothing to do
                        }
                    });
                }
            }
        }
        this.updatePosition();
    },

    onTouchMove: function(e) {
        var c = this.canvas;
        this.draw();
        e.stopPropagation();
        e.preventDefault();
        
        if (e.touches.length === 1) {

            this.mouseX = e.touches[0].clientX - c.offsetLeft;
            this.mouseY = e.touches[0].clientY - c.offsetTop;

            if (!this.draggable) {
                this.lastActual = this.actual;
                this.draw();
            } else {
                var cursorDistance = this.getDistance(this.padding, this.currentPosition);
                var moveDistance = Math.abs(this.mouseY - this.lastClickY);
                var moveDiff = moveDistance - this.lastMove;
                var pixelCompensation = (this.maxZ - this.minZ) / (this.height - this.padding);

                if (cursorDistance <= 20) {
                    this.update(this.mouseY);
                    return;
                } else {
                    if (this.mouseY < this.lastClickY && this.checkSlideBoundaries(moveDiff * pixelCompensation, true)) {
                        this.maxZ -= moveDiff * pixelCompensation;
                        this.minZ -= moveDiff * pixelCompensation;
                        this.updatePosition();
                    } else {
                        if (this.checkSlideBoundaries(moveDiff * pixelCompensation, false)) {
                            this.minZ += moveDiff * pixelCompensation;
                            this.maxZ += moveDiff * pixelCompensation;
                            this.updatePosition();
                        }
                    }
                }
                this.lastMove = moveDistance;
            }

        } else if (e.touches.length === 2) {
            // handle zoom
            var ax = e.touches[0].clientX - c.offsetLeft;
            var bx = e.touches[1].clientX - c.offsetLeft;
            var ay = e.touches[0].clientY - c.offsetTop;
            var by = e.touches[1].clientY - c.offsetTop;
            var distance = this.dist(ax, ay, bx, by);
            if (this.pinch_dist != null) {
                var factor = distance - this.pinch_dist;
                this.handleZoom(factor);
            }
            this.pinch_dist = distance;
        }
    },

    onFocus: function(e) {},

    handleZoom: function(factor) {
        var zoomAmount = 0.1;
        if (factor > 0 && this.checkZoomBoundaries(zoomAmount)) {
            this.maxZ -= zoomAmount;
            this.minZ += zoomAmount;
        } else if (factor < 0) {
            this.maxZ += zoomAmount;
            this.minZ -= zoomAmount;
        }
    },

    checkZoomBoundaries: function(amount) {
        if ((this.actual > this.minZ + amount) && (this.actual < this.maxZ - amount)) return true;
        return false;
    },

    checkSlideBoundaries: function(amount, max) {
        if (max) {
            if (this.actual < this.maxZ - amount) return true;
        } else {
            return this.actual > this.minZ + amount;
        }
    },

    getDistance: function(px, py) {
        var xs = 0;
        var ys = 0;
        xs = px - this.mouseX;
        xs = xs * xs;
        ys = py - this.mouseY;
        ys = ys * ys;
        return Math.sqrt(xs + ys);
    },
    
    dist: function(ax, ay, bx, by) {
        return Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
    },

    setSnap: function(state) {
        this.snap = state;
    },

    clearCanvas: function() {
        // Store the current transformation matrix
        this.ctx.save();
        // Use the identity matrix while clearing the canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.cw, this.ch);
        // Restore the transform
        this.ctx.restore();
    }
};