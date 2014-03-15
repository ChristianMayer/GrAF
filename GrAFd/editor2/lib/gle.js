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
          getMousePos = function( eventObject ) {
            var cC  = $canvasContainer[0],
                targetOffset = $canvasContainer.offset(),
                ret = new Vec2D( (eventObject.pageX||eventObject.originalEvent.pageX) - targetOffset.left + cC.scrollLeft,
                                 (eventObject.pageY||eventObject.originalEvent.pageY) - targetOffset.top  + cC.scrollTop);
            return ret.scale( 1.0 / scale ).round( 1 );
          };
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
       * Get all touch coordinates out of the jQ.Event relative to the canvas.
       * @return Array of Vec2D with one Vec2D per touch position
       */
      getTouchPos = function( eventObject ) {
        var cC  = $canvasContainer[0],
            touches = eventObject.originalEvent.touches,
            targetOffset = $canvasContainer.offset(),
            offset = new Vec2D( cC.scrollLeft - targetOffset.left,
                                cC.scrollTop  - targetOffset.top ),
            invScale = 1.0 / scale;
            
        return Array.prototype.map.call( touches, function(touch){ 
            return (new Vec2D( touch.pageX, touch.pageY ))
                   .plus( offset )
                   .scale( invScale )
                   .round( 1 );
        } );
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
        
        this.zoomIn = function( centerCoord )
        {
          scale *= scaleFactor;
          self.setZoom( Math.pow( scaleFactor, Math.round( 10*Math.log( scale )/Math.log( scaleFactor ) ) / 10 ), centerCoord );
        };
        this.zoomOut = function( centerCoord )
        {
          scale /= scaleFactor;
          self.setZoom( Math.pow( scaleFactor, Math.round( 10*Math.log( scale )/Math.log( scaleFactor ) ) / 10 ), centerCoord );
        };
        this.zoomDefault = function( centerCoord )
        {
          self.setZoom( 1.0, centerCoord );
        };
        
        /**
         * Set the zoom level
         */
        this.setZoom = function( newScale, centerCoord )
        {
          scale = newScale;
          if( scale < self.settings.minScale ) 
            scale = self.settings.minScale;
          else if( scale > self.settings.maxScale ) 
            scale = self.settings.maxScale;
          $('#zoom').text( Math.round(scale * 100) + '% (scale: ' + scale + ' / scaleInternal: ' + 'n/a' + ')' );
          
          view.zoomView( scale, centerCoord );
        }
        
        var dragIndex = 0;
        var dragStart = function( mousePos, ctrlKey, shiftKey ) {
          lastPos = mousePos;
          prevPos = lastPos;
          // ---------------
          view.showMarker( lastPos );
          // ---------------
          
          
          var index = view.position2id( lastPos ),
              activeElement = index < elementList.length ? elementList[ index ][0] : undefined;
              
          $('#coords').text( lastPos.print() + ':' + index + ' (' + scale + ') [' + ']' );
          if( undefined !== activeElement ) console.log( lastPos, 'Result:', activeElement.checkBadSelection( lastPos, elementList[ index ][1],  2, scale ), lastPos.print(), index );
 
 
          if( 0 === index || undefined === activeElement || activeElement.checkBadSelection( lastPos, elementList[ index ][1], 2, scale ) )
          {
            var redraw = activeElements.length > 0;
            activeElements.length = 0;
            focusElements.length = 0;
            
            if( redraw )
              view.invalidateContext();
            
            dragIndex = 0;
            return false; // no object found
          }
          
          var newIndex = activeElement.prepareUpdate( elementList[ index ][1], index, lastPos, ctrlKey, shiftKey );
          console.log( 'down', index, newIndex, activeElement, elementList[ index ][1] );
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
          
          dragIndex = index;
          view.invalidateContext();
          return true;
        };
        
        var dragMove = function( mousePos, ctrlKey, shiftKey ) {
          var index         = dragIndex, //eventObject.data,
              thisElem      = elementList[ index ],
              thisPos       = mousePos,
              shortDeltaPos = thisPos.copy().minus( prevPos ),
              lowerIndex    = view.position2id( thisPos ),
              lowerElement  = elementList[lowerIndex];
          
          if( (!lowerElement) ||
              (lowerElement.length && lowerElement[0].checkBadSelection( thisPos, lowerElement[1], 2, scale ) ) )
            lowerElement = [];
          
          var newIndex = (thisElem[0]).update( thisElem[1], thisPos, shortDeltaPos, lowerElement, shiftKey );
          ////console.log( index, newIndex );
          // check if the handler might have been changed during the update
          if( newIndex !== undefined && newIndex !== index )
          {
            dragIndex = newIndex;
          }
          
          //console.timeEnd("my mousemove"); // DEBUG
          // necessary? Causes currently double redraws...
          view.invalidateForeground(); // redraw to fix Id map
          
          prevPos = thisPos;
        };
        
        var dragEnd = function() {
          var index         = dragIndex,
              thisElem      = elementList[ index ];
          (thisElem[0]).finishUpdate( thisElem[1] );
          
          dragIndex = 0;
          self.updateContentSize(); // e.g. the boundary has to be updated
          view.invalidateContext(); // redraw to fix Id map
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
        
        var pinchLength, 
            pinchStartScale;
        var pinchStart = function( eventObject ) {
          pinchStartScale = scale;
          var p = getTouchPos( eventObject );
          pinchLength = Math.sqrt(
                          p[0].minus( p[1] ).getNorm()
                             );
        };
        
        var pinchMove = function( eventObject ) {
          var touches  = getTouchPos( eventObject ),
              length   = Math.sqrt(
                          touches[0].minus( touches[1] ).getNorm()
                         ),
              newScale = pinchStartScale * length / pinchLength;
              
          self.setZoom( newScale, touches[0].plus(touches[1]).scale( 0.5 ) );
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
        
        var mouseStateNone  = 0, // implies no button pressed
            mouseStateDrag  = 1, // implies a pressed button
            mouseStatePinch = 2, // implies two touches
            mouseState = mouseStateNone;
        function printMouseState() {
          var ret = '[';
          switch( mouseState )
          {
            case mouseStateNone:
              ret += 0;
              break;
              
            case mouseStateDrag:
              ret += 1;
              break;
              
            case mouseStatePinch:
              ret += 2;
              break;
              
            default:
              ret += '?';
          }
          return ret + ']';
        }
        
        /**
         * Check for a double click.
         * When true, reset zoom rend return true, otherwise false.
         */
        var isDoubleClick = function( timeStamp ) {
          if( timeStamp - clickTimestamp < 200 )
          {
            mouseState = mouseStateNone;
            self.zoomDefault();
            return true;
          }
          clickTimestamp = timeStamp;
          return false;
        }
        
        /**
         * Event handler for mousedown.
         */
        this.mousedown = function( eventObject ) {
          // check for double click
          if( isDoubleClick( eventObject.timeStamp ) )
            return false;
          
          if( dragStart( getMousePos( eventObject ), 
                         eventObject.ctrlKey, 
                         eventObject.shiftKey ) )
            mouseState = mouseStateDrag;
          else
            mouseState = mouseStateNone;
          
          return false; // stopp propagation as well as bubbling
        };
        
        /**
         * Event handler for touchstart.
         */
        this.touchstart = function( eventObject ) {
          // set the default:
          mouseState = mouseStateNone;
          
          switch( eventObject.originalEvent.touches.length )
          {
            case 0:
              mouseState = mouseStateNone;
              break;
              
            case 1:
              // check for double click
              if( isDoubleClick( eventObject.timeStamp ) )
                break;
              
              if( dragStart( getTouchPos( eventObject )[0] ) )
                mouseState = mouseStateDrag;
              break;
              
            case 2:
              mouseState = mouseStatePinch;
              pinchStart( eventObject );
              break;
          }
          $('#coords').text( 'touchstart' + printMouseState() + eventObject.originalEvent.touches.length);
          getTouchPos( eventObject );
          return false; // stopp propagation as well as bubbling
        };
        
        /**
         * Event handler for mousemove.
         */
        this.mousemove = function( eventObject ) {
          if( mouseState === mouseStateDrag )
            dragMove( getMousePos( eventObject ), eventObject.ctrlKey, eventObject.shiftKey );
          
          return false; // stopp propagation as well as bubbling
        };
        
        /**
         * Event handler for touchmove.
         */
        this.touchmove = function( eventObject ) {
          switch( mouseState )
          {
            case mouseStateNone:
              // FIXME: this allows (on purpose!) the scrolling of the main
              // screen ==> might need to be removed in the final editor!
              return true;  // keep event propagating and bubbling
              
            case mouseStateDrag:
              dragMove( getTouchPos( eventObject )[0] );
              break;
              
            case mouseStatePinch:
              pinchMove( eventObject );
              break;
          }
          
          //$('#coords').text( 'touchmove' + printMouseState()  + eventObject.originalEvent.touches.length);
          //$('#coords').text( $('#coords').text()+';'+ 'touchmove' + printMouseState()  + eventObject.originalEvent.touches.length);
          return false; // stopp propagation as well as bubbling
        };
        
        /**
         * Event handler for mouseup.
         */
        this.mouseup = function( eventObject ) {
          if( mouseState === mouseStateDrag )
            dragEnd();
          
          mouseState = mouseStateNone;
          return false; // stopp propagation as well as bubbling
        };
        
        /**
         * Event handler for touchend.
         */
        this.touchend = function( eventObject ) {
          if( mouseState === mouseStateDrag )
            dragEnd();
          
          // finger has left => do a new cycle, mouseState will be set there
          return self.touchstart( eventObject );
        };
        
        /**
         * Event handler for the touchcancel.
         * Set state to none as after a cancel the iPad needs a restart anyway.
         */
        this.touchcancel = function( eventObject ) {
          if( mouseState === mouseStateDrag )
            dragEnd();
          
          mouseState = mouseStateNone;
          return false; // stopp propagation as well as bubbling
        };
        
        /**
         * Event handler for scrolling.
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
        /*
        view.getForeground().on( 'mousedown',  this.mousedown ); 
        view.getForeground().on( 'touchstart', this.mousedown );
        */
        view.getForeground()
          .on( 'mousedown',  this.mousedown )
          .on( 'touchstart',  this.touchstart );
        $(document)  
          .on( 'mousemove',  this.mousemove )
          .on( 'touchmove',  this.touchmove )
          .on( 'mouseup',  this.mouseup )
          .on( 'touchend',  this.touchend )
          .on( 'touchcancel',  this.touchcancel ); 
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
              self.zoomOut( mousePos );
            } else if( up_down > 0 || left_right > 0 )
            {
              self.zoomIn( mousePos );
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