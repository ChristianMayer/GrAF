/**
 * gle.block.js (c) 2013 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 * @module GLE.view
 * @title  GrAF logic engine: graphical logic editor
 * 
 * This file contains the "view" of the editor / data.
 */
 
// create a local context:
(function( window, undefined ) {
  "use strict";
  
  // Constructor
  var view = function( $canvasContainer, thisGLE ){
    if( !( this instanceof view ) )
      throw 'Error, use "new" operator for View!';
    
    // private:
    var self     = this,
        // cross browser compatabilities:
        requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame || window.msRequestAnimationFrame,
        cancelAnimationFrame  = window.cancelAnimationFrame || window.mozCancelAnimationFrame ||
                                window.webkitCancelAnimationFrame || window.msCancelAnimationFrame,
        cssTransform          = 'transform', // to be overwritten by the browser test
        viewOffset    = new Vec2D(0,0), // offset of the viewport, i.e. bascially the scroll of the drawingPlane
        screenSize    = new Vec2D(0,0), // size that is visible
        drawSize      = new Vec2D(0,0), // size of the draw area
        drawOffset    = new Vec2D(0,0), // offset of the draw area, i.e. Bg
        contentSize   = new Vec2D(0,0), // maximum needed size of the content
        scaleInternal = window.devicePixelRatio,
        scale         = 1,   // overall scale
        $drawingPl,          // the <div> that contians the space to draw on
        $canvasFg,           // jQ object with the foreground canvas DOM element
        $canvasBg,           // jQ object with the background canvas DOM element
        ctxFg,               // foreground canvas context
        ctxBg,               // background canvas context
        canvasValid   = 0,   // Collect if canvas has to be redrawn
        canvasFgValid = 0,   // Collect if canvas has to be redrawn
        layersClamped = false, // True when the forground should also be painted on the background
        //activeElements = [], // The active elements, i.e. the one on the Fg
        //focusElements = [],  // The focused elements, i.e. the user selected ones
        idBuffer,            // ID map, i.e. 2D image of the indexList
        idData,              // The data array of the ID map
        idDataInvalid = true,// Collect if id data has to be fetched
        ctxId,               // context of ID map
        ctxIdInvalid  = true,// Collect if the ID map is valid for lazy evaluation
        ctxDummy = {         // dummy context, can be passed as a context
          beginPath: function(){},
          moveTo: function(){},
          lineTo: function(){},
          stroke: function(){},
          fillRect: function(){}
        },
        selectionCorner,     // draw a selection rectangle when defined
        selectionSize,
        showGrid = false,    // draw a grid for easier positioning and debugging
        /**
         * Little helper that a applies the x and y of a Vec2D on the width
         * and height parameters of an object.
         */
        applySize = function( obj, vec, postfix ) {
          obj.width  = vec.x + (postfix||0);
          obj.height = vec.y + (postfix||0);
        },
        /**
         * Little helper to test if an object does not have a given size.
         */
        neqSize = function( obj, vec, postfix ) {
          return (obj.width  !== (vec.x+(postfix||0))) ||
                 (obj.height !== (vec.y+(postfix||0)));
        },
        /**
         * Little helper function that returns a Vec2D with the current
         * scroll postion.
         */
        getScroll = function() {
          return new Vec2D(
            $canvasContainer.scrollLeft(),
            $canvasContainer.scrollTop()
          );
        },
        /**
         * Create a indexBuffer value (i.e. color) out of the @param pos.
         */
        id2color = function( pos ) {
          var base = (pos|0).toString( 16 );
          return '#' + Array( 7 - base.length ).join( '0' ) + base;
        },
        /**
         * Little helper function to make idData valid.
         */ //DEBUGctx, FIXME delete 
        makeIdDataValid = function() {
          if( ctxIdInvalid )
            self.updateContext();
          
          if( idDataInvalid )
          {
            idData = ctxId.getImageData( 0, 0, drawSize.x, drawSize.y ).data;
            //DEBUGctx= ctxId.getImageData( 0, 0, width, height );
            //idData = DEBUGctx.data;
            idDataInvalid = false;
          }
        },
        /**
        * Retrieve the index out of screen coordinates.
        * @param thisPos Vec2D
        */
        position2id = function( thisScreenPos ) {
          makeIdDataValid();
          //var idxPos = (Math.round(thisScreenPos.x*scale*scaleInternal) + drawSize.x * Math.round(thisScreenPos.y*scale*scaleInternal))|0;
          var idxPos = (Math.round(thisScreenPos.x*scaleInternal) + drawSize.x * Math.round(thisScreenPos.y*scaleInternal))|0;
          //console.log( 'position2id', thisScreenPos.print(), thisScreenPos.copy().scale(scaleInternal).round(1).print() );
          return ( (idData[ idxPos*4 ] << 16) + (idData[ idxPos*4+1 ] << 8) + idData[ idxPos*4+2 ] )|0;
        },
        /**
         * Retrieve all indices that are inside the screen area.
         * The allowed index range is passed by minIndex and endIndex-1
         */
        area2id = function( pScreenMin, pScreenMax, minIndex, endIndex ) {
          makeIdDataValid();
          var 
            //minPos = pScreenMin.copy().scale(scale*scaleInternal).round(1),
            //maxPos = pScreenMax.copy().scale(scale*scaleInternal).round(1),
            minPos = pScreenMin.copy().scale(scaleInternal).round(1),
            maxPos = pScreenMax.copy().scale(scaleInternal).round(1),
            buffer = new ArrayBuffer( endIndex ),
            idxSet = new Int8Array(buffer),
            // preassign all loop variables for speed up
            width  = drawSize.x,
            y,
            yMin   = 4*width*(minPos.y|0),
            yMax   = 4*width*(maxPos.y|0),
            yStep  = 4*width,
            x,
            xMin   = 4*(minPos.x|0),
            xMax   = 4*(maxPos.x|0),
            xy, thisIdx,   // cache variables
            retVal = [];
            
          for( y = yMin; y <= yMax; y += yStep )
          {
            for( x = xMin; x <= xMax; x += 4 )
            {
              xy      = x + y,
              thisIdx = ((idData[ xy++ ] << 16) + (idData[ xy++ ] << 8) + (idData[ xy ]))|0;
              //idData[ xy ]=250;
              //idData[ xy+1 ]=250;
              idxSet[ thisIdx ] = 1;
            }
          }
          //ctxId.putImageData( DEBUGctx, 0, 0 );
          for( x = minIndex; x < endIndex; x++ )
            if( idxSet[x] === 1 )
              retVal.push( x );
          //console.log('area2id', retVal, pScreenMin.print(), pScreenMax.print(),';',minPos.print(),maxPos.print() );
            
          return retVal; //Object.keys( idxSet );
        },
        /**
          * Clear a canvas given by its context.
          * This will also make sure the transform matrix is set properly, i.e.
          * scaled.
          */
        clearCanvas = function( ctx )
        {
          ctx.setTransform( 1, 0, 0, 1, 0, 0 );
          ctx.clearRect( 0, 0, drawSize.x, drawSize.y );
          var s = scale*0+1 * scaleInternal;
          //ctx.setTransform( scale, 0, 0, scale, 0.5, 0.5 );
          //ctx.setTransform( 1, 0, 0, 1, 0.5, 0.5 );
          ctx.setTransform( 1, 0, 0, 1, 0.5 - drawOffset.x*s, 0.5 - drawOffset.y*s );
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
         * 
         */
        clampLayers = function() {
          if( layersClamped ) return;
 
          layersClamped = true;
          self.invalidateForeground(); // only the FG needs a redraw
          
          // move foreground out of the way
          //$canvasFg[0].style.left = '0px';
          //$canvasFg[0].style.top  = '0px';
        },
        /**
         * 
         */
        unclampLayers = function() {
          if( !layersClamped ) return;
 
          layersClamped = false;
          
          self.scroll( true ); // update as it might be unsynchronised during clamping
          
          self.invalidateContext();
        },
        /**
         * Position background canvas, e.g. after a scroll event.
         */
        fixBackgroundPosition = function() {
          drawOffset = viewOffset.copy();
          drawOffset = viewOffset.copy().minus( drawSize.copy().scale(1/scaleInternal).minus(screenSize).scale(0.5) );
          drawOffset.cmin( contentSize.copy().scale(scale).minus(drawSize.copy().scale(1/scaleInternal)) ); // no need to draw empty space in the bottom right
          //drawOffset   = ( contentSize.copy().scale(scale).minus(drawSize.copy().scale(1/scaleInternal)) ); // no need to draw empty space in the bottom right
          drawOffset.cmax( new Vec2D( 0, 0 ) ); // no need to draw in the negative region
          
          console.log( 'fixBackgroundPosition:',
                       scale, scaleInternal,
                       'drawOffset', drawOffset.print(),
                       'viewOffset', viewOffset.print(),
                       'drawSize', drawSize.print(),
                       'contentSize', contentSize.print(),
                       'screenSize', screenSize.print()
                  );
          $canvasBg.css( cssTransform, 'matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, '+drawOffset.x+','+drawOffset.y+',0,1)' );
        
          // redraw:
          self.updateBg = true;
          self.invalidateContext();
        },
        /**
         * Resize background for optimal fix, e.g. after a zoom or resize event.
         */
        fixBackgroundSize = function() {
          var 
            clientSize = screenSize.copy().plus( viewOffset )
              .cmax( contentSize.copy().scale(scale) )
              .cmin( thisGLE.settings.maxCanvasSize.copy().scale(1/scaleInternal) ).floor();
          console.log( 'fixBackgroundSize', clientSize.print() );
              
          if( !drawSize.equal( clientSize.copy().scale(scaleInternal).round(1) ) ||
              neqSize( $canvasBg[0].style, clientSize, 'px' ) )
          {
            drawSize = clientSize.copy().scale(scaleInternal).round(1);
            
            applySize( $drawingPl[0].style, contentSize.copy().scale(scale), 'px' );
            //applySize( $drawingPl[0].style, clientSize, 'px' );
            applySize( $canvasBg[0], drawSize );
            applySize( $canvasBg[0].style, clientSize, 'px' );
          }
          fixBackgroundPosition(); // put it on the correct position
        },
 
        foo = 0;
    
    this.position2id = position2id; // FIXME make visible
    this.area2id     = area2id;     // FIXME make visible
    
    this.getForeground = function() {
      return $canvasFg;
    };
    
    // only for debug purposes as it's circumventing a clear separation...
    this.debugGetCtxFg = function() {
      return ctxFg;
    };
    this.debugGetCtxBg = function() {
      return ctxBg;
    };
    
    this.showKlick = function( canvasPos ) {
      $('#klick')[0].style.left = (scale*canvasPos.x-5)+'px';
      $('#klick')[0].style.top  = (scale*canvasPos.y-5)+'px';
    }
    
    /**
     * Return Vec2D in screen coordinated for given page coordinates
     */
    this.getScreenCoordinate = function( pageX, pageY ) {
      var offset = $canvasContainer.offset();
      return new Vec2D( pageX - offset.left, pageY - offset.top );
    };
    
    /**
     * Calculate from a screen coordinate the canvas coordinate.
     */
    this.screen2canvas = function( pos ) {
      return viewOffset.copy().plus( pos ).scale( 1/scale );
    };
    /**
     * Calculate from a canvas coordinate the screen coordinate.
     */
    this.canvas2screen = function( pos ) {
      return pos.copy().scale( scale ).minus( viewOffset );
    };
    
    /**
      * Setup index buffer to allow objects to draw themselfes.
      */
    this.prepareHandlerDrawing = function( id ) {
      ctxId.fillStyle = ctxId.strokeStyle = id2color( id | 0 );
      ctxId.lineWidth = thisGLE.settings.toleranceLine;
    };
    
    /**
      * Draw a handler at the given positions with the id. If @param active
      * is true the handler will be visible and at the foreground as well.
      * @param pos Vec2D
      */
    this.drawHandler = function( pos, id, active ) {
      var thisScale  = scale * scaleInternal,
          halfSizeFg = (thisGLE.settings.drawSizeHandleActive * thisScale)|0,
          fullSizeFg = 1 + 2 * halfSizeFg,
          halfSizeId = (thisGLE.settings.toleranceHandle * ((thisScale>1)?thisScale:1))|0,
          fullSizeId = 1 + 2 * halfSizeId;
          
      if( active && !layersClamped ) {
        ctxFg.lineWidth = 1;
        ctxFg.fillRect( pos.x - halfSizeFg, pos.y - halfSizeFg, fullSizeFg, fullSizeFg );
        ctxFg.strokeRect( pos.x - halfSizeFg, pos.y - halfSizeFg, fullSizeFg, fullSizeFg );
      }
      
      ctxId.lineWidth = 1;
      ctxId.fillStyle = id2color( id | 0 );
      ctxId.fillRect( pos.x - halfSizeId, pos.y - halfSizeId, fullSizeId, fullSizeId );
      ctxId.strokeRect( pos.x - halfSizeId, pos.y - halfSizeId, fullSizeId, fullSizeId );
    }
    
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
    /**
     * Notify that the ID map is invalid.
     */
    this.invalidateIndex = function()
    {
      ctxIdInvalid  = true;
    }
    
    this.updateContext = function()
    {
      //self.updateContentSize(); // FIXME move to a place where that's only called when necessary
      
      if( self.updateBg )
      {
        self.draw();
        ctxIdInvalid = false;
      }
      else
        self.drawFg();
    }
    
    /**
      * Redraw canvases.block
      */
    this.draw = function() {
      clearCanvas( ctxId );
      ctxId.setTransform( 1, 0, 0, 1, 0.5 - 1*viewOffset.x*scaleInternal, 0.5 - 1*viewOffset.y*scaleInternal );
      clearCanvas( ctxBg );
      //console.log( 'draw ---------------------------------------------' );
      $('#extra').text( 'Draw:' +  (new Date().getTime()) );
      if( showGrid ) {
        var widthTotal = drawSize.x * (scale * scaleInternal),
            heightTotal = drawSize.y * (scale * scaleInternal);
        ctxBg.save();
        ctxBg.strokeStyle = '#b0b0b0';
        ctxBg.beginPath();
        for( var x = 0; x < widthTotal; x += 20 ) {
          ctxBg.moveTo( x, 0 );
          ctxBg.lineTo( x, heightTotal );
        }
        for( var y = 0; y < heightTotal; y += 20 ) {
          ctxBg.moveTo( 0,     y );
          ctxBg.lineTo( widthTotal, y );
        }
        ctxBg.stroke();
        ctxBg.strokeStyle = '#808080';
        ctxBg.beginPath();
        for( var x = 0; x < drawSize.x; x += 100 ) {
          ctxBg.moveTo( x, 0 );
          ctxBg.lineTo( x, drawSize.y );
        }
        for( var y = 0; y < drawSize.y; y += 100 ) {
          ctxBg.moveTo( 0,     y );
          ctxBg.lineTo( drawSize.x, y );
        }
        ctxBg.stroke();
        ctxBg.restore();
      }
      
      thisGLE.draw( function(isActive){ return isActive ? ctxFg : ctxBg; }, ctxId, scale * scaleInternal );
      
      // show debug:
      ctxBg.save();
      ctxBg.setTransform( 1, 0, 0, 1, 0, 0 );
      ctxBg.fillStyle = 'rgba(100,100,200,0.75)';
      ctxBg.fillRect( 0, 0, drawSize.x, drawSize.y );
      ctxBg.restore();
      self.updateBg = false;
      self.drawFg(); // =>  canvasFgValid = 0;
      
      idDataInvalid = true;
    };
    this.drawFg = function() {
      var thisCtx = layersClamped ? ctxBg : ctxFg;
      //console.log( 'drawFg -------------------------------------------' );
      //$('#extra').text( 'DrawFg:' +  (new Date().getTime()) );
      clearCanvas( ctxFg );
      //ctxFg.setTransform( 1, 0, 0, 1, 0.5 - 1*$canvasContainer.scrollLeft()*scaleInternal, 0.5 - 1*$canvasContainer.scrollTop()*scaleInternal );
      //ctxFg.setTransform( 1, 0, 0, 1, 0.5 - 1*drawOffset.x*scaleInternal, 0.5 - 1*drawOffset.y*scaleInternal );
      ctxFg.setTransform( 1, 0, 0, 1, 0.5 - 1*viewOffset.x*scaleInternal, 0.5 - 1*viewOffset.y*scaleInternal );
      thisGLE.drawActive( thisCtx, ctxDummy, scale * scaleInternal );
      
      // draw selection rectangle when defined
      if( selectionCorner !== undefined )
      {
        var 
          sC = selectionCorner.copy().scale( scale*scaleInternal ).round(1),
          sS = selectionSize.copy().scale( scale*scaleInternal ).round(1);
        ctxFg.fillStyle = 'rgba(0,0,255,0.25)';
        ctxFg.fillRect  ( sC.x, sC.y, sS.x, sS.y );
        ctxFg.strokeRect( sC.x, sC.y, sS.x, sS.y );
        ctxFg.fillStyle = 'black';
      }
      
      canvasValid = 0;
      // --------------- zeige mausklick
      /*
      ctxFg.beginPath();
      if( lastPos )
      {
        ctxFg.moveTo( lastPos.x-3, lastPos.y-3 );
        ctxFg.lineTo( lastPos.x+3, lastPos.y+3 );
        ctxFg.moveTo( lastPos.x-3, lastPos.y+3 );
        ctxFg.lineTo( lastPos.x+3, lastPos.y-3 );
      }
      ctxFg.save();
      ctxFg.lineWidth = 1;
      ctxFg.strokeStyle = '#ff0000';
      ctxFg.stroke();
      ctxFg.restore();
      */
      // ---------------
    };
    
    /**
     * 
     */
    this.showSelectionArea = function( corner1, corner2 ) {
      if( corner1 === undefined ) { // deselect
        selectionCorner = undefined;
      } else {                      // set selection
        selectionCorner = corner1.copy();
        selectionSize   = corner2.copy().minus( corner1 );
      }
      self.invalidateForeground();
    };
    
    /**
     * Toggle display of grid.
     */
    this.toggleGrid = function() {
      showGrid = !showGrid;
      self.invalidateContext();
    };
    
    /**
     * Debug method to visualise e.g. a mouse click - canvas coordinates!
     */
    this.showMarker = function( pos ) {
      console.log( 'showmarker', pos.print() );
      pos = pos.copy().scale( scaleInternal*scale );
      ctxFg.beginPath();
      ctxFg.moveTo( pos.x-3, pos.y-3 );
      ctxFg.lineTo( pos.x+3, pos.y+3 );
      ctxFg.moveTo( pos.x-3, pos.y+3 );
      ctxFg.lineTo( pos.x+3, pos.y-3 );
      ctxFg.save();
      ctxFg.strokeStyle = '#ff0000';
      ctxFg.lineWidth = 1;
      ctxFg.stroke();
      ctxFg.restore();
      ctxId.beginPath();
      ctxId.moveTo( pos.x-4, pos.y-4 );
      ctxId.lineTo( pos.x-1, pos.y-1 );
      ctxId.moveTo( pos.x+4, pos.y-4 );
      ctxId.lineTo( pos.x+1, pos.y-1 );
      ctxId.moveTo( pos.x+4, pos.y+4 );
      ctxId.lineTo( pos.x+1, pos.y+1 );
      ctxId.moveTo( pos.x-4, pos.y+4 );
      ctxId.lineTo( pos.x-1, pos.y+1 );
      ctxId.save();
      ctxId.strokeStyle = '#ff0000';
      ctxId.lineWidth = 1;
      ctxId.stroke();
      ctxId.restore();
    };
    
    /**
     * Zoom the view by setting it to newScale. 
     * Also make sure that contentPos (in canvas coordinates) stay below 
     * screenPos (in screen coordinates).
     * When temporary is true only a hardware accelerated scaling is done, i.e.
     * it's done without repainting - so it's very fast but not sharp.
     * The callback is called in a new animation frame.
     */
    var oldScale = 1;
    this.zoomView = function( newScale, contentPos, screenPos, isTemporary, callback ) {
      if( undefined === contentPos || undefined === screenPos )
      {
        screenPos = screenSize.copy().scale( 0.5 );
        contentPos = self.screen2canvas( screenPos );
      }
      
      viewOffset = contentPos.copy().scale(newScale).minus(screenPos).round(1).
                    cmax( new Vec2D(0,0) ); 
      applySize( $drawingPl[0].style, contentSize.copy().scale(newScale), 'px' );
      //$canvasContainer.scrollLeft( viewOffset.x );
      //$canvasContainer.scrollTop(  viewOffset.y );
      $canvasContainer[0].scrollLeft = viewOffset.x;
      $canvasContainer[0].scrollTop  = viewOffset.y;
      //viewOffset = getScroll(); // TODO really needed here?
        
      if( isTemporary )
      {
        scale = newScale;
        var tS = newScale / oldScale;
        var thisScale = '' + (newScale / oldScale); // store already as string
        var trans = 'matrix3d(' + thisScale + ',0,0,0, 0,' + thisScale + ',0,0, 0,0,' + thisScale + ',0, '+tS*drawOffset.x+','+tS*drawOffset.y+',0,1)';
        $canvasBg.css( cssTransform, trans );
      } else {
        scale = oldScale = newScale;
        unclampLayers();
        
        fixBackgroundSize();
        self.draw(); // draw NOW, don't wait for the next animation frame
      }
      
      showProps([
        [ 'screenSize',  screenSize.print()  ],
        [ 'contentSize', contentSize.print() ],
        [ 'viewOffset',  viewOffset.print()  ],
        [ 'drawSize',    drawSize.print()    ],
        [ 'drawOffset',  drawOffset.print()  ],
        //[ 'startScroll', startScroll.print() ],
        [ 'newScale',    newScale            ],
        //[ 'centerCoord', centerCoord.print() ],
        //[ 'scrollDist',  scrollDist && scrollDist.print()  ],
        [ 'contentPos',  contentPos.print() ],
        [ 'screenPos',   screenPos.print() ]
      ]);
      
      if( callback !== undefined )
        requestAnimationFrame( callback );
    };
    
    /**
     * Resize the space that is avialable for editing, i.e. that contains
     * all elements, ...
     */
    this.resizeSpace = function( newSpaceSize )
    {
      contentSize = newSpaceSize.copy();
      //self.resizeView();
      fixBackgroundSize();
    };
    
    /**
     * Handle a resized view, e.g. also due to a zoom event.
     * There are different sizes that have to be handled. The basic setup is
     * that there's an <div> ($drawingPl) that has the size that every element
     * could fit on it. It might only be partly visible as the $canvasContainer
     * might be smaller and thus it might be scrolled.
     * Inside the $drawingPl are two canvases - the $canvasBg as a view fixed
     * to the $drawingPl and the $canvasFg fixed to the screen.
     * 
     * The relevant sizes and offsets are called:
     * Object:           Size:                           Offset:
     * $canvasContainer  screenSize                      (none)
     * $drawingPl        contentSize                     viewOffset
     * $canvasBg         drawSize                        drawOffset
     * $canvasFg         screenSize (just as Container)  none / fixed to screen
     * 
     * As the browser might have a zoom set (and retina type displays do) the
     * scaleInternal contains the factor of that (browser) zoom. The "pixel"
     * size and the CSS size of the elements must be adjusted by this factor
     * to make sure that the content is pixel perfect.
     */
    this.resizeView = function() {
      console.log( 'running "resizeView()"');
      screenSize        = new Vec2D( $canvasContainer[0].clientWidth, $canvasContainer[0].clientHeight );
      var
        devicePixelRatio  = window.devicePixelRatio || 1,
        backingStoreRatio = ctxFg.webkitBackingStorePixelRatio ||
                            ctxFg.mozBackingStorePixelRatio    ||
                            ctxFg.msBackingStorePixelRatio     ||
                            ctxFg.oBackingStorePixelRatio      ||
                            ctxFg.backingStorePixelRatio       || 1,
        scaleInternalNew  = devicePixelRatio / backingStoreRatio,
        // available screenspace that is visible
        // space of the canvas on the screen before browser zoom
        //clientSize        = screenSize.copy().plus( getScroll() ).cmax( contentSize.copy().scale(scale) ).floor(),
        //clientSize        = screenSize.copy().plus( getScroll() ).cmax( contentSize.copy().scale(scale) ).cmin( thisGLE.settings.maxCanvasSize.copy().scale(1/scaleInternal) ).floor(),
        clientSize        = screenSize.copy().plus( viewOffset ).cmax( contentSize.copy().scale(scale) ).cmin( thisGLE.settings.maxCanvasSize.copy().scale(1/scaleInternal) ).floor(),
        isFgViewResized   = false,
        isViewResized     = false;
        
      // thisGLE.settings.maxCanvasSize
      // thisGLE.settings.maxCanvasArea
      
      // figure out if the browser zoom was changed
      if( scaleInternal !== scaleInternalNew )
      {
        scaleInternal = scaleInternalNew;
        isViewResized = true;
      }
      
      if( neqSize( $canvasFg[0], screenSize.copy().scale(scaleInternal).round(1) ) ||
          neqSize( $canvasFg[0].style, screenSize, 'px' ) )
      {
        applySize( $canvasFg[0], screenSize.copy().scale(scaleInternal).round(1) );
        applySize( $canvasFg[0].style, screenSize, 'px' );
        isFgViewResized = true;
        
        idBuffer.width  = $canvasFg[0].width;
        idBuffer.height = $canvasFg[0].height;
        idBuffer.style.width  = $canvasFg[0].style.width;  // for debug FIXME
        idBuffer.style.height = $canvasFg[0].style.height; // for debug FIXME
      }
      
      fixBackgroundSize();
      /*
      if( !drawSize.equal( clientSize.copy().scale(scaleInternal).round(1) ) ||
          neqSize( $canvasBg[0].style, clientSize, 'px' ) )
      {
        drawSize = clientSize.copy().scale(scaleInternal).round(1);
        
        applySize( $drawingPl[0].style, clientSize, 'px' );
        applySize( $canvasBg[0], drawSize );
        applySize( $canvasBg[0].style, clientSize, 'px' );
        isViewResized = true;
      
        //idBuffer.width  = $canvasBg[0].width;
        //idBuffer.height = $canvasBg[0].height;
        //idBuffer.style.width  = $canvasBg[0].style.width;  // for debug FIXME
        //idBuffer.style.height = $canvasBg[0].style.height; // for debug FIXME
      }*/

      $('#extra').text(drawSize.x+'/'+drawSize.y+' ['+(drawSize.x*drawSize.y/1000000)+']');
      showProps([
        [ 'screenSize',  screenSize.print()  ],
        [ 'contentSize', contentSize.print() ],
        [ 'getScroll',   getScroll().print() ],
        [ 'viewOffset',  viewOffset.print()  ],
        [ 'drawSize',    drawSize.print()    ],
        [ 'drawOffset',  drawOffset.print()  ]
      ]);
      if( isViewResized || self.updateBg )
      {
        //console.log( 'resizeView - it was resized' );
        //self.invalidateContext();
        self.draw();
      } else if( isFgViewResized )
      {
        console.log( 'resizeFgView - it was resized' );
        self.drawFg();
      }
    };
    
    /**
     * 
     */
    this.scroll = function( force )
    {
      if( layersClamped )
        return;
      
      var currentScroll = getScroll();
      if( force || !viewOffset.equal( currentScroll ) ) {
        viewOffset = currentScroll;
        $canvasFg[0].style.left = currentScroll.x + 'px';
        $canvasFg[0].style.top  = currentScroll.y + 'px';
        self.invalidateForeground();
        fixBackgroundPosition();
      }
    };
    
    ///////////////////////////////////////////////////////////////////////////
    // constructor
    //$canvasContainer.append( '<canvas id="canvas_fg" style="position:absolute;z-index:100;"/><canvas id="canvas_bg"/>' );
    $canvasContainer.append( '<div id="drawingplane" style="width:500;height:500;"><canvas id="canvas_bg"/><div id="klick" style="top:10px;left:10px;"></div><div id="klack" style="top:10px;left:10px;"></div></div><canvas id="canvas_fg" style="position:absolute;z-index:100;top:0;left:0"/>' );
    //$canvasContainer.append( '<canvas id="canvas_bg"/><canvas id="canvas_fg" style="position:absolute;z-index:100;top:0;left:0"/>' );
    $drawingPl = $canvasContainer.find('#drawingplane');
    $canvasFg  = $canvasContainer.find('#canvas_fg');
    $canvasBg  = $canvasContainer.find('#canvas_bg');
    
    // check for browser to set the correct prefix, based on 
    // https://gist.github.com/lorenzopolidori/3794226
    (function(){
      var el         = $canvasBg[0],
          transforms = {
            'webkitTransform': '-webkit-transform',
            'OTransform'     : '-o-transform',
            'msTransform'    : '-ms-transform',
            'MozTransform'   : '-moz-transform',
            'transform'      : 'transform'
          };
      for( var t in transforms ) {
        if( el.style[t] !== undefined ){
          el.style[t] = 'translate3d(1px,1px,1px)';
          var has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
          if( has3d !== undefined && has3d.length > 0 && has3d !== "none" )
            cssTransform = t;
        }
      }
      $canvasBg.css( cssTransform + '-origin', '0px 0px'        );
      $canvasBg.css( cssTransform            , 'scale3d(1,1,1)' );
    })();
    
    ctxFg       = $canvasFg[0].getContext('2d');
    ctxBg       = $canvasBg[0].getContext('2d');
    idBuffer    = document.createElement('canvas');
    ////
    $('#drawArea').append( idBuffer ); // for debug FIXME
    ////
    //$canvasFg[0].width  = ($canvasContainer[0].clientWidth * scaleInternal) | 0;
    //$canvasFg[0].height = ($canvasContainer[0].clientHeight * scaleInternal) | 0;
    
    //idBuffer.style.width  = $canvasFg[0].style.width; // for debug FIXME
    //idBuffer.style.height = $canvasFg[0].style.height; // for debug FIXME
    ctxId       = idBuffer.getContext('2d');
    setSmoothingEnabled( ctxFg, false );
    setSmoothingEnabled( ctxId, false );
    self.resizeView(); // sets also 'width' and 'height'
  };
  
  
  view.prototype.toString = function(){
    return '[object GLE:block]';
  };
  
  // create namespace if necessary
  if( undefined === window._GLE )
    window._GLE = {};
  
  if( undefined !== window._GLE.view )
    throw 'Error: "view" already in "_GLE" namespace!';
  
  window._GLE.view = view;
})( window );