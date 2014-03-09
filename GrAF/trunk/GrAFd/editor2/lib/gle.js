/**
 * gle.js (c) 2013 by Christian Mayer [CometVisu at ChristianMayer dot de]
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 3 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA
 * 
 * @module GLE
 * @title  GrAF logic engine: graphical logic editor
 */

// create a local context:
(function( window, undefined ) {
  "use strict";
  
  // private variables:
  var mousemove = 'mousemove', // will be redefined on a touch device
      mouseup   = 'mouseup',
      /*width,               // size of the draw area
      height,*/
      contentSize = new Vec2D( 0, 0 ), // maximum needed size of the content
      scale         = 1,   // overall scale / zoom level
      scaleFactor   = Math.pow(2,1/3),
      $canvasContainer,    // jQ object containing the canvases and the scroll bars
      elementList = [[]],  // array of elements to draw, first element has to be empty as it corresponds to the background
      clickTimestamp = 0,  // used to check for double click
      activeElements = [], // The active elements, i.e. the one on the Fg
      focusElements = [],  // The focused elements, i.e. the user selected ones
 
      /**
       * Get the mouse coordinates out of the jQ.Event relative to the canvas.
       * (Note: this is a little self modifying code to handle browsers like
       * firefox that don't offer offsetX)
       * @return Vec2D
       */
      getMousePos = function( eventObject ) {
        if( (eventObject.offsetX === undefined && eventObject.originalEvent.offsetX === undefined) ||
            (eventObject.offsetY === undefined && eventObject.originalEvent.offsetY === undefined) )
        {
          if( eventObject.originalEvent.touches !== undefined )
          { // a touch device
            mousemove = 'touchmove';
            mouseup   = 'touchend';
            getMousePos = function( eventObject ) {
              var cC  = $canvasContainer[0],
                  touch = eventObject.originalEvent.touches[0],
                  targetOffset = $canvasContainer.offset(),
                  ret = new Vec2D( touch.pageX - targetOffset.left + cC.scrollLeft,
                                   touch.pageY - targetOffset.top  + cC.scrollTop);
              return ret.scale( 1.0 / scale ).round( 1 );
            };
          } else {
            getMousePos = function( eventObject ) {
              var cC  = $canvasContainer[0],
                  targetOffset = $canvasContainer.offset(),
                  ret = new Vec2D( (eventObject.pageX||eventObject.originalEvent.pageX) - targetOffset.left + cC.scrollLeft,
                                   (eventObject.pageY||eventObject.originalEvent.pageY) - targetOffset.top  + cC.scrollTop);
              return ret.scale( 1.0 / scale ).round( 1 );
            };
          }
        } else {
          getMousePos = function( eventObject ) {
            var cC  = $canvasContainer[0],
                ret = new Vec2D( (eventObject.offsetX||eventObject.originalEvent.offsetX) + cC.scrollLeft, 
                                 (eventObject.offsetY||eventObject.originalEvent.offsetY) + cC.scrollTop );
            return ret.scale( 1.0 / scale ).round( 1 );
          }
        }
        
        return getMousePos( eventObject );
      },
      /**
       * The GLE constructor
       */
      GLE = function( passedCanvasContainer ) {
        // private:
        var self = this, 
            blocks = [],  // array of all existent blocks
            view,
            lastPos,      // the beginning coordinates of a mouse drag
            prevPos;      // the coordinates of the previous call to mousemove
        
        /**
         * Get the user tuneable settings.
         */
        this.settings = new window._GLE.settings();
        
        /**
         * Make view visible to the outside. - FIXME DEBUG
         */
        this.view           = function(){ return view;           };
        this.activeElements = function(){ return activeElements; };
        this.focusElements  = function(){ return focusElements;  };
        this.blocks = blocks; // FIXME only for transision
        
        /**
         * Create and register a new block.
         */
        this.addBlock = function() {
          var thisBlock = new _GLE.block( self );
          blocks.push( thisBlock );
          view.invalidateContext();
          return thisBlock;
        }
        
        /**
         * Create and register a new connection.
         */
        this.addConnection = function( parameters ) {
          var thisConnection = new _GLE.Connection( self, parameters );
          blocks.push( thisConnection );
          view.invalidateContext();
          return thisConnection;
        }
        
        /**
         * Get a new unique name depending on the given name
         */
        this.getNextName = function( name )
        {
          var splitName = /(.*[^0-9])([0-9]*)$/.exec( name ),
              startName = splitName[1],
              newNumber = +splitName[2]+1,
              newName   = startName + newNumber,
              allName   = blocks.map( function(thisBlock){ return thisBlock.getName(); } );
              
          while( allName.indexOf( newName ) != -1 )
            newName = startName + ++newNumber;
          
          return newName;
        };
        
        /**
         * Register a handler.
         * @param handler Object
         * @param data    Object
         * @return ID
         */
        this.registerHandler = function( handler, data ) {
          elementList.push( [ handler, data ] );
          return (elementList.length - 1) | 0;
        };
        this.unregisterHandler = function( id ) {
          //console.log( 'unregisterHandler', id, elementList );
        };
        /**
         * Mark all handlers invalid and force a reregistration.
         */
        this.invalidateHandlers = function()
        {
          elementList = [[]]; // empty list first
          blocks.forEach( function( thisBlock, b ) {
            thisBlock.reregisterHandlers();
          } );
          view.invalidateContext();
        }
        
        this.invalidateContext = function(){
          // FIXME do that only when really required...:
          self.updateContentSize();
          
          view.invalidateContext();
        }
        this.invalidateForeground = function(){
          view.invalidateForeground();
        }
        
        /**
        * Return true if the @parm mousePos doesn't belong to this handler
        */
        this.checkHandlerBadSelection = function( mousePos, handlerPos ) {
          var halfSize = this.settings.toleranceHandle;
          console.log( 'checkHandlerBadSelection', mousePos.print(), handlerPos.print(), (handlerPos.x-halfSize) > mousePos.x ||
                 (handlerPos.y-halfSize) > mousePos.y || 
                 (handlerPos.x+halfSize) < mousePos.x ||
                 (handlerPos.y+halfSize) < mousePos.y );
          return (handlerPos.x-halfSize) > mousePos.x ||
                 (handlerPos.y-halfSize) > mousePos.y || 
                 (handlerPos.x+halfSize) < mousePos.x ||
                 (handlerPos.y+halfSize) < mousePos.y;
        };
        
        /**
         * Do a full search for maximum content size
         */
        this.updateContentSize = function()
        {
          // grow or shrink canvas depending on content size
          var contentSizeNew = new Vec2D( 0, 0 );
          blocks.forEach( function( thisBlock ) {
            contentSizeNew.cmax( thisBlock.getBottomRight() );
          } );
          contentSizeNew.plus( new Vec2D( self.settings.borderWidth,
                                          self.settings.borderWidth ) );
          if( !contentSize.equal( contentSizeNew ) )
          {
            contentSize = contentSizeNew;
            view.resizeSpace( contentSize );
          }
        }
        
        this.zoomIn = function()
        {
          scale *= scaleFactor;
          self.setZoom( Math.pow( scaleFactor, Math.round( 10*Math.log( scale )/Math.log( scaleFactor ) ) / 10 ) );
        };
        this.zoomOut = function()
        {
          scale /= scaleFactor;
          self.setZoom( Math.pow( scaleFactor, Math.round( 10*Math.log( scale )/Math.log( scaleFactor ) ) / 10 ) );
        };
        this.zoomDefault = function()
        {
          self.setZoom( 1.0 );
        };
        
        /**
         * Set the zoom level
         */
        this.setZoom = function( newScale, centerCoord )
        {
          var oldScale  = scale,
              oldScroll = new Vec2D( $canvasContainer.scrollLeft(), $canvasContainer.scrollTop() ),
              //mouseRelOld    = (undefined !== centerCoord) ? centerCoord.copy().scale( 1+0*oldScale / scaleInternal ).cdiv([$canvasBg[0].width/scaleInternal,$canvasBg[0].height/scaleInternal]) : undefined,
//              mouseRelOld    = (undefined !== centerCoord) ? centerCoord.copy().scale( scaleInternal / oldScale ).cdiv([$canvasBg[0].width,$canvasBg[0].height]) : undefined,
              mouseScreenOld = (undefined !== centerCoord) ? centerCoord.copy().scale( oldScale ) : undefined;
          
          if( undefined === centerCoord ) centerCoord = new Vec2D( 0, 0 );
            console.log( 
                         'centerCoord', centerCoord.print(2), 
                         'wrel', centerCoord.copy().scale( oldScale ).print(2)
                         //'cdiv', [$canvasBg[0].width/scaleInternal,$canvasBg[0].height/scaleInternal]
                         //'mouseRelOld', mouseRelOld.print() 
                       );
          scale = newScale;
          if( scale < self.settings.minScale ) 
            scale = self.settings.minScale;
          else if( scale > self.settings.maxScale ) 
            scale = self.settings.maxScale;
          $('#zoom').text( Math.round(scale * 100) + '% (scale: ' + scale + ' / scaleInternal: ' + 'n/a' + ')' );
          
          //$canvasBg[0].style['-webkit-transform'] = 'scale3d(' + scale + ',' + scale + ',1)';
          //$canvasBg[0].style['-webkit-transform'] = 'matrix3d(' + scale + ',0,0,0,0,' + scale + ',0,0,0,0,1,0,0,0,0,1)';
          
          view.zoomView( scale, centerCoord );
        }
        
        this.mousedown = function( eventObject ) {
          eventObject.preventDefault();
          
          // check for double click
          if( eventObject.timeStamp - clickTimestamp < 200 )
          {
            self.zoomDefault();
            return;
          }
          clickTimestamp = eventObject.timeStamp;
          
          // check for pinch
          if( eventObject.originalEvent.touches !== undefined && 
              eventObject.originalEvent.touches.length === 2 )
          {
            var start  = eventObject.originalEvent.touches,
                length = Math.max( 1.0, Math.sqrt(
                           (new Vec2D( start[0].clientX, start[0].clientY ))
                           .minus(new Vec2D( start[1].clientX, start[1].clientY ))
                           .getNorm() 
                         ) ), // distance between the fingers - at least 1.0
                data   = { length: length, scale: scale };
                
            // add event listeners
            $(document).on( 'touchmove', data, window.GLE.pinchmove ); 
            $(document).on( 'touchup',   data, window.GLE.pinchup   ); 
            return;
          }
          
          lastPos = getMousePos( eventObject );
          prevPos = lastPos;
          // ---------------
          view.showMarker( lastPos );
          // ---------------
          
          
          var index = view.position2id( lastPos ),
              activeElement = index < elementList.length ? elementList[ index ][0] : undefined;
              
          //lastPos.cmul( [1/scale, 1/scale] );
          $('#coords').text( lastPos.print() + ':' + index + ' (' + scale + ')' );
          if( undefined !== activeElement ) console.log( lastPos, 'Result:', activeElement.checkBadSelection( lastPos, elementList[ index ][1],  2, scale ), lastPos.print(), index );
 
 
          if( 0 === index || undefined === activeElement || activeElement.checkBadSelection( lastPos, elementList[ index ][1], 2, scale ) )
          {
            var redraw = activeElements.length > 0;
            activeElements.length = 0;
            focusElements.length = 0;
            
            if( redraw )
              view.invalidateContext();
            
            return; // no object found
          }
          
          var newIndex = activeElement.prepareUpdate( elementList[ index ][1], index, lastPos, eventObject.ctrlKey, eventObject.shiftKey );
          console.log( 'down', index, newIndex, activeElement, elementList[ index ][1], eventObject );
          index = newIndex;
          activeElement = elementList[ index ][0]; // if index was changed...
          
          // move activeElement to the end of the array to draw it on the top
          blocks = blocks.filter( function( thisBlock ){
            return thisBlock != activeElement;
          });
          blocks.push( activeElement );
          console.log( 'da', activeElement.getDerivedActive() );
          activeElements = activeElement.getDerivedActive();
          activeElements.push( activeElement );
          focusElements = [ activeElement ];
          console.log( 'activeElement', activeElement, 'activeElements', activeElements, 'self.activeElements', self.activeElements, 'focusElements', focusElements );
          
          view.invalidateContext();
          
          // add event listeners
          $(document).on( mousemove, index, window.GLE.mousemove ); 
          $(document).on( mouseup,   index, window.GLE.mouseup   ); 
        };
        
        this.mousemove = function( eventObject ) {
          eventObject.preventDefault();
          //console.time("my mousemove"); // DEBUG
          var index         = eventObject.data,
              thisElem      = elementList[ index ],
              thisPos       = getMousePos( eventObject ),
              shortDeltaPos = thisPos.copy().minus( prevPos ),
              lowerIndex    = view.position2id( thisPos ),
              lowerElement  = elementList[lowerIndex];
          
          if( (!lowerElement) ||
              (lowerElement.length && lowerElement[0].checkBadSelection( thisPos, lowerElement[1], 2, scale ) ) )
            lowerElement = [];
          
          var newIndex = (thisElem[0]).update( thisElem[1], thisPos, shortDeltaPos, lowerElement, eventObject.shiftKey );
          ////console.log( index, newIndex );
          // check if the handler might have been changed during the update
          if( newIndex !== undefined && newIndex !== index )
          {
            $(document).off( mousemove, window.GLE.mousemove ); 
            $(document).off( mouseup  , window.GLE.mouseup   ); 
            $(document).on ( mousemove, newIndex, window.GLE.mousemove ); 
            $(document).on ( mouseup  , newIndex, window.GLE.mouseup   ); 
          }
          
          //console.timeEnd("my mousemove"); // DEBUG
          // necessary? Causes currently double redraws...
          view.invalidateForeground(); // redraw to fix Id map
          
          prevPos = thisPos;
        };
        /*
        this.blob = function() { 
          ctxBg.save();
          ctxBg.setTransform( 1, 0, 0, 1, 0.5, 0.5 );
          ctxBg.drawImage( idBuffer, 0, 0 ); console.log(elementList);
          ctxBg.restore();
          var msg = { source: new Vec2D(10,10), target: new Vec2D(400,400), blocked: [] };
          blocks.forEach( function( thisBlock ) {
            if( thisBlock instanceof _GLE.block )
            {
              var pos  = thisBlock.getTopLeft(),
                  size = thisBlock.getSize();
              msg.blocked.push( { type: 'block', x: pos.x, y: pos.y, w: size.x, h: size.y, pos: pos, size: size } );
            } else if( thisBlock instanceof _GLE.Connection )
            {
              msg.blocked.push( { type: 'connection', waypoints: thisBlock.waypoints } );
            }
          } );
          msg.img = ctxBg.getImageData( 0, 0, width, height );
          myWorker.postMessage( msg );
          return msg;
          return blocks;
        };
        */
        this.mouseup = function( eventObject ) {
          eventObject.preventDefault();
          /*
          var deltaX = eventObject.offsetX - lastX,
              deltaY = eventObject.offsetY - lastY;
          */
          var index         = eventObject.data,
              thisElem      = elementList[ index ];
          (thisElem[0]).finishUpdate( thisElem[1] );
          
          self.updateContentSize(); // e.g. the boundary has to be updated
          view.invalidateContext(); // redraw to fix Id map
          
          // remove the liseteners again
          $(document).off( mousemove, window.GLE.mousemove ); 
          $(document).off( mouseup,   window.GLE.mouseup   ); 
          
          //var index = position2id( eventObject.offsetX, eventObject.offsetY );
          //console.log( 'up', [deltaX, deltaY], [lastX, '->', eventObject.offsetX], [lastY, '->', eventObject.offsetY], ':', index, eventObject.data );
        };
        
        this.pinchmove = function( eventObject ) {
          eventObject.preventDefault();
          if( eventObject.originalEvent.touches !== undefined && 
              eventObject.originalEvent.touches.length === 2 )
          {
            var end   = eventObject.originalEvent.touches,
                length = Math.sqrt(
                           (new Vec2D( end[0].clientX, end[0].clientY ))
                           .minus(new Vec2D( end[1].clientX, end[1].clientY ))
                           .getNorm() 
                         ),
                pinchScale = length / eventObject.data.length;
            
            self.setZoom( eventObject.data.scale * pinchScale );
          } else { // probably lost a finger
            // remove the liseteners again
            $(document).off( 'touchmove', window.GLE.pinchmove ); 
            $(document).off( 'touchup',   window.GLE.pinchup   ); 
          }
          clickTimestamp = 0; // make robust by preventing a too fast dblClick
        };
        
        this.pinchup = function( eventObject ) {
          eventObject.preventDefault();
          
          // remove the liseteners again
          $(document).off( 'touchmove', window.GLE.pinchmove ); 
          $(document).off( 'touchup',   window.GLE.pinchup   ); 
        };
        
        this.keyPress = function( eventObject ) {
          // early exit to keep default
          switch( eventObject.keyCode )
          {
            case 73:  // i
              if( eventObject.shiftKey && eventObject.ctrlKey )
                return;
              break;
              
            case 116: // F5
              return;
          }
          
          eventObject.preventDefault();
          var keyMoveDistance = 10,
              moveAll = function( direction ) { // helper function
                eventObject.preventDefault();
                focusElements.forEach( function( thisElement ) {
                  thisElement.update( undefined, undefined, direction );
                } );
                self.invalidateForeground();
              };
              
          switch( eventObject.keyCode )
          {
            case 37: // arrow key: left
              moveAll( new Vec2D( -keyMoveDistance, 0 ) );
              break;
              
            case 38: // arrow key: up
              moveAll( new Vec2D( 0, -keyMoveDistance ) );
              break;
              
            case 39: // arrow key: right
              moveAll( new Vec2D( keyMoveDistance, 0 ) );
              break;
              
            case 40: // arrow key: down
              moveAll( new Vec2D( 0, keyMoveDistance ) );
              break;
              
            case 46: // delete
              eventObject.preventDefault();
              focusElements.forEach( function( thisElement ) {
                blocks = blocks.filter( function( thisBlock ){
                  return thisBlock != thisElement;
                } );
                thisElement.delete();
              } );
              focusElements.length = 0;
              activeElements.length = 0;
              view.invalidateHandlers();
              break;
              
            case 66: // key: b - zoom to 100%
              self.zoomDefault();
              break;
              
            case 82: // key: r - zoom in
              self.zoomIn();
              break;
              
            case 86: // key: v - zoom out
              self.zoomOut();
              break;
              
            case 70: // key: f - zoom to fit
              // FIXME DUMMY for development - change to other function...
              self.zoomDefault();
              console.log( 'f - fit - not implemented' );
              break;
              
            default:
              console.log( 'key', eventObject, eventObject.keyCode );
          }
        };
        
        /**
         * Event handler for scrolling
         */
        this.scroll = function( eventObject ) {
          if( eventObject )
            eventObject.preventDefault();
          
          view.scroll();
        };
        
        /**
         * Event handler for any kind of resize, including browser zoom level.
         */
        this.resize = function( eventObject ) {
          console.log( 'resize', eventObject ); // FIXME DEBUG
          view.resizeView();
        };
        
        // Constructor
        $canvasContainer = passedCanvasContainer;
        view = new window._GLE.view( passedCanvasContainer, this );
        view.getForeground().on( 'mousedown',  this.mousedown ); 
        view.getForeground().on( 'touchstart', this.mousedown );
        $canvasContainer.on( 'scroll', self.scroll );
        $canvasContainer.on( 'wheel', function( e ){
          e.preventDefault(); 
          var left_right = ( undefined !== e.originalEvent.wheelDeltaX ? e.originalEvent.wheelDeltaX :
                           ( undefined !== e.originalEvent.deltaX      ? e.originalEvent.deltaX      : 0 )),
              up_down    = ( undefined !== e.originalEvent.wheelDeltaY ? -e.originalEvent.wheelDeltaY :
                           ( undefined !== e.originalEvent.deltaY      ? e.originalEvent.deltaY      : 0 )),
              mousePos   = getMousePos(e);
          console.log('sroll', e, left_right, up_down, 
                    mousePos ,  
          (e.shiftKey ? 's' : '') +
          (e.ctrlKey ? 'c' : '')  +
          (e.altKey ? 'a' : '' ));
          if( e.shiftKey || e.ctrlKey ) // should be only ctrlKey, but Chrome doesn't support that yet
          {
            if( up_down < 0 || left_right < 0 )
            {
              self.zoomOut();
            } else if( up_down > 0 || left_right > 0 )
            {
              self.zoomIn();
            }
            return;
          }
          
          if( left_right < 0 )
            $canvasContainer.scrollLeft( $canvasContainer.scrollLeft() - 50 );
          else if( left_right > 0 )
            $canvasContainer.scrollLeft( $canvasContainer.scrollLeft() + 50 );
          
          if( up_down < 0 )
            $canvasContainer.scrollTop( $canvasContainer.scrollTop() - 50 );
          else if( up_down > 0 )
            $canvasContainer.scrollTop( $canvasContainer.scrollTop() + 50 );
          self.resize();
        } );
        $(document).on( 'keydown',  this.keyPress  ); 
        $(window).on( 'resize',     this.resize    );
      };
      
  // fill the prototype public methods of GLE:
  GLE.prototype.toString = function() { return '[object GLE]'; };
      
  if( undefined !== window.GLE )
  {
    throw 'Error: Object named "GLE" already exists!';
  } else {
    // init to run when the DOM is ready:
    $( function(){
      window.GLE = new GLE( $('#canvascontainer') );
    });
  }
})( window );