var CLICK_DETECT_DIST = 5;
var TAP_DETECT_DIST = 10;

var EasingFunctions = {
  // no easing, no acceleration
  linear: function (t) { return t },
  // accelerating from zero velocity
  easeInQuad: function (t) { return t*t },
  // decelerating to zero velocity
  easeOutQuad: function (t) { return t*(2-t) },
  // acceleration until halfway, then deceleration
  easeInOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
  // accelerating from zero velocity 
  easeInCubic: function (t) { return t*t*t },
  // decelerating to zero velocity 
  easeOutCubic: function (t) { return (--t)*t*t+1 },
  // acceleration until halfway, then deceleration 
  easeInOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
  // accelerating from zero velocity 
  easeInQuart: function (t) { return t*t*t*t },
  // decelerating to zero velocity 
  easeOutQuart: function (t) { return 1-(--t)*t*t*t },
  // acceleration until halfway, then deceleration
  easeInOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
  // accelerating from zero velocity
  easeInQuint: function (t) { return t*t*t*t*t },
  // decelerating to zero velocity
  easeOutQuint: function (t) { return 1+(--t)*t*t*t*t },
  // acceleration until halfway, then deceleration 
  easeInOutQuint: function (t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t }
}

function closest (num, arr) {
    var curr = arr[0];
    var diff = Math.abs (num - curr);
    for (var val = 0; val < arr.length; val++) {
        var newdiff = Math.abs (num - arr[val]);
        if (newdiff < diff) {
            diff = newdiff;
            curr = arr[val];
        }
    }
    return curr;
}

function snap(num, multiple) {
  var ticks = Math.round(num/multiple);
  return ticks*multiple;
}

function snap2d(pos, multiple) {
  return {
    x : snap(pos.x, multiple),
    y : snap(pos.y, multiple)
  }
}

function dist(a,b) {
  return Math.sqrt((b.x-a.x)*(b.x-a.x) + (b.y-a.y)*(b.y-a.y))
}

function midpoint(a,b) {
  return {
    x: a.x + (b.x - a.x)/2.0,
    y: a.y + (b.y - a.y)/2.0
  }
}

 function Grid(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.options = {};
    this.listeners = {'snap' : [], 'click' : []};
    this.setOptions(options);
    this.lastPos = {
      x : 0,
      y : 0
    }
    this.scale = Math.max(this.canvas.width, this.canvas.height)/10.0;
    this.offset = {
      x : 1,
      y : 1
    }
    this.snapPos = {
      x : 0,
      y : 0
    }
    this.mouseDownPos = {
      x : 0,
      y : 0
    }
    this.extents = null;
    this.toolPos = null;
    this.dragging = false;
    this.pinch_dist = null;

    // Touch Events
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    
    // Mouse Events
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseout', this.onMouseOut.bind(this));
    canvas.addEventListener('mousewheel', this.onMouseWheel.bind(this));

    // Focus events
    canvas.addEventListener('blur', this.onBlur.bind(this));
    canvas.addEventListener('focus', this.onFocus.bind(this));

    requestAnimationFrame(this.draw.bind(this));
  }

  Grid.prototype.setOptions = function(options) {
    options = options || {};
    this.gridMajorColor = options['gridMajorColor'] || this.options['gridMajorColor'] || '#3399ff';
    this.gridMinorColor = options['gridMinorColor'] || this.options['gridMinorColor'] || '#ccccff';
    this.originColor = options['originColor'] || this.options['originColor'] || 'red';
    this.tableColor = options['tableColor'] || this.options['tableColor'] || 'white';
    this.currentLocationColor = options['currentLocationColor'] || this.options['currentLocationColor'] || 'green';
    this.targetLocationColor = options['targetLocationColor'] || this.options['targetLocationColor'] || 'red';
    this.actualWidth = options['width'] || this.options['width'] || 6.0;
    this.actualHeight = options['height'] || this.options['height'] || 8.0;
    this.scaleTextSize = options['scaleTextSize'] || this.options['scaleTextSize'] || 15;
    this.scaleTextFont = options['scaleTextFont'] || this.options['scaleTextFont'] || 'Monospace';
    this.scale = options['scale'] || this.options['scale'] || 100; // pixels per "real" unit
    this.units = options['units'] || this.options['units'] || 'in';
    this.unitMode = options['unitMode'] || this.options['unitMode'] || 'decimal';
    this.clearBehindScaleText = options['clearBehindScaleText'] || this.options['clearBehindScaleText'] || true;
    this.toolHeadRadius = options['toolHeadRadius'] || this.options['toolHeadRadius'] || 10;
    this.minScale = 10;
    this.maxScale = 10000;
    this.snap = false;

    for(key in options) {
      this.options[key] = options[key];
    }
    this.scaleTextFontString = this.scaleTextSize + 'px ' + this.scaleTextFont;
    this.currentLocation = null;
    this.targetLocation = null;
  }

  Grid.prototype.getBestGrid = function() {
    viewport = this.getActualViewport();
    vw = this.canvas.width;
    vh = this.canvas.height;
    aw = viewport.xmax - viewport.xmin;
    ah = viewport.ymax - viewport.ymin;

    var scales = [0.001, 0.01, 0.1, 1.0, 10.0, 100.0]

    var size = Math.max(aw,ah);
    prev_dist = 0xffffffff;
    var best_scale = 0.001;
    scales.forEach(function(scale) {
      var ticks = size/scale;
      var dist = Math.abs(ticks-5);
      if((dist < prev_dist)) {
        best_scale = scale;
      }
      prev_dist = dist;
    });

    var retval = {
      'major' : best_scale, 
      'minor' : best_scale/10.0
    };
    return retval;
  }

  Grid.prototype.emit = function(name, evt) {
    listeners = this.listeners[name];
    if(listeners) {
      for(i in listeners) {
        listener = listeners[i];
        listener(evt);
      }
    }
  }

  Grid.prototype.on = function(name, handler) {
    if(name in this.listeners) {
      this.listeners[name].push(handler);
    } else {
      this.listeners[name] = [handler];
    }
  }

  Grid.prototype.getActualViewport = function() {
    var xmin = -this.offset.x;
    var ymin = -this.offset.y;
    var xmax = xmin + this.canvas.width/this.scale;
    var ymax = ymin + this.canvas.height/this.scale;
    return {
      'xmin' : xmin,
      'xmax' : xmax,
      'ymin' : ymin,
      'ymax' : ymax
    }
  }

  Grid.prototype.onTouchStart = function(evt) {
    if(evt.touches.length == 1) {
      touch = evt.touches[0];
      pos = this.getTouchPos(touch);
      this.lastPos = pos;
      this.touchDownPos = pos;
      this.dragging = true;
    } else if(evt.touches.length == 2) {
      a = this.getTouchPos(evt.touches[0]);
      b = this.getTouchPos(evt.touches[1]);
    }
    evt.preventDefault();
    requestAnimationFrame(this.draw.bind(this));
  }


  Grid.prototype.onTouchMove = function(evt) {
    if(evt.touches.length === 1) {
      touch = evt.touches[0];
      pos = this.getTouchPos(touch);
      if(this.dragging) {
        this.handleDrag(pos)
      }
      this.lastPos = pos;
    } else if(evt.touches.length === 2) {
      a = this.getTouchPos(evt.touches[0]);
      b = this.getTouchPos(evt.touches[1]);
      c = dist(a,b);
      if(this.pinch_dist != null) {
        var factor = (1 + (c-this.pinch_dist)/250.0);
        this.handleScale(this.pinch_center, factor);
      }
      this.pinch_center = this.mouseToActual(midpoint(a,b));
      this.pinch_dist = c;
    }
    evt.preventDefault();
    requestAnimationFrame(this.draw.bind(this));
  }

  Grid.prototype.onTouchEnd = function(evt) {
    this.pinch_dist = null;
    this.pinch_center = null;

    if(evt.changedTouches.length === 1) {
      var touchPos = this.getTouchPos(evt.changedTouches[0]);
      if(this.touchDownPos, (dist(touchPos, this.touchDownPos) < TAP_DETECT_DIST)) {
          // may need to change the constant for touch operations
        if(dist(this.getToolPosition(), this.mouseToActual(touchPos)) < 0.3) {
          this.goto(this.getToolPosition(), 1000);
        }
        else {
        $.confirm({
            text: "Are you sure you want to move the reticule?",
            confirm: function() {
                event = {}
                event.pos = this.mouseToActual(touchPos);
                event.snapPos = snap2d(event.pos, this.grid.minor);
                this.emit('click', event);
        }.bind(this),
            cancel: function() {
                // nothing to do
            }
        });
        }
     }    
    } else if(evt.changedTouches.length === 2) {
    
    } else {

    }
    this.touchDownPos = null;
    this.dragging = false;
    evt.preventDefault();
    requestAnimationFrame(this.draw.bind(this));
  }

  Grid.prototype.onMouseDown = function(evt) {
    this.dragging = true;
    this.lastPos = this.getMousePos(evt);
    this.mouseDownPos = this.lastPos;
    evt.preventDefault();
  }

  Grid.prototype.onMouseMove = function(evt) {
    var mousePos = this.getMousePos(evt);
    if(this.dragging) {
      this.handleDrag(mousePos);
      this.snapPos = null;
    } else {
      this.snapPos = mousePos;
    }
    this.lastPos = mousePos;
    evt.preventDefault();
    requestAnimationFrame(this.draw.bind(this));
  }

  Grid.prototype.onMouseUp = function(evt) {
    var mousePos = this.getMousePos(evt);
    if(dist(mousePos, this.mouseDownPos) < CLICK_DETECT_DIST) {
      if(dist(this.getToolPosition(), this.mouseToActual(mousePos)) < 0.2) {
          this.goto(this.getToolPosition(), 1000);
      }
      else {
      $.confirm({
        text: "Are you sure you want to move the reticule?",
        confirm: function() {
            event = {}
            event.pos = this.mouseToActual(mousePos);
            event.snapPos = snap2d(event.pos, this.grid.minor);
            this.emit('click', event);
      }.bind(this),
        cancel: function() {
            // nothing to do
        }
      });
     }
    }
      this.dragging = false;
      this.snapPos = null;
      evt.preventDefault();
      requestAnimationFrame(this.draw.bind(this));
  }

  Grid.prototype.onMouseWheel = function(evt) {
    var factor = 1 + (evt.wheelDelta/5000.0);

    this.handleScale(this.mouseToActual(this.getMousePos(evt)), factor)
    evt.preventDefault();
    
    requestAnimationFrame(this.draw.bind(this));
  }

  Grid.prototype.handleScale = function(position, factor) {
    var last_scale = this.scale;
    var old_position = this.mouseToActual(this.lastPos);

    this.scale *= factor;
    this.scale = this.scale < this.minScale ? this.minScale : this.scale;
    this.scale = this.scale > this.maxScale ? this.maxScale : this.scale;

    var new_position = this.mouseToActual(this.lastPos);

    dx = new_position.x - old_position.x
    dy = new_position.y - old_position.y

    this.offset.x += dx;
    this.offset.y += dy;

  }

  Grid.prototype.onBlur = function(evt) {
    this.dragging = false;
    this.lastPos = null;
    requestAnimationFrame(this.draw.bind(this))
  }

  Grid.prototype.onFocus = function(evt) {}

  Grid.prototype.onMouseOut = function(evt) {
    this.dragging = false;
    this.lastPos = null;
    requestAnimationFrame(this.draw.bind(this))
  }

  Grid.prototype.getMousePos = function(evt) {
    var rect = this.canvas.getBoundingClientRect();
      return {
        x: (evt.clientX - rect.left),
        y: (evt.clientY - rect.top)
      };      
  }

  Grid.prototype.getTouchPos = function(touch) {
    var rect = this.canvas.getBoundingClientRect();
      return {
        x: (touch.clientX - rect.left),
        y: (touch.clientY - rect.top)
      };          
  }

  Grid.prototype.handleDrag = function(pos) {
    this.offset.x -= (this.lastPos.x - pos.x)/this.scale;
    this.offset.y += (this.lastPos.y - pos.y)/this.scale;
  }

  Grid.prototype._clear = function() {
    this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
  }

  Grid.prototype._okToDraw = function() {
    return !(this.canvas.width === 0 || this.canvas.height === 0);
  }

  Grid.prototype.draw = function() {
    if(!this._okToDraw()) { return; }
    if(this.scale === 0) { this.scale = 100; }
    this.grid = this.getBestGrid();
    this._clear();
    this._drawTable();
    if(this.snap) {
      this._drawSnap();      
    }
    this._drawGrid(this.grid.minor, this.gridMinorColor);
    this._drawGrid(this.grid.major, this.gridMajorColor);
    this._drawOrigin();
    this._drawToolHead();
    this._drawScale(this.grid.major);
  }

  Grid.prototype.mouseToActual = function(pos) {
    return {
      x : -this.offset.x + pos.x/this.scale,
      y : -this.offset.y + (this.canvas.height - pos.y)/this.scale
    }
  }

  Grid.prototype.actualToMouse = function(pos) {
    return {
      x : (pos.x + this.offset.x)*this.scale,
      y : this.canvas.height - (pos.y + this.offset.y)*this.scale
    }
  }

  Grid.prototype._getGridLocations = function(spacing) {
    var w = this.canvas.width;
    var h = this.canvas.height;

    viewport = this.getActualViewport();

    min_vertical_grid = snap(viewport.xmin,spacing)-spacing;
    max_vertical_grid = snap(viewport.xmax,spacing)+spacing;
    min_horizontal_grid = snap(viewport.ymin,spacing)-spacing;
    max_horizontal_grid = snap(viewport.ymax,spacing)+spacing;

    var hlines = (max_horizontal_grid - min_horizontal_grid)/spacing;
    var vlines = (max_vertical_grid - min_vertical_grid)/spacing;
    var x = (min_vertical_grid+this.offset.x);
    var y = (min_horizontal_grid+this.offset.y);

    retval = {
      h : [],
      v : [],
      ha : [],
      va : []
    }

    for(var i=0; i<vlines; i++) {
      var xs = Math.round(x*this.scale);
      xs -= 0.5//(xs%2)/2.0;
      retval.v.push(xs);
      retval.va.push(min_vertical_grid + i*spacing);
      x+=spacing;
    }

    for(var i=0; i<hlines; i++) {
      var ys = Math.round(h-y*this.scale);
      ys -= 0.5//(ys%2)/2.0;
      retval.h.push(ys);
      retval.ha.push(min_horizontal_grid + i*spacing);
      y+=spacing;
    }
    return retval;
  }

  Grid.prototype._drawGrid = function(spacing, color) {
    var w = this.canvas.width;
    var h = this.canvas.height;

    // Setup style
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;

    grid = this._getGridLocations(spacing);

    grid.h.forEach(function(y) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
    }.bind(this));

    grid.v.forEach(function(x) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
    }.bind(this));

    //Commit
    this.ctx.stroke();

  }

  Grid.prototype._drawSnap = function() {
    if(!this.snapPos) {
      return;
    }
    var pos = this.mouseToActual(this.snapPos);
    var spos = snap2d(pos, this.grid.minor);
    if(spos.x != this.snapPos.x || spos.y != this.snapPos.y) {
      this.emit('snap', spos);
    }
    this.snapPos = spos;
    var dpos = this.actualToMouse(spos);
    var radius = 3;
    this.ctx.beginPath();
    this.ctx.arc(dpos.x, dpos.y, radius, 0, 2 * Math.PI, false);
    this.ctx.fillStyle = this.gridMinorColor;
    this.ctx.fill();
  }

  Grid.prototype.setSnap = function(onoff) {
    this.snap = onoff;
  }

  Grid.prototype._drawScale = function(spacing) {
    var w = this.canvas.width;
    var h = this.canvas.height;

    grid = this._getGridLocations(spacing);
    this.ctx.font = this.scaleTextFontString;

    if(spacing < 0.001) {
      digits = 4;
    } else if(spacing < 0.01) {
      digits = 3;
    } else if(spacing < 0.1) {
      digits = 2;
    } else if(spacing < 10) {
      digits = 1;
    } else {
      digits = 0;
    }

    // Draw horizontal grid labels along the left side
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle'
    grid.h.forEach(function(y, idx) {

      if(y > (h-this.scaleTextSize*2)) {
        return
      }
      // Create scale text
      var txt = grid.ha[idx].toFixed(digits);
      
      // Measure
      m = this.ctx.measureText(txt);

      // Clear area underneath text
      if(this.clearBehindScaleText) {
        this.ctx.fillStyle = 'rgba(255,255,255, 0.5)'
        this.ctx.fillRect(0,y-this.scaleTextSize/2.0, m.width, this.scaleTextSize);
      }

      // Draw
      this.ctx.fillStyle = '#aaaaaa';      
      this.ctx.fillText(txt, 0, y);
    
    }.bind(this));

    // Draw horizontal grid labels along the bottom
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom'
    grid.v.forEach(function(x, idx) {


    var txt = grid.va[idx].toFixed(digits);        

    m = this.ctx.measureText(txt);

    if(x < m.width*2) {
      return
    }
    
    // Clear area underneath text
    if(this.clearBehindScaleText) {
      this.ctx.fillStyle = 'rgba(255,255,255, 0.5)'
      this.ctx.fillRect(x-m.width/2.0,h-this.scaleTextSize,m.width, this.scaleTextSize);
    }

    
    // Draw
    this.ctx.fillStyle = '#aaaaaa';      
    this.ctx.fillText(txt, x, h);

    }.bind(this));

  }

  Grid.prototype.goto = function(pos, duration, easing_function) {
    canvas_w = this.canvas.width/this.scale;
    canvas_h = this.canvas.height/this.scale;

    if(!duration) {
      this.offset.x = pos.x+0.5*canvas_w;
      this.offset.y = pos.y+0.5*canvas_h;
      requestAnimationFrame(this.draw.bind(this));
      return;
    }

    var EasingFunction = easing_function || EasingFunctions.easeInOutCubic;
    
    var t0 = new Date().getTime();
    var tf = t0 + duration;
    var x0 = this.offset.x;
    var y0 = this.offset.y;
    var xf = -pos.x+0.5*canvas_w;
    var yf = -pos.y+0.5*canvas_h;
    var dx = xf - x0;
    var dy = yf - y0;

    function animate() {
      t = new Date().getTime();
      ts = (t - t0) / duration;
      x = x0 + dx*EasingFunction(ts);
      y = y0 + dy*EasingFunction(ts);
      if(ts >= 1.0) {
        this.offset.x = xf;
        this.offset.y = yf;
      } else {
        this.offset.x = x;
        this.offset.y = y;
        this.draw();
        requestAnimationFrame(animate.bind(this));
      }
    }
    requestAnimationFrame(animate.bind(this));
  }

  Grid.prototype.gotoExtents = function(duration, easing_function) {
    if(this.extents) {
      width = this.extents.xmax - this.extents.xmin;
      height = this.extents.ymax - this.extents.ymin;
      pad = 0.1*Math.max(width, height);
      a = { x : this.extents.xmin - pad, y : this.extents.ymin - pad };
      b = { x : this.extents.xmax + pad, y : this.extents.ymax + pad };
      return this.gotoArea(a, b, duration, easing_function);
    }
  }

  Grid.prototype.gotoArea = function(a, b, duration, easing_function) {
    //var canvas_w = this.canvas.width/this.scale;
    //var canvas_h = this.canvas.height/this.scale;

    var xmin = Math.min(a.x, b.x);
    var ymin = Math.min(a.y, b.y);
    var xmax = Math.max(a.x, b.x);
    var ymax = Math.max(a.y, b.y);

    var center = {}
    center.x = xmin + ((xmax - xmin)/2.0);
    center.y = ymin + ((ymax - ymin)/2.0);
    var scalex = this.canvas.width/(xmax-xmin);
    var scaley = this.canvas.height/(ymax-ymin);

    var new_scale = Math.min(scalex,scaley);

    if(!duration) {
      this.offset.x = -center.x+0.5*this.canvas.width/new_scale;
      this.offset.y = -center.y+0.5*this.canvas.height/new_scale;
      this.scale = new_scale;
      requestAnimationFrame(this.draw.bind(this));
      return;
    }

    var EasingFunction = easing_function || EasingFunctions.easeInOutCubic;
    
    // Time
    var t0 = new Date().getTime();
    var tf = t0 + duration;

    // Tweening for scale
    var s0 = this.scale;
    var sf = new_scale;
    var ds = sf - s0;

    // Tweening for position
    var x0 = this.offset.x;
    var y0 = this.offset.y;
    var xf = -center.x+0.5*this.canvas.width/new_scale;
    var yf = -center.y+0.5*this.canvas.height/new_scale;
    var dx = xf - x0;
    var dy = yf - y0;

    function animate() {
      var t = new Date().getTime();
      var ts = (t - t0) / duration;

      var x = x0 + dx*EasingFunction(ts);
      var y = y0 + dy*EasingFunction(ts);
      var scale = s0 + ds*EasingFunction(ts);
      
      if(ts >= 1.0) {
        this.offset.x = xf;
        this.offset.y = yf;
        this.scale = scale;
      } else {
        this.offset.x = x;
        this.offset.y = y;
        this.scale = scale;
        this.draw();
        requestAnimationFrame(animate.bind(this));
      }
    }
    requestAnimationFrame(animate.bind(this));
    
  }

  Grid.prototype._drawOrigin = function() {
    var w = this.canvas.width;
    var h = this.canvas.height;

    // Setup style
    this.ctx.beginPath();
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = this.originColor;

    // Vertical
    x0 = Math.round(this.scale*this.offset.x);
    x0 -= 0.5//(x0 % 2)/2.0;

    this.ctx.moveTo(x0, 0);
    this.ctx.lineTo(x0, h);

    // Horizontal
    y0 = Math.round(h-(this.scale*this.offset.y));
    y0 -= 0.5//(y0 % 2)/2.0;
    this.ctx.moveTo(0, y0);
    this.ctx.lineTo(w, y0);

    // Commit!
    this.ctx.stroke();

  }

  Grid.prototype._drawToolHead = function() {
    var ctx = this.ctx;
    if(this.toolPos != null) {
      center = this.actualToMouse(this.toolPos);
      ctx.beginPath();
      
      // Circle
      ctx.arc(center.x, center.y, this.toolHeadRadius, 0, 2*Math.PI, false);
      ctx.fillStyle = 'rgba(0,255,0,0.5)';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crosshair
      ctx.moveTo(center.x - this.toolHeadRadius*1.5, center.y);
      ctx.lineTo(center.x + this.toolHeadRadius*1.5, center.y);
      ctx.moveTo(center.x , center.y - this.toolHeadRadius*1.5);
      ctx.lineTo(center.x , center.y + this.toolHeadRadius*1.5);
      ctx.stroke();
    }
  }

  Grid.prototype._drawTable = function() {
    var ctx = this.ctx;

    if(this.extents == null) { return; }

    a = this.actualToMouse(snap2d({x : this.extents.xmin, y : this.extents.ymin},this.grid.minor));
    b = this.actualToMouse(snap2d({x : this.extents.xmax, y : this.extents.ymax},this.grid.minor));

    width = b.x-a.x;
    height = b.y-a.y;
    ctx.fillStyle = this.tableColor;
    ctx.fillRect(a.x, a.y, width, height);

    ctx.lineWidth = 3;
    ctx.strokeStyle = this.gridMinorColor;
    ctx.strokeRect(a.x, a.y, width, height);
  }

  Grid.prototype.getToolPosition = function() {
    return this.toolPos;
  }

  Grid.prototype.setToolPosition = function(x,y) {
    this.toolPos = {'x' : x, 'y' : y};
    requestAnimationFrame(this.draw.bind(this));
  }

  Grid.prototype.setExtents = function(extents) {
    this.extents = extents || null;
  }

  Grid.prototype.clearExtents = function() {
    this.extents = null;
  }
