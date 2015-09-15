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

 function Grid(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.options = {};
    this.listeners = {'snap' : []};
    this.setOptions(options);
    this.lastPos = {
      x : 0,
      y : 0
    }
    this.scale = 100.0;
    this.offset = {
      x : 0,
      y : 0
    }
    this.snapPos = {
      x : 0,
      y : 0
    }
    this.dragging = false;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mousewheel', this.onMouseWheel.bind(this));
    canvas.addEventListener('blur', this.onBlur.bind(this));

    this.draw();
  }

  Grid.prototype.setOptions = function(options) {
    options = options || {};
    this.gridMajorColor = options['gridMajorColor'] || this.options['gridMajorColor'] || '#3399ff';
    this.gridMinorColor = options['gridMinorColor'] || this.options['gridMinorColor'] || '#ccccff';
    this.originColor = options['originColor'] || this.options['originColor'] || 'red';
    this.currentLocationColor = options['currentLocationColor'] || this.options['currentLocationColor'] || 'green';
    this.targetLocationColor = options['targetLocationColor'] || this.options['targetLocationColor'] || 'red';
    this.actualWidth = options['width'] || this.options['width'] || 6.0;
    this.actualHeight = options['height'] || this.options['height'] || 8.0;
    this.scaleTextSize = options['scaleTextSize'] || this.options['scaleTextSize'] || 15;
    this.scaleTextFont = options['scaleTextFont'] || this.options['scaleTextFont'] || 'Monospace';
    this.scale = options['scale'] || this.options['scale'] || 100; // pixels per "real" unit
    this.units = options['units'] || this.options['units'] || 'in';
    this.unitMode = options['unitMode'] || this.options['unitMode'] || 'decimal';
    this.minScale = 1;
    this.maxScale = 1000;
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

  Grid.prototype.onMouseUp = function(evt) {
    var mousePos = this.getMousePos(evt);
    this.draw();
    this.mouseIsDown = false;
  }

  Grid.prototype.onMouseMove = function(evt) {
    var mousePos = this.getMousePos(evt);
    if(this.mouseIsDown) {
      this.offset.x -= (this.lastPos.x - mousePos.x)/this.scale;
      this.offset.y += (this.lastPos.y - mousePos.y)/this.scale;
    }
    this.draw();
    this.lastPos = mousePos;
  }

  Grid.prototype.onMouseDown = function(evt) {
    this.mouseIsDown = true;
    this.lastPos = this.getMousePos(evt);
  }

  Grid.prototype.onMouseWheel = function(evt) {
    var last_scale = this.scale;
    var old_position = this.mouseToActual(this.lastPos);

    //this.scale -= 0.005*evt.wheelDelta;
    s = evt.wheelDelta/5000.0;
    this.scale *= (1+s)
    this.scale = this.scale < this.minScale ? this.minScale : this.scale;
    this.scale = this.scale > this.maxScale ? this.maxScale : this.scale;

    var new_position = this.mouseToActual(this.lastPos);

    dx = new_position.x - old_position.x
    dy = new_position.y - old_position.y

    this.offset.x += dx;
    this.offset.y += dy;
    this.draw();
    evt.preventDefault();
  }

  Grid.prototype.onBlur = function(evt) {
    this.mouseIsDown = false;
  }

  Grid.prototype.getMousePos = function(evt) {
    var rect = this.canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left),
      y: (evt.clientY - rect.top)
    };
  }

  Grid.prototype._clear = function() {
    this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
  }

  Grid.prototype.draw = function() {
    this.grid = this.getBestGrid();
    this._clear();
    if(this.snap) {
      this._drawSnap();      
    }
    this._drawGrid(this.grid.minor, this.gridMinorColor);
    this._drawGrid(this.grid.major, this.gridMajorColor);
    this._drawOrigin();
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
      var xs = x*this.scale;
      retval.v.push(xs);
      retval.va.push(min_vertical_grid + i*spacing);
      x+=spacing;
    }

    for(var i=0; i<hlines; i++) {
      var ys = y*this.scale;
      retval.h.push(h-ys);
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
    var pos = this.mouseToActual(this.lastPos);
    var spos = snap2d(pos, this.grid.minor);
    if(spos.x != this.snapPos.x || spos.y != this.snapPos.y) {
      this.emit('snap', spos);
    }
    this.snapPos = spos;
    var dpos = this.actualToMouse(spos);
    var radius = 5;
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

    // Draw horizontal grid labels along the left side
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle'
    grid.h.forEach(function(y, idx) {

      if(y > (h-this.scaleTextSize*2)) {
        return
      }
      // Create scale text
      var txt = grid.ha[idx].toFixed(2);
      
      // Measure
      m = this.ctx.measureText(txt);

      // Clear area underneath text
      this.ctx.clearRect(0,y-this.scaleTextSize/2.0, m.width, this.scaleTextSize);
      
      // Draw
      this.ctx.fillStyle = '#aaaaaa';      
      this.ctx.fillText(txt, 0, y);
    
    }.bind(this));

    // Draw horizontal grid labels along the bottom
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom'
    grid.v.forEach(function(x, idx) {


    var txt = grid.va[idx].toFixed(2);        

    m = this.ctx.measureText(txt);

    if(x < m.width*2) {
      return
    }
    
    // Clear out underneath text
    this.ctx.clearRect(x-m.width/2.0,h-this.scaleTextSize,m.width, this.scaleTextSize);
    
    // Draw
    this.ctx.fillStyle = '#aaaaaa';      
    this.ctx.fillText(txt, x, h);

    }.bind(this));

  }

  Grid.prototype.goto = function(pos, time) {
    var time = time;
    var step = Math.max(time/1000, 1000/60.0);
    function move() {
      time -= step;
      this.offset.x += 0.01;
      this.offset.y += 0.02;
      this.draw();
      if(time > 0) {
        setTimeout(move.bind(this), step);
      }
    }
    move.bind(this)();
  }

  Grid.prototype._drawOrigin = function() {
    var w = this.canvas.width;
    var h = this.canvas.height;

    // Setup style
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.originColor;

    // Vertical
    this.ctx.moveTo(this.scale*this.offset.x, 0);
    this.ctx.lineTo(this.scale*this.offset.x, h);

    // Horizontal
    this.ctx.moveTo(0, h-(this.scale*this.offset.y));
    this.ctx.lineTo(w, h-(this.scale*this.offset.y));

    // Commit!
    this.ctx.stroke();

  }

