 function Grid(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.options = {};
    this.listeners = {};
    this.setOptions(options);

    this.scale = 100.0;
    this.offset = {
      x : 0,
      y : 0
    }
    this.dragging = false;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mousewheel', this.onMouseWheel.bind(this));

    this.draw();
  }

  Grid.prototype.setOptions = function(options) {
    options = options || {};

    this.gridMajor = options['gridMajor'] || this.options['gridMajor'] || 1.0;
    this.gridMinor = options['gridMinor'] || this.options['gridMinor'] || 0.25;
    this.gridMajorColor = options['gridMajorColor'] || this.options['gridMajorColor'] || '#3399ff';
    this.gridMinorColor = options['gridMinorColor'] || this.options['gridMinorColor'] || '#ccccff';
    this.originColor = options['originColor'] || this.options['originColor'] || 'red';
    this.currentLocationColor = options['currentLocationColor'] || this.options['currentLocationColor'] || 'green';
    this.targetLocationColor = options['targetLocationColor'] || this.options['targetLocationColor'] || 'red';
    this.actualWidth = options['width'] || this.options['width'] || 6.0;
    this.actualHeight = options['height'] || this.options['height'] || 8.0;
    this.scaleTextSize = options['scaleTextSize'] || this.options['scaleTextSize'] || 15;
    this.scaleTextFont = options['scaleTextFont'] || this.options['scaleTextFont'] || 'Monospace';

    this.minScale = 1;
    this.maxScale = 1000;
    for(key in options) {
      this.options[key] = options[key];
    }
    this.scaleTextFontString = this.scaleTextSize + 'px ' + this.scaleTextFont;
    this.currentLocation = null;
    this.targetLocation = null;
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
    console.log(this.getActualViewport());
  }

  Grid.prototype.onMouseMove = function(evt) {
    var mousePos = this.getMousePos(evt);
    if(this.mouseIsDown) {
      this.offset.x -= (this.lastPos.x - mousePos.x)/this.scale;
      this.offset.y += (this.lastPos.y - mousePos.y)/this.scale;
      this.draw();
    }
    this.lastPos = mousePos;
  }

  Grid.prototype.onMouseDown = function(evt) {
    this.mouseIsDown = true;
    this.lastPos = this.getMousePos(evt);
  }

  Grid.prototype.onMouseWheel = function(evt) {
    this.scale -= 0.1*evt.wheelDelta;
    this.scale = this.scale < this.minScale ? this.minScale : this.scale;
    this.scale = this.scale > this.maxScale ? this.maxScale : this.scale;

    this.draw();
    evt.preventDefault();
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
    this._clear();
    this._drawGrid();
    this._drawOrigin();
    this._drawScale();
  }

  Grid.prototype._getGridLocations = function() {
    var w = this.canvas.width;
    var h = this.canvas.height;
    viewport = this.getActualViewport();

    min_vertical_grid = Math.round(viewport.xmin/this.gridMajor)-1;
    max_vertical_grid = Math.round(viewport.xmax/this.gridMajor)+1;
    min_horizontal_grid = Math.round(viewport.ymin/this.gridMajor)-1;
    max_horizontal_grid = Math.round(viewport.ymax/this.gridMajor)+1;
    var hlines = max_horizontal_grid - min_horizontal_grid;
    var vlines = max_vertical_grid - min_vertical_grid;
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
      retval.va.push(min_vertical_grid + i*this.gridMajor);
      x+=this.gridMajor;
    }

    for(var i=0; i<hlines; i++) {
      var ys = y*this.scale;
      retval.h.push(h-ys);
      retval.ha.push(min_horizontal_grid + i*this.gridMajor);
      y+=this.gridMajor;
    }
    return retval;
  }

  Grid.prototype._drawGrid = function() {
    var w = this.canvas.width;
    var h = this.canvas.height;

    // Setup style
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.gridMajorColor;

    grid = this._getGridLocations();

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

  Grid.prototype._drawScale = function() {
    var w = this.canvas.width;
    var h = this.canvas.height;

    grid = this._getGridLocations();
    this.ctx.font = this.scaleTextFontString;
    grid = this._getGridLocations();

    // Draw horizontal grid labels along the left side
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle'
    grid.h.forEach(function(y, idx) {
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
      try{
      var txt = grid.va[idx].toFixed(2);        
      } catch(e) {
        console.log(grid)
      }
      m = this.ctx.measureText(txt);
      
      // Clear out underneath text
      this.ctx.clearRect(x-m.width/2.0,h-this.scaleTextSize,m.width, this.scaleTextSize);
      
      // Draw
      this.ctx.fillStyle = '#aaaaaa';      
      this.ctx.fillText(txt, x, h);
    }.bind(this));

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

