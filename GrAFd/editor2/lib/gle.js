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
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame,
      cancelAnimationFrame  = window.cancelAnimationFrame || window.mozCancelAnimationFrame ||
                              window.webkitCancelAnimationFrame || window.msCancelAnimationFrame,
      mousemove = 'mousemove', // will be redefined on a touch device
      mouseup   = 'mouseup',
      width,               // size of the draw area
      height,
      scaleInternal = window.devicePixelRatio,
      scale         = scaleInternal, // overall scale
      scaleFactor   = Math.pow(2,1/3),
      $canvasFg,           // jQ object with the foreground canvas DOM element
      $canvasBg,           // jQ object with the background canvas DOM element
      ctxFg,               // foreground canvas context
      ctxBg,               // background canvas context
      canvasValid   = 0,   // Collect if canvas has to be redrawn
      canvasFgValid = 0,   // Collect if canvas has to be redrawn
      elementList = [[]],  // array of elements to draw, first element has to be empty as it corresponds to the background
      activeElements = [], // The active elements, i.e. the one on the Fg
      focusElements = [],  // The focused elements, i.e. the user selected ones
      idBuffer,            // ID map, i.e. 2D image of the indexList
      idData,              // The data array of the ID map
      ctxId,               // context of ID map
      ctxDummy = {         // dummy context, can be passed as a context
        beginPath: function(){},
        moveTo: function(){},
        lineTo: function(){},
        stroke: function(){},
        fillRect: function(){}
      },
      /**
       * Create a indexBuffer value (i.e. color) out of the @param pos.
       */
      id2color = function( pos ) {
        var base = (pos|0).toString( 16 );
        return '#' + Array( 7 - base.length ).join( '0' ) + base;
      },
      /**
       * Retrieve the index out of coordinates.
       * @param thisPos Vec2D
       */
      position2id = function( thisPos ) {
        var idxPos = ((thisPos.x*scale)|0) + width * ((thisPos.y*scale)|0);
        //var indexData = ctxId.getImageData( 0, 0, width, height ).data;
        //return ( (indexData[ idxPos*4 ] << 16) + (indexData[ idxPos*4+1 ] << 8) + indexData[ idxPos*4+2 ] )|0;
        return ( (idData[ idxPos*4 ] << 16) + (idData[ idxPos*4+1 ] << 8) + idData[ idxPos*4+2 ] )|0;
      },
      /**
       * Get the mouse coordinates out of the jQ.Event relative to the canvas.
       * (Note: this is a little self modifying code to handle browsers like
       * firefox that doesn't offer offsetX)
       * @return Vec2D
       */
      getMousePos = function( eventObject ) {
        if( eventObject.offsetX === undefined || eventObject.offsetY === undefined )
        {
          if( eventObject.originalEvent.touches !== undefined )
          { // a touch device
            mousemove = 'touchmove';
            mouseup   = 'touchend';
            getMousePos = function( eventObject ) {
              var touch = eventObject.originalEvent.touches[0],
                  targetOffset = $(eventObject.target).offset();
              $('#extra').text( touch.pageX + '/' + touch.pageY + ', ' + targetOffset.left + '/' + targetOffset.top + ', ' + scale );
              return new Vec2D( 
                //(touch.pageX - targetOffset.left)/scale|0,
                //(touch.pageY - targetOffset.top )/scale|0
                touch.pageX - targetOffset.left,
                touch.pageY - targetOffset.top
              );
            };
          } else {
            getMousePos = function( eventObject ) {
              var targetOffset = $(eventObject.target).offset();
              return new Vec2D( 
                (eventObject.pageX - targetOffset.left)/scale|0,
                (eventObject.pageY - targetOffset.top )/scale|0
                //(eventObject.pageX/scale - targetOffset.left)|0,
                //(eventObject.pageY/scale - targetOffset.top )|0
              );
            };
          }
        } else {
          getMousePos = function( eventObject ) {
            return new Vec2D( eventObject.offsetX/scale|0, eventObject.offsetY/scale|0 );
            //var ret = new Vec2D( eventObject.offsetX/scale|0, eventObject.offsetY/scale|0 );
            //return new Vec2D( eventObject.offsetX|0, eventObject.offsetY|0 );
          }
        }
        
        return getMousePos( eventObject );
      },
      /**
       * Seems to be a good idea to handle anti-aliasing - but can't prevent
       * it for paths...
       */
      setSmoothingEnabled = function( context, state ) {
        if( 'imageSmoothingEnabled' in context )
          context.imageSmoothingEnabled = state;
        if( 'mozImageSmoothingEnabled' in context )
          context.mozImageSmoothingEnabled = state;
        if( 'oImageSmoothingEnabled' in context )
          context.oImageSmoothingEnabled = state;
        if( 'webkitImageSmoothingEnabled' in context )
          context.webkitImageSmoothingEnabled = state;
      },
      /**
       * The GLE constructor
       */
      GLE = function( passedFgCanvas, passedBgCanvas ) {
        // private:
        var self = this, 
            blocks = [],  // array of all existent blocks
            lastPos,      // the beginning coordinates of a mouse drag
            prevPos;      // the coordinates of the previous call to mousemove
        
        /**
         * Create and register a new block.
         */
        this.addBlock = function() {
          var thisBlock = new _GLE.block( self );
          blocks.push( thisBlock );
          this.invalidateContext();
          return thisBlock;
        }
        
        /**
         * Create and register a new connection.
         */
        this.addConnection = function( parameters ) {
          var thisConnection = new _GLE.Connection( self, parameters );
          blocks.push( thisConnection );
          this.invalidateContext();
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
          this.invalidateContext();
        }
        
        /**
         * Setup index buffer to allow objects to draw themselfes.
         */
        this.prepareHandlerDrawing = function( id ) {
          ctxId.fillStyle   = id2color( id | 0 );
          ctxId.strokeStyle = id2color( id | 0 );
          ctxId.lineWidth = 5;
        };
        
        /**
         * Draw a handler at the given positions with the id. If @param active
         * is true the handler will be visible and at the foreground as well.
         * @param pos Vec2D
         */
        this.drawHandler = function( pos, id, active ) {
          var halfSize = 4,//3.5;
              fullSize = 0*1+2*halfSize;
              
          if( active )
            ctxFg.fillRect( pos.x - halfSize, pos.y - halfSize, fullSize, fullSize );
          
          ctxId.fillStyle = id2color( id | 0 );
          ctxId.fillRect( pos.x - halfSize, pos.y - halfSize, fullSize, fullSize );
        }
        
        /**
        * Return true if the @parm mousePos doesn't belong to this handler
        */
        this.checkHandlerBadSelection = function( mousePos, handlerPos ) {
          var halfSize = 3.5 + 0.5;
          console.log( 'checkHandlerBadSelection', mousePos.print(), handlerPos.print(), (handlerPos.x-halfSize) > mousePos.x ||
                 (handlerPos.y-halfSize) > mousePos.y || 
                 (handlerPos.x+halfSize) < mousePos.x ||
                 (handlerPos.y+halfSize) < mousePos.y );
          return (handlerPos.x-halfSize) > mousePos.x ||
                 (handlerPos.y-halfSize) > mousePos.y || 
                 (handlerPos.x+halfSize) < mousePos.x ||
                 (handlerPos.y+halfSize) < mousePos.y;
        };
        
        // NOTE: Optimize in future to collect calls before doing a redraw...
        /**
         * Mark all context invalid and force a redraw.
         */
        this.invalidateContext = function()
        {
          this.updateBg = true;
          if( 0 === canvasValid )
            canvasValid = requestAnimationFrame( this.updateContext );
        };
        /**
         * Mark foreground invalid and force a redraw.
         */
        this.invalidateForeground = function()
        {
          if( 0 === canvasValid )
            canvasValid = requestAnimationFrame( this.updateContext );
        };
        
        this.updateContext = function()
        {
          if( self.updateBg )
            self.draw();
          else
            self.drawFg();
        }
        
        /**
         * Redraw canvases.block
         */
        this.draw = function() {
          console.log( 'draw ---------------------------------------------' );
          ctxId.clearRect( 0, 0, width, height );
          ctxId.setTransform( scale, 0, 0, scale, 0.5, 0.5 );
          //ctxFg.clearRect( 0, 0, width, height );
          ctxBg.clearRect( 0, 0, width, height );
          ctxBg.setTransform( scale, 0, 0, scale, 0.5, 0.5 );
          blocks.forEach( function drawBlocks_PROFILENAME( thisBlock, index ){
            var thisActive = activeElements.indexOf( thisBlock ) !== -1;//(thisBlock === activeElement);
            var thisFocus  = focusElements.indexOf( thisBlock ) !== -1;
            thisBlock.draw( thisActive ? ctxFg : ctxBg, ctxId, thisFocus );
          } );
          // show debug:
          ctxBg.save();
          ctxBg.fillStyle = 'rgba(100,100,200,0.75)';
          ctxBg.fillRect( 0, 0, width, height );
          ctxBg.restore();
          self.updateBg = false;
          self.drawFg(); // =>  canvasFgValid = 0;
        };
        this.drawFg = function() {
          console.log( 'drawFg -------------------------------------------' );
          ctxFg.clearRect( 0, 0, width, height );
          ctxFg.setTransform( scale, 0, 0, scale, 0.5, 0.5 );
          //ctxId.clearRect( 0, 0, width, height );
          //activeElement.draw( ctxFg, ctxId, true );
          console.log( activeElements );
          activeElements.forEach( function( thisActiveElement ) {
            var thisFocus  = focusElements.indexOf( thisActiveElement ) !== -1;
            thisActiveElement.draw( ctxFg, ctxDummy, thisFocus );
          } );
          canvasValid = 0;
        };
        
        this.mousedown = function( eventObject ) {
          eventObject.preventDefault();
          lastPos = getMousePos( eventObject );
          prevPos = lastPos;
          
          idData = ctxId.getImageData( 0, 0, width, height ).data;
          
          var index = position2id( lastPos ),
              activeElement = elementList[ index ][0];
              
          //lastPos.cmul( [1/scale, 1/scale] );
          $('#coords').text( lastPos.print() + ':' + index );
          if( undefined !== activeElement ) console.log( lastPos, 'Result:', activeElement.checkBadSelection( lastPos, elementList[ index ][1],  2, scale ), lastPos.print(), index );
 
          if( 0 == index || activeElement.checkBadSelection( lastPos, elementList[ index ][1], 2, scale ) )
          {
            var redraw = activeElements.length > 0;
            activeElements.length = 0;
            focusElements.length = 0;
            
            if( redraw )
              self.invalidateContext();
            
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
          
          self.invalidateContext();
          
          // add event listeners
          $(document).on( mousemove, index, window.GLE.mousemove ); 
          $(document).on( mouseup,   index, window.GLE.mouseup   ); 
        };
        
        this.mousemove = function( eventObject ) {
          eventObject.preventDefault();
          var index         = eventObject.data,
              thisElem      = elementList[ index ],
              thisPos       = getMousePos( eventObject ),
              deltaPos      = thisPos.copy().minus( lastPos ),
              shortDeltaPos = thisPos.copy().minus( prevPos ),
              lowerIndex    = position2id( thisPos ),
              lowerElement  = elementList[lowerIndex];
          
          if( (!lowerElement) ||
              (lowerElement.length && lowerElement[0].checkBadSelection( thisPos, lowerElement[1], 2, scale ) ) )
            lowerElement = [];
          
          var newIndex = (thisElem[0]).update( thisElem[1], thisPos, deltaPos, shortDeltaPos, lowerElement, eventObject.shiftKey );
          ////console.log( index, newIndex );
          // check if the handler might have been changed during the update
          if( newIndex !== undefined && newIndex !== index )
          {
            $(document).off( mousemove, window.GLE.mousemove ); 
            $(document).off( mouseup  , window.GLE.mouseup   ); 
            $(document).on ( mousemove, newIndex, window.GLE.mousemove ); 
            $(document).on ( mouseup  , newIndex, window.GLE.mouseup   ); 
          }
          
          // necessary? Causes currently double redraws...
          self.invalidateForeground(); // redraw to fix Id map
          
          prevPos = thisPos;
        };
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
        this.mouseup = function( eventObject ) {
          eventObject.preventDefault();
          /*
          var deltaX = eventObject.offsetX - lastX,
              deltaY = eventObject.offsetY - lastY;
          */
          var index         = eventObject.data,
              thisElem      = elementList[ index ];
          (thisElem[0]).finishUpdate( thisElem[1] );
          self.invalidateContext(); // redraw to fix Id map
          
          // remove the liseteners again
          $(document).off( mousemove, window.GLE.mousemove ); 
          $(document).off( mouseup,   window.GLE.mouseup   ); 
          
          //var index = position2id( eventObject.offsetX, eventObject.offsetY );
          //console.log( 'up', [deltaX, deltaY], [lastX, '->', eventObject.offsetX], [lastY, '->', eventObject.offsetY], ':', index, eventObject.data );
        };
        this.keyPress = function( eventObject ) {
          var keyMoveDistance = 10,
              moveAll = function( direction ) { // helper function
                eventObject.preventDefault();
                focusElements.forEach( function( thisElement ) {
                  thisElement.update( undefined, undefined, undefined, direction );
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
              self.invalidateHandlers();
              break;
              
            case 66: // key: b - zoom to 100%
              scale = scaleInternal;
              $('#zoom').text( Math.round(scale * 100 / scaleInternal) + '%' );
              self.invalidateContext();
              break;
              
            case 82: // key: r - zoom in
              scale *= scaleFactor;
              scale = Math.pow( scaleFactor, Math.round( 10*Math.log( scale / scaleInternal )/Math.log( scaleFactor ) ) / 10 ) * scaleInternal;
              if( scale > 10 * scaleInternal ) scale = 10.0 * scaleInternal;
              $('#zoom').text( Math.round(scale * 100 / scaleInternal) + '%' );
              self.invalidateContext();
              break;
              
            case 86: // key: v - zoom out
              scale /= scaleFactor;
              scale = Math.pow( scaleFactor, Math.round( 10*Math.log( scale / scaleInternal )/Math.log( scaleFactor ) ) / 10 ) * scaleInternal;
              if( scale < 0.05 * scaleInternal ) scale = 0.05 * scaleInternal;
              $('#zoom').text( Math.round(scale * 100 / scaleInternal) + '%' );
              self.invalidateContext();
              break;
              
            case 70: // key: f - zoom to fit
              scaleInternal = (scaleInternal===1) ? 4 : 1;
              $('#zoom').text( Math.round(scale * 100 / scaleInternal) + '%' );
              self.invalidateContext();
            default:
              console.log( 'key', eventObject, eventObject.keyCode );
          }
        };
        
        // Constructor
        $canvasFg   = passedFgCanvas;
        $canvasBg   = passedBgCanvas;
        ////////////////////////
        /*
        var ratio = window.devicePixelRatio || 1,
            width = canvas.width,
            height = canvas.height;

        if (ratio > 1) {
          canvas.width = width * ratio;
          canvas.height = height * ratio;
          canvas.style.width = width + "px";
          canvas.style.height = height + "px";
          context.scale(ratio, ratio);
        }
        */
        ////////////////////////
        width       = $canvasBg.width()  | 0;
        height      = $canvasBg.height() | 0;
        if( true || 1 !== scaleInternal )
        { // e.g. retina display
          $canvasFg[0].style.width  = width  + 'px';
          $canvasFg[0].style.height = height + 'px';
          $canvasBg[0].style.width  = width  + 'px';
          $canvasBg[0].style.height = height + 'px';
          width  = width  * window.devicePixelRatio | 0;
          height = height * window.devicePixelRatio | 0;
          $canvasFg[0].width  = width ;
          $canvasFg[0].height = height;
          $canvasBg[0].width  = width ;
          $canvasBg[0].height = height;
          
        }
        ctxFg       = $canvasFg[0].getContext('2d');
        ctxBg       = $canvasBg[0].getContext('2d');
        idBuffer    = document.createElement('canvas');
        ////
        $('#drawArea').append( idBuffer );
        ////
        idBuffer.width  = width;
        idBuffer.height = height;
        idBuffer.style.width  = (width /scaleInternal) + 'px';
        idBuffer.style.height = (height/scaleInternal) + 'px';
        ctxId       = idBuffer.getContext('2d');
        $canvasFg.on( 'mousedown',  this.mousedown ); 
        $canvasFg.on( 'touchstart', this.mousedown );
        $(document).on( 'keydown', this.keyPress ); 
        // trick to make 1px wide lines to not take up two pixels
        ctxFg.translate(0.5, 0.5);
        ctxBg.translate(0.5, 0.5);
        ctxId.translate(0.5, 0.5);
        setSmoothingEnabled( ctxFg, false );
        setSmoothingEnabled( ctxId, false );
      };
      
  // fill the prototype public methods of GLE:
  GLE.prototype.toString = function() { return '[object GLE]'; };
      
  if( undefined !== window.GLE )
  {
    throw 'Error: Object named "GLE" already exists!';
  } else {
    // init to run when the DOM is ready:
    $( function(){
      window.GLE = new GLE( $('#canvas_fg'), $('#canvas') );
    });
  }
})( window );