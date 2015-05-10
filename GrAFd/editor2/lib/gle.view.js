/**
 * gle.block.js (C) 2013-2015 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 * This file contains the "view" of the editor / data.
 */
 
// create a local context:
define( ['lib/Vec2D', 'lib/Mat2D'], function( Vec2D, Mat2D, undefined ) {
  "use strict";
  
  /**
   * View constructor.
   * @module GLE.view
   * @title  GrAF logic engine: graphical logic editor
   * @constructor
   */
  var view = function( $canvasContainer, thisGLE ){
    if( !( this instanceof view ) )
      throw 'Error, use "new" operator for View!';
    
    // private:
    var self     = this,
        // constants
        Vec2DZero = new Vec2D( 0, 0 ),
        // cross browser compatabilities:
        requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame || window.msRequestAnimationFrame,
        cancelAnimationFrame  = window.cancelAnimationFrame || window.mozCancelAnimationFrame ||
                                window.webkitCancelAnimationFrame || window.msCancelAnimationFrame,
        cssTransform          = 'transform', // to be overwritten by the browser test
        $canvasContainerOffset = $canvasContainer.offset(),
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
        transformFg = new Mat2D(), // transformation matrix
        ctxBg,               // background canvas context
        transformBg = new Mat2D(), // transformation matrix
        canvasValid   = 0,   // Collect if canvas has to be redrawn
        canvasFgValid = 0,   // Collect if canvas has to be redrawn
        layersClamped = false, // True when the forground should also be painted on the background
        /*
        ctxDummy = {         // dummy context, can be passed as a context
          beginPath: function(){},
          moveTo: function(){},
          lineTo: function(){},
          stroke: function(){},
          fillRect: function(){}
        },*/
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
          * Clear a canvas given by its context.
          * This will also make sure the transform matrix is set properly, i.e.
          * scaled.
          */
        clearCanvas = function( ctx )
        {
          ctx.setTransform( 1, 0, 0, 1, 0, 0 );
          ctx.clearRect( 0, 0, drawSize.x, drawSize.y );
          ( ctx === ctxFg ? transformFg : transformBg ).replace( 
            1, 0.0, 0.0, 1, 0.5 - drawOffset.x*scaleInternal, 0.5 - drawOffset.y*scaleInternal 
          ).setTransform( ctx );
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
          
          $canvasFg.css( 'display', 'none' );
          self.draw(); // draw everything NOW as the clamping is done to allow
                       // the next manipulations to be done without drawing...
        },
        /**
         * 
         */
        unclampLayers = function() {
          if( !layersClamped ) return;
 
          layersClamped = false;
          
          $canvasFg.css( 'display', '' );
          self.scroll( true ); // update as it might be unsynchronised during clamping
          
          self.invalidateContext();
        },
        /**
         * Position background canvas, e.g. after a scroll event.
         */
        fixBackgroundPosition = function() {
          var drawSizeScaled = drawSize.copy().scale(1/scaleInternal);
          drawOffset = viewOffset.copy().minus( drawSizeScaled.copy().minus(screenSize).scale(0.5) )
            .cmin( contentSize.copy().scale(scale).minus(drawSizeScaled) ) // no need to draw empty space in the bottom right
            .cmax( Vec2DZero );                                            // no need to draw in the negative region
          
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
              
          if( !drawSize.equal( clientSize.copy().scale(scaleInternal).round(1) ) ||
              neqSize( $canvasBg[0].style, clientSize, 'px' ) )
          {
            drawSize = clientSize.copy().scale(scaleInternal).round(1);
            
            // TODO: was: 
            //applySize( $drawingPl[0].style, contentSize.copy().scale(scale), 'px' );
            // FIXME: quick fix now:
            applySize( $drawingPl[0].style, drawSize, 'px' );
            
            //applySize( $drawingPl[0].style, clientSize, 'px' );
            applySize( $canvasBg[0], drawSize );
            applySize( $canvasBg[0].style, clientSize, 'px' );
          }
          fixBackgroundPosition(); // put it on the correct position
        },
 
        foo = 0;
    
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
      return new Vec2D( pageX - $canvasContainerOffset.left, 
                        pageY - $canvasContainerOffset.top );
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
      * Draw a handler at the given positions with the id. If @param active
      * is true the handler will be visible and at the foreground as well.
      * @param pos Vec2D
      */
    this.drawHandler = function( pos, handler, active ) {
      var thisScale  = scale * scaleInternal,
          halfSizeFg = (thisGLE.settings.drawSizeHandleActive * thisScale)|0,
          fullSizeFg = 1 + 2 * halfSizeFg,
          halfSizeId = Math.min(thisGLE.settings.toleranceHandle * ((thisScale>1)?thisScale:1), halfSizeFg)|0,
          fullSizeId = 1 + 2 * halfSizeId;
          
      if( active && !layersClamped ) {
        ctxFg.lineWidth = 1;
        ctxFg.fillRect( pos.x - halfSizeFg, pos.y - halfSizeFg, fullSizeFg, fullSizeFg );
        ctxFg.strokeRect( pos.x - halfSizeFg, pos.y - halfSizeFg, fullSizeFg, fullSizeFg );
      }
    }
    
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
     * Update - depending on necessity - the foreground or the foreground and
     * the background.
     */
    this.updateContext = function()
    {
      if( self.updateBg )
      {
        self.draw();
      }
      else
        self.drawFg();
    }
    
    /**
     * Redraw canvases.block
     */
    this.draw = function() {
      clearCanvas( ctxBg );
      clearCanvas( ctxFg );
      //console.log( 'draw ---------------------------------------------' );
      //$('#extra').text( 'Draw:' +  (new Date().getTime()) );
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
      
      transformFg.replace( 1, 0.0, 0.0, 1, 0.5 - 1*viewOffset.x*scaleInternal, 0.5 - 1*viewOffset.y*scaleInternal ).setTransform( ctxFg );
      thisGLE.draw( function(isActive){ return isActive ? [ctxFg, transformFg] : [ctxBg, transformBg]; }, scale * scaleInternal );
      
      // show debug:
      ctxBg.save();
      ctxBg.setTransform( 1, 0, 0, 1, 0, 0 );
      ctxBg.fillStyle = 'rgba(100,100,200,0.75)';
      ctxBg.fillRect( 0, 0, drawSize.x, drawSize.y );
      ctxBg.restore();
      self.updateBg = false;
      //self.drawFg(); // =>  canvasFgValid = 0;
      canvasValid = 0;
    };
    this.drawFg = function() {
      var thisCtx = layersClamped ? [ctxBg, transformBg] : [ctxFg, transformFg];
      //console.log( 'drawFg -------------------------------------------' );
      //$('#extra').text( 'DrawFg:' +  (new Date().getTime()) );
      clearCanvas( ctxFg );
      transformFg.replace( 1, 0.0, 0.0, 1, 0.5 - 1*viewOffset.x*scaleInternal, 0.5 - 1*viewOffset.y*scaleInternal ).setTransform( ctxFg );
      thisGLE.drawActive( thisCtx, scale * scaleInternal );
      
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
      if( undefined === screenPos )
        screenPos = screenSize.copy().scale( 0.5 );
      
      if( undefined === contentPos )
        contentPos = self.screen2canvas( screenPos );
      
      var newPlaneSize = contentSize.copy().scale( newScale );
      viewOffset = contentPos.copy().scale(newScale).minus(screenPos).round(1)
                    .cmax( Vec2DZero )
                    .cmin( newPlaneSize ); 
      applySize( $drawingPl[0].style, newPlaneSize, 'px' );
      $canvasContainer[0].scrollLeft = viewOffset.x;
      $canvasContainer[0].scrollTop  = viewOffset.y;
        
      if( isTemporary )
      {
        clampLayers();
        scale = newScale;
        var tS = newScale / oldScale;
        var thisScale = '' + tS; // store already as string
        var trans = 'matrix3d(' + thisScale + ',0,0,0, 0,' + thisScale + ',0,0, 0,0,' + thisScale + ',0, '+tS*drawOffset.x+','+tS*drawOffset.y+',0,1)';
        $canvasBg.css( cssTransform, trans );
      } else {
        scale = oldScale = newScale;
        unclampLayers();
        
        fixBackgroundSize();
        self.draw(); // draw NOW, don't wait for the next animation frame
      }
      
      false && showProps([
        [ 'screenSize',  screenSize.print()  ],
        [ 'contentSize', contentSize.print() ],
        [ 'viewOffset',  viewOffset.print()  ],
        [ 'scroll', (new Vec2D($canvasContainer[0].scrollLeft,$canvasContainer[0].scrollTop)).print() ],
        [ 'drawSize',    drawSize.print()    ],
        [ 'drawOffset',  drawOffset.print()  ],
        //[ 'startScroll', startScroll.print() ],
        [ 'newScale',    newScale            ],
        //[ 'centerCoord', centerCoord.print() ],
        //[ 'scrollDist',  scrollDist && scrollDist.print()  ],
        [ 'contentPos',  contentPos.print()  ],
        [ 'screenPos',   screenPos.print()   ]
      ]);
      
      if( callback !== undefined )
        requestAnimationFrame( callback );
    };
    
    /**
     * Calculate zoom factor that is needed to make size fullscreen.
     * @param newSize {Vec2D} The size to fit in the full screen
     */
    this.zoomGetFactor = function( newSize ) {
      var factor = screenSize.copy().cdiv( newSize );
      return (factor.x < factor.y) ? factor.x : factor.y;
    };
    
    /**
     * Resize the space that is avialable for editing, i.e. that contains
     * all elements, ...
     */
    this.resizeSpace = function( newSpaceSize )
    {
      contentSize = newSpaceSize.copy();
      fixBackgroundSize();
    };
    
    /**
     * Handle a resized view, also due to a zoom event.
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
        containerOffset   = $canvasContainer.offset(),
        scrollDelta       = new Vec2D( 
                              containerOffset.left - $canvasContainerOffset.left,
                              containerOffset.top  - $canvasContainerOffset.top
                            ),
        isFgViewResized   = false,
        isViewResized     = false;
        
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
      }
        
      // figure out if the container was moved, i.e. it's offset was changed
      if( scrollDelta.x !== 0 || scrollDelta.y !== 0 )
      {
        self.scrollDelta( scrollDelta );
        $canvasContainerOffset = containerOffset;
      }
      
      fixBackgroundSize();

      //$('#extra').text(drawSize.x+'/'+drawSize.y+' ['+(drawSize.x*drawSize.y/1000000)+']');
      false && showProps([
        [ 'screenSize',  screenSize.print()  ],
        [ 'contentSize', contentSize.print() ],
        [ 'getScroll',   getScroll().print() ],
        [ 'viewOffset',  viewOffset.print()  ],
        [ 'drawSize',    drawSize.print()    ],
        [ 'drawOffset',  drawOffset.print()  ]
      ]);
      if( isViewResized || self.updateBg )
      {
        self.draw();
      } else if( isFgViewResized )
      {
        self.drawFg();
      }
    };
    
    /**
     * Handle a scroll event.
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
    
    /**
     * Scroll by external request.
     */
    this.scrollDelta = function( delta )
    {
      if( delta.x !== 0 )
        $canvasContainer.scrollLeft( $canvasContainer.scrollLeft() + delta.x );
      
      if( delta.y !== 0 )
        $canvasContainer.scrollTop( $canvasContainer.scrollTop() + delta.y );
    }
    
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
    //$canvasFg[0].width  = ($canvasContainer[0].clientWidth * scaleInternal) | 0;
    //$canvasFg[0].height = ($canvasContainer[0].clientHeight * scaleInternal) | 0;
    
    setSmoothingEnabled( ctxFg, false );
    self.resizeView(); // sets also 'width' and 'height'
  };
  
  view.prototype.toString = function(){
    return '[object GLE:block]';
  };
  
  return view;
});