rangeSlider = function(height, width) {
  this.scalar = 1;
  this.minTicks = 1;
  this.maxTicks = 9;
  this.currentPosition = 0;
  this.width = 0;
  this.height = 0;
  this.padding = 15;
  this.trackHeight = (this.height - (2 * this.padding));
  this.cw = 0;
  this.ch = 0;
  this.lastActual = 0;
  this.lastCurrent = 0;
  this.lastClickY = 0;
  this.minZ = -1;
  this.maxZ = 1;
  this.percent = 0;
  this.actual = 0;
  this.snap = true;
  this.draggable = false;
  this.init(height, width);
}

rangeSlider.prototype = {
  constructor: rangeSlider,
  
  init: function(height, width) {
    var rs = this;
    rs.canvas = document.createElement("canvas");
    rs.canvas.width = width;
    rs.canvas.height = height;
    document.body.appendChild(rs.canvas);
    rs.ctx = rs.canvas.getContext('2d');
    rs.mouseX = 0;
    rs.mouseY = 0;
    rs.cw = rs.ctx.canvas.width;
    rs.ch = rs.ctx.canvas.height;
    rs.width = this.cw - (rs.padding);
    rs.height = this.ch - (rs.padding);
    rs.currentPosition = (rs.height + rs.padding) / 2;
    rs.percent = ((rs.height - rs.padding) - (rs.currentPosition - rs.padding)) / (rs.height - rs.padding);
    rs.actual = rs.minZ + ((rs.maxZ - rs.minZ) * rs.percent);

    // Ripped this touch support code from a random JSFiddle, so it may not work with FabMo.
    // -Eli
    var isTouchSupported = 'ontouchstart' in window;
    var startEvent = isTouchSupported ? 'touchstart' : 'mousedown';
    var moveEvent = isTouchSupported ? 'touchmove' : 'mousemove';
    var endEvent = isTouchSupported ? 'touchend' : 'mouseup';

    rs.canvas.addEventListener(startEvent, function mousedown(e) {
      rs.draggable = true;
      var c = rs.canvas;
      rs.lastActual = rs.actual;
      rs.lastCurrent = rs.currentPosition;
      rs.lastClickY = (e.targetTouches) ? e.targetTouches[0].layerY - c.offsetTop : e.layerY - c.offsetTop;
      rs.updatePosition();
    }, false);
    rs.canvas.addEventListener(endEvent, function mouseup(e) {
      rs.draggable = false;
      var c = rs.canvas;
      rs.mouseY = e.layerY;
      rs.mouseY = (e.targetTouches) ? e.targetTouches[0].layerY - c.offsetTop : e.layerY - c.offsetTop;
      if(Math.abs(rs.mouseY - rs.lastClickY) < 0.1) {
          var cursorDistance = rs.getDistance(rs.padding, rs.currentPosition);
          if(cursorDistance <= 20) {
              rs.centerCursor();
          }
          else {
            $.confirm({
                text: "Are you sure you want to move the reticule?",
                confirm: function() {
                    rs.update(rs.mouseY);
                }.bind(rs),
                cancel: function() {
                    // nothing to do
                }
            });
        }
      }
      rs.updatePosition();
    }, false);
    rs.canvas.addEventListener(moveEvent, rs.mousemove.bind(this), false);
    rs.canvas.addEventListener('mousewheel', rs.mousewheel.bind(this), false);
    rs.canvas.addEventListener('onblur', rs.onblur.bind(this), false);
    rs.canvas.addEventListener('onmouseout', rs.onmouseout.bind(this), false);
    rs.draw();
  },
  
  update: function(mouseY) {
      var rs = this;
      rs.currentPosition = Math.max(mouseY, rs.padding);
      rs.currentPosition = Math.min(rs.currentPosition, rs.height);
      rs.percent = (rs.height - rs.currentPosition) / (rs.height - rs.padding);
      rs.actual = rs.minZ + ((rs.maxZ - rs.minZ) * rs.percent);
      if(rs.snap) {
          var check = Math.round(rs.actual / rs.scalar) * rs.scalar;
          if(check <= rs.maxZ && check >= rs.minZ) {
              rs.updateFromPosition(check);
          }
      }
  },
  
  updatePosition: function() {
      var rs = this;
      rs.percent = (rs.actual - rs.minZ) / (rs.maxZ - rs.minZ);
      rs.currentPosition = rs.height - (rs.percent * (rs.height - rs.padding));
      requestAnimationFrame(rs.draw.bind(rs));
  },
  
  updateFromPosition: function(pos) {
      var rs = this;
      rs.actual = pos;
      rs.percent = (rs.actual - rs.minZ) / (rs.maxZ - rs.minZ);
      rs.currentPosition = rs.height - (rs.percent * (rs.height - rs.padding));
      requestAnimationFrame(rs.draw.bind(rs));
  },
  
  centerCursor: function() {
      var rs = this;
      var center = rs.minZ + (rs.maxZ - rs.minZ) / 2;
      var difference = rs.actual - center;
      rs.minZ += difference;
      rs.maxZ += difference;
      rs.updatePosition();
  },
  
  draw: function() {
    var rs = this;
    this.clearCanvas();
    rs.drawTrack();
    rs.drawMajorTicks();
    rs.drawMinorTicks();
    rs.drawCursor();
  },
  
  drawTrack: function() {
    var rs = this;
    rs.ctx.beginPath();
    rs.ctx.moveTo(rs.padding, rs.padding);
    rs.ctx.lineTo(rs.padding, rs.height);
    rs.ctx.strokeStyle = "black";
    rs.ctx.lineWidth = 3;
    rs.ctx.stroke();
    rs.ctx.closePath();
  },
  
  drawCursor: function() {
    var rs = this;
    var difference = rs.actual - rs.lastActual;
    
    rs.ctx.beginPath();
    rs.ctx.strokeStyle = "rgb(255,200,0)";
    rs.ctx.fillStyle = "rgb(255,200,0)";
    rs.ctx.arc(rs.padding, rs.currentPosition, 5, 0, 2 * Math.PI, true);
    rs.ctx.fill();
    rs.ctx.stroke();
    
     if(difference != 0) {
        rs.ctx.closePath();
        rs.ctx.beginPath();
        rs.ctx.strokeStyle = "rgba(255,200,0,0.35)";
        rs.ctx.fillStyle = "rgba(255,200,0,0.35)";
        rs.ctx.arc(rs.padding, rs.lastCurrent, 5, 0, 2 * Math.PI, true);
        rs.ctx.fill();
        rs.ctx.stroke();
        rs.ctx.closePath();
        rs.ctx.beginPath();
    }
    
    rs.ctx.fillStyle = "black";
    
    if((difference != 0) && (rs.percent > 0.1 && rs.percent < 0.99)) {
        if(difference > 0) {
            var sign = "+";
        }
        else {
            sign = "";
        }
        rs.ctx.fillText(rs.actual.toFixed(3) + " (" + sign + difference.toFixed(3) + ")", rs.padding + 11, rs.currentPosition + 3);
    }
    else if(rs.percent > 0.01 && rs.percent < 0.99) {
        rs.ctx.fillText(rs.actual.toFixed(3), rs.padding + 11, rs.currentPosition + 3);
    }
  },
  
  drawMajorTicks: function() {
    var rs = this;
    rs.ctx.beginPath();
    rs.ctx.moveTo(rs.padding - 7, rs.padding);
    rs.ctx.lineTo(rs.padding + 7, rs.padding);
    rs.ctx.closePath();
    rs.ctx.strokeStyle = "black";
    rs.ctx.lineWidth = 2;
    rs.ctx.stroke();
    rs.ctx.closePath();
    rs.ctx.fillStyle = "black";
    rs.ctx.fillText(rs.maxZ.toFixed(3), rs.padding + 11, rs.padding + 3);
    
    rs.ctx.beginPath();
    rs.ctx.moveTo(rs.padding - 7, rs.height);
    rs.ctx.lineTo(rs.padding + 7, rs.height);
    rs.ctx.closePath();
    rs.ctx.strokeStyle = "black";
    rs.ctx.lineWidth = 2;
    rs.ctx.stroke();
    rs.ctx.closePath();
    rs.ctx.fillStyle = "black";
    rs.ctx.fillText(rs.minZ.toFixed(3), rs.padding + 11, rs.height + 3);
  },
  
  drawMinorTicks: function() {
      var rs = this;
      var length = rs.maxZ - rs.minZ;
      while(length / rs.scalar > rs.maxTicks) {
          rs.scalar *= 10;
      }
      while(length / rs.scalar < rs.minTicks) {
          rs.scalar /= 10;
      }
      
      for(var i = Math.floor(rs.maxZ/rs.scalar) * rs.scalar; i > Math.floor(rs.minZ/rs.scalar)*rs.scalar; i -= rs.scalar) {
          var percent = (i - rs.minZ) / (rs.maxZ - rs.minZ);
          var tick = rs.height - (percent * (rs.height - rs.padding));
          rs.ctx.beginPath();
          rs.ctx.moveTo(rs.padding - 5, tick);
          rs.ctx.lineTo(rs.padding + 5, tick);
          rs.ctx.closePath();
          rs.ctx.strokeStyle = "black";
          rs.ctx.lineWidth = 1;
          rs.ctx.stroke();
          rs.ctx.closePath();
      }
  },
  
  mousemove: function(e) {

    var rs = this;
    var c = rs.canvas;

    rs.draw();

    e.stopPropagation();
    e.preventDefault();

    rs.mouseX = e.layerX;
    rs.mouseY = e.layerY;

    rs.mouseX = (e.targetTouches) ? e.targetTouches[0].layerX - c.offsetLeft : e.layerX - c.offsetLeft;
    rs.mouseY = (e.targetTouches) ? e.targetTouches[0].layerY - c.offsetTop : e.layerY - c.offsetTop;

    if (!rs.draggable) {
      rs.lastActual = rs.actual;
      rs.draw();
    }
    else {
      var cursorDistance = rs.getDistance(rs.padding, rs.currentPosition);
      var moveDistance = 0.04;
      
      if (cursorDistance <= 30) {
        rs.update(rs.mouseY);
        return;
      }
      else {
            if(rs.mouseY < rs.lastClickY && rs.checkSlideBoundaries(moveDistance, true)) {
                rs.maxZ -= moveDistance;
                rs.minZ -= moveDistance;
                rs.updatePosition();
            }
         else {
            if(rs.checkSlideBoundaries(moveDistance, false)) {
                rs.minZ += moveDistance;
                rs.maxZ += moveDistance;
                rs.updatePosition();
            }
         }
      }
     }
  },
  
  mousewheel: function(e) {
      var rs = this;
      var factor = e.wheelDelta;
      rs.handleZoom(factor);
      e.preventDefault();
      rs.updatePosition();
  },
  
  onmouseout: function(e) {
      var rs = this;
      rs.draggable = false;
      requestAnimationFrame(rs.draw.bind(rs));
  },
  
  onblur: function(e) {
      var rs = this;
      rs.draggable = false;
      requestAnimationFrame(rs.draw.bind(rs));
  },
  
  
  handleZoom: function(factor) {
      var rs = this;
      var zoomAmount = 0.1;
      if(factor > 0 && rs.checkZoomBoundaries(zoomAmount)) {
          rs.maxZ -= zoomAmount;
          rs.minZ += zoomAmount;
      }
      else if(factor < 0) {
          rs.maxZ += zoomAmount;
          rs.minZ -= zoomAmount;
      }
  },
  
  checkZoomBoundaries: function(amount) {
      var rs = this;
      if((rs.actual > rs.minZ + amount) && (rs.actual < rs.maxZ - amount)) return true;
      else return false;
  },
  
  checkSlideBoundaries: function(amount, max) {
      var rs = this;
      if(max) {
          if(rs.actual < rs.maxZ - amount) return true;
      }
      else {
          return rs.actual > rs.minZ + amount;
      }
  },
  
  getDistance: function(px, py) {
    var rs = this;
    var xs = 0;
    var ys = 0;
    xs = px - rs.mouseX;
    xs = xs * xs;
    ys = py - rs.mouseY;
    ys = ys * ys;
    return Math.sqrt(xs + ys);
  },
  
  setSnap: function(state) {
      var rs = this;
      rs.snap = state;
  },
  
  clearCanvas: function() {
    var rs = this;
    // Store the current transformation matrix
    rs.ctx.save();
    // Use the identity matrix while clearing the canvas
    rs.ctx.setTransform(1, 0, 0, 1, 0, 0);
    rs.ctx.clearRect(0, 0, this.cw, this.ch);
    // Restore the transform
    rs.ctx.restore();
  }
}

var rs = new rangeSlider(250, 100);