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
        requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame || window.msRequestAnimationFrame,
        cancelAnimationFrame  = window.cancelAnimationFrame || window.mozCancelAnimationFrame ||
                                window.webkitCancelAnimationFrame || window.msCancelAnimationFrame,
        width,               // size of the draw area
        height,
        contentWidth  = 0,   // maximum needed size of the content
        contentHeight = 0,
        scaleInternal = window.devicePixelRatio,
        scale         = 1,   // overall scale
        $canvasFg,           // jQ object with the foreground canvas DOM element
        $canvasBg,           // jQ object with the background canvas DOM element
        ctxFg,               // foreground canvas context
        ctxBg,               // background canvas context
        canvasValid   = 0,   // Collect if canvas has to be redrawn
        canvasFgValid = 0,   // Collect if canvas has to be redrawn
        //activeElements = [], // The active elements, i.e. the one on the Fg
        //focusElements = [],  // The focused elements, i.e. the user selected ones
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
          var idxPos = (Math.round(thisPos.x*scale*scaleInternal) + width * Math.round(thisPos.y*scale*scaleInternal))|0;
          return ( (idData[ idxPos*4 ] << 16) + (idData[ idxPos*4+1 ] << 8) + idData[ idxPos*4+2 ] )|0;
        },
        /**
          * Clear a canvas given by its context.
          * This will also make sure the transform matrix is set properly, i.e.
          * scaled.
          */
        clearCanvas = function( ctx )
        {
          ctx.setTransform( 1, 0, 0, 1, 0, 0 );
          ctx.clearRect( 0, 0, width, height );
          var s = scale * scaleInternal;
          ctx.setTransform( s, 0, 0, s, 0.5, 0.5 );
          //ctx.setTransform( scale, 0, 0, scale, 0.5, 0.5 );
          //ctx.setTransform( 1, 0, 0, 1, 0.5, 0.5 );
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
 
        foo = 0;
    
    this.position2id = position2id; // FIXME make visible
    
    this.getForeground = function() {
      return $canvasFg;
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
      var halfSizeFg = thisGLE.settings.drawSizeHandleActive,
          fullSizeFg = 1 + 2 * halfSizeFg,
          halfSizeId = thisGLE.settings.toleranceHandle,
          fullSizeId = 1 + 2 * halfSizeId;
          
      if( active ) {
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
    
    this.updateContext = function()
    {
      //self.updateContentSize(); // FIXME move to a place where that's only called when necessary
      
      if( self.updateBg )
        self.draw();
      else
        self.drawFg();
    }
    
    /**
      * Redraw canvases.block
      */
    this.draw = function() {
      var activeElements = thisGLE.activeElements(),
          focusElements  = thisGLE.focusElements();
      console.log( 'draw ---------------------------------------------' );
      clearCanvas( ctxId );
      clearCanvas( ctxBg );
      thisGLE.blocks.forEach( function drawBlocks_PROFILENAME( thisBlock, index ){
        var thisActive = activeElements.indexOf( thisBlock ) !== -1;//(thisBlock === activeElement);
        var thisFocus  = focusElements.indexOf( thisBlock ) !== -1;
        thisBlock.draw( thisActive ? ctxFg : ctxBg, ctxId, thisFocus, false );
      } );
      // show debug:
      ctxBg.save();
      ctxBg.setTransform( 1, 0, 0, 1, 0, 0 );
      ctxBg.fillStyle = 'rgba(100,100,200,0.75)';
      ctxBg.fillRect( 0, 0, width, height );
      ctxBg.restore();
      self.updateBg = false;
      self.drawFg(); // =>  canvasFgValid = 0;
      
      idData = ctxId.getImageData( 0, 0, width, height ).data;
    };
    this.drawFg = function() {
      var activeElements = thisGLE.activeElements(),
          focusElements  = thisGLE.focusElements();
      //console.log( 'drawFg -------------------------------------------' );
      clearCanvas( ctxFg );
      var s = scale * scaleInternal;///scaleInternal;
      ctxFg.setTransform( s, 0, 0, s, 0.5 - 1*$canvasContainer.scrollLeft()*scaleInternal, 0.5 - 1*$canvasContainer.scrollTop()*scaleInternal );
      activeElements.forEach( function( thisActiveElement ) {
        var thisFocus  = focusElements.indexOf( thisActiveElement ) !== -1;
        thisActiveElement.draw( ctxFg, ctxDummy, thisFocus, true );
      } );
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
     * Debug method to visualise e.g. a mouse click
     */
    this.showMarker = function( pos ) {
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
     * 
     */
    this.zoomView = function( Nscale, NscaleInternal, centerCoord ) {
      var cFg = $canvasFg[0],
          cBg = $canvasBg[0];
      scale = Nscale;
      self.resizeView();
      /*
      cFg.style.top = cFg.style.left = '0px'; // move it out of the way
      cBg.width  = (contentWidth  + thisGLE.settings.borderWidth ) * scale | 0;
      cBg.style.width  = ((cBg.width  / scaleInternal)|0) + 'px';
      cBg.height = (contentHeight + thisGLE.settings.borderWidth ) * scale | 0;
      cBg.style.height = ((cBg.height / scaleInternal)|0)+ 'px';
      idBuffer.width = cBg.width; // for debug FIXME
      idBuffer.height = cBg.height; // for debug FIXME
      idBuffer.style.width = $canvasBg[0].style.width; // for debug FIXME
      idBuffer.style.height = $canvasBg[0].style.height; // for debug FIXME
      */
      if( undefined !== centerCoord )
      {
        /* TODO
        var mouseCanvas = centerCoord,
            //mouseSceen  = mouseCanvas.copy().scale( oldScale / scaleInternal ), // incl. scroll
            mouseSceen_ = mouseCanvas.copy().scale( oldScale / scaleInternal ), // incl. scroll - the point to move under the mouse
            mouseSceen  = mouseCanvas.copy().scale( scale / scaleInternal ), // incl. scroll - the point to move under the mouse
            mouseSceenO = mouseSceen.copy().scale( scaleInternal / scale ), //minus( oldScroll );
            mouseDelta  = mouseSceen.copy().minus( mouseSceenO ),
            newScroll   = oldScroll.copy().scale( scale/scaleInternal ).plus( mouseDelta ).round( 1 );
        console.log( //'mouseCanvas', mouseCanvas.print(1), 
                      'mouseRelOld', mouseRelOld.print(), 
                      'mouseSceenOld', mouseScreenOld.print(1), 
                      'mouseSceen', mouseSceen.print(1), 
                      //'mouseSceenO', mouseSceenO.print(1), 
                      //'mouseDelta', mouseDelta.print(1), 
                      //'oldScroll', oldScroll.print() ,
                      'newScroll', newScroll.print() 
                    );
        //console.log( 'scr', scale, $canvasContainer.width(), width, centerCoord.x, ($canvasContainer.scrollLeft() + centerCoord.x)/scale );
        //console.log( 'scr C', centerCoord );
        //$canvasContainer.scrollLeft( ($canvasContainer.scrollLeft() + centerCoord.x)/scale );
        $canvasContainer.scrollLeft( newScroll.x );
        $canvasContainer.scrollTop( newScroll.y );
        //$canvasContainer.scrollTop();
        */
      }
      
      self.invalidateContext();
    };
    
    /**
     * Resize the space that is avialable for editing, i.e. that contains
     * all elements, ...
     */
    this.resizeSpace = function( newSpaceSize )
    {
      contentWidth  = newSpaceSize.x;
      contentHeight = newSpaceSize.y;
      self.resizeView();
    };
    
    /**
     * 
     */
    this.resizeView = function() {
      var devicePixelRatio  = window.devicePixelRatio || 1,
          backingStoreRatio = ctxFg.webkitBackingStorePixelRatio ||
                              ctxFg.mozBackingStorePixelRatio    ||
                              ctxFg.msBackingStorePixelRatio     ||
                              ctxFg.oBackingStorePixelRatio      ||
                              ctxFg.backingStorePixelRatio       || 1,
          scaleInternalNew  = devicePixelRatio / backingStoreRatio,
          screenWidth       = $canvasContainer[0].clientWidth,           // available screenspace that is visible
          screenHeight      = $canvasContainer[0].clientHeight,
          clientWidth       = Math.max( screenWidth  + $canvasContainer.scrollLeft(), contentWidth  * scale )|0, // space of the canvas on the screen before browser zoom
          clientHeight      = Math.max( screenHeight + $canvasContainer.scrollTop() , contentHeight * scale )|0,
          isFgViewResized   = false,
          isViewResized     = false;
          
      if( scaleInternal !== scaleInternalNew )
      {
        scaleInternal = scaleInternalNew;
        isViewResized = true;
      }
      
      if( ($canvasFg[0].width  !== Math.round( screenWidth  * scaleInternal )) ||
          ($canvasFg[0].height !== Math.round( screenHeight * scaleInternal )) ||
          ($canvasFg[0].style.width  !== screenWidth  + 'px') ||
          ($canvasFg[0].style.height !== screenHeight + 'px') )
      {
        $canvasFg[0].width  = Math.round( screenWidth  * scaleInternal );
        $canvasFg[0].height = Math.round( screenHeight * scaleInternal );
        $canvasFg[0].style.width  = screenWidth  + 'px';
        $canvasFg[0].style.height = screenHeight + 'px';
        isFgViewResized = true;
      }
      
      if( (width  !== Math.round(clientWidth  * scaleInternal)) ||
          (height !== Math.round(clientHeight * scaleInternal)) ||
          ($canvasBg[0].style.width  !== clientWidth  + 'px') ||
          ($canvasBg[0].style.height !== clientHeight + 'px') )
      {
        width  = Math.round(clientWidth  * scaleInternal);
        height = Math.round(clientHeight * scaleInternal);
        
        $canvasBg[0].width  = width;
        $canvasBg[0].height = height;
        $canvasBg[0].style.width  = clientWidth  + 'px';
        $canvasBg[0].style.height = clientHeight + 'px';
        isViewResized = true;
      
        idBuffer.width  = $canvasBg[0].width;              // for debug FIXME
        idBuffer.height = $canvasBg[0].height;             // for debug FIXME
        idBuffer.style.width  = $canvasBg[0].style.width;  // for debug FIXME
        idBuffer.style.height = $canvasBg[0].style.height; // for debug FIXME
      }

      if( isViewResized )
      {
        console.log( 'resizeView - it was resized' );
        //self.invalidateContext();
        self.draw();
      } else if( isViewResized )
      {
        console.log( 'resizeFgView - it was resized' );
        self.drawFg();
      }
    };
    
    /**
     * 
     */
    this.scroll = function()
    {
      $canvasFg[0].style.left = $canvasContainer.scrollLeft() + 'px';
      $canvasFg[0].style.top  = $canvasContainer.scrollTop()  + 'px';
      
      //self.resizeView();
      //self.invalidateContext();
      self.invalidateForeground();
    };
    
    // constructor
    $canvasContainer.append( '<canvas id="canvas_fg" style="position:absolute;z-index:100;"/><canvas id="canvas" style="-webkit-transform: scale3d(1,1,1);"/>' );
    $canvasFg   = $canvasContainer.find('#canvas_fg');
    $canvasBg   = $canvasContainer.find('#canvas');
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