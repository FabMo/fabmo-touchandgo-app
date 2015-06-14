       function ToolDisplay(canvas, options) {
          this.canvas = canvas;
          this.ctx = canvas.getContext("2d");
          this.options = {};
          this.listeners = {};
          this.setOptions(options);
          canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
          canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
          this.draw();
        }

        ToolDisplay.prototype.setOptions = function(options) {
          options = options || {};

          this.gridMajor = options['gridMajor'] || this.options['gridMajor'] || 4.0;
          this.gridMinor = options['gridMinor'] || this.options['gridMinor'] || 0.5;
          this.gridMajorColor = options['gridMajorColor'] || this.options['gridMajorColor'] || '#99ccff';
          this.gridMinorColor = options['gridMinorColor'] || this.options['gridMinorColor'] || '#99ccff';
          this.currentLocationColor = options['currentLocationColor'] || this.options['currentLocationColor'] || 'green';
          this.targetLocationColor = options['targetLocationColor'] || this.options['targetLocationColor'] || 'red';
          this.actualWidth = options['width'] || this.options['width'] || 24.0;
          this.actualHeight = options['height'] || this.options['height'] || 18.0;
          for(key in options) {
            this.options[key] = options[key];
          }
          console.log(options);
          this.currentLocation = null;
          this.targetLocation = null;
        }

        ToolDisplay.prototype.emit = function(name, evt) {
          listeners = this.listeners[name];
          if(listeners) {
            for(i in listeners) {
              listener = listeners[i];
              listener(evt);
            }
          }
        }

        ToolDisplay.prototype.on = function(name, handler) {
          if(name in this.listeners) {
            this.listeners[name].push(handler);
          } else {
            this.listeners[name] = [handler];
          }
        }

        ToolDisplay.prototype.setCurrentLocation = function(x,y) {
          this.currentLocation = {
            'x' : x,
            'y' : y
          }
          this.draw();
        }

        ToolDisplay.prototype.setTargetLocation = function(x,y) {
          this.targetLocation = {
            'x' : x,
            'y' : y
          }
          this.draw();
        }

        ToolDisplay.prototype.onMouseMove = function(evt) {
          var mousePos = this.getMousePos(evt);
          //console.log(mousePos)
        }

        ToolDisplay.prototype.onMouseDown = function(evt) {
          var w = this.canvas.width;
          var h = this.canvas.height;
          var aw = this.actualWidth;
          var ah = this.actualHeight;

          scalex = aw/w;
          scaley = ah/h;

          var pos = this.getMousePos(evt);
          var apos = this.canvas2actual(pos);
          this.setTargetLocation(apos.x,apos.y);
          this.emit('click', apos);
        }

        ToolDisplay.prototype.getMousePos = function(evt) {
          var rect = this.canvas.getBoundingClientRect();
          return {
            x: (evt.clientX - rect.left),
            y: (evt.clientY - rect.top)
          };
        }

        ToolDisplay.prototype.canvas2actual = function(pos) {
          var w = this.canvas.width;
          var h = this.canvas.height;
          var aw = this.actualWidth;
          var ah = this.actualHeight;
          scalex = aw/w;
          scaley = ah/h;
          return {
            x : pos.x*scalex,
            y : ah - pos.y*scaley
          }
        }

        ToolDisplay.prototype.clear = function() {
          this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
        }

        ToolDisplay.prototype.draw = function() {
          this.clear();
          this.drawGrid();
          this.drawLocations();
        }

        ToolDisplay.prototype.drawGrid = function() {
          var w = this.canvas.width;
          var h = this.canvas.height;
          var aw = this.actualWidth;
          var ah = this.actualHeight;

          scalex = w/aw;
          scaley = h/ah;

          // Minor Grid (green)
          this.ctx.beginPath();
          this.ctx.strokeStyle=this.gridMinorColor;
          for(x=0; x<=aw; x+=this.gridMinor) {
            this.ctx.moveTo(x*scalex,0);
            this.ctx.lineTo(x*scalex,h);
          }
          for(y=ah; y>0; y-=this.gridMinor) {
            this.ctx.moveTo(0,y*scaley);
            this.ctx.lineTo(w,y*scaley);
          }
          this.ctx.stroke();
          
          this.ctx.beginPath();
          this.ctx.strokeStyle=this.gridMajorColor;
          for(x=0; x<=aw; x+=this.gridMajor) {
            this.ctx.moveTo(x*scalex,0);
            this.ctx.lineTo(x*scalex,h);
          }
          for(y=ah; y>0; y-=this.gridMajor) {
            this.ctx.moveTo(0,y*scaley);
            this.ctx.lineTo(w,y*scaley);
          }
          this.ctx.stroke();
        }

        ToolDisplay.prototype.drawLocations = function(x,y) {
          var w = this.canvas.width;
          var h = this.canvas.height;
          var aw = this.actualWidth;
          var ah = this.actualHeight;
          scalex = w/aw;
          scaley = h/ah;

          if(this.currentLocation) {
            cx = this.currentLocation.x*scalex;
            cy = this.canvas.height-this.currentLocation.y*scaley;
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.currentLocationColor
            this.ctx.arc(cx,cy,5,0,2*Math.PI);
            this.ctx.stroke();
          }

          if(this.targetLocation) {
            tx = this.targetLocation.x*scalex;
            ty = this.canvas.height-this.targetLocation.y*scaley;
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.targetLocationColor
            this.ctx.arc(tx,ty,10,0,2*Math.PI);
            this.ctx.stroke();
          }

        }
