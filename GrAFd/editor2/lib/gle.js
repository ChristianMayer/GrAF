/**
 * gle.js (C) 2013-2015 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 */

/**
 * @module GLE
 * @title  GrAF logic engine: graphical logic editor
 */
define( ['lib/Vec2D', 'lib/gle.settings', 'lib/gle.block', 'lib/gle.connection',
         'lib/gle.gesture', 'lib/gle.inputevent', 'lib/gle.view' ], 
  function( Vec2D,    Settings,           Block,           Connection,
          Gesture,          Inputevent,           View ) {
  "use strict";
  
  // private functions / classes:
  
  /**
   * Class Bucket to quickly look up elements based on bounding boxes and their
   * positions.
   */
  function Bucket()
  {
    var
      container = [],
      tileNumbers = new Vec2D( 10, 10 ),
      tileSize = new Vec2D( 100, 100 ); // dummy values - will be updated later
    
    /**
     * Look up Bucket ID by position.
     * @param {Vec2D} position
     */
    function getBucketID2D( position ){
      //console.log( 'Bucket - getBucketID2D', position );
      return position.copy().cdiv( tileSize ).floor();
    }
    
    /**
     * Calculate one dimensional ID out of ID2D.
     */
    function getBucketID( ID2D )
    {
      //console.log( 'Bucket - getBucketID', ID2D, container );
      if( ID2D.x < tileNumbers.x && ID2D.y < tileNumbers.y )
        return ID2D.x + ID2D.y * tileNumbers.x;
      
      return container.length - 1;
    }
    
    /**
      * Empty the Bucket.
      */
    this.clear = function() {
      //console.log( 'Bucket - clear' );
      container.length = tileNumbers.x * tileNumbers.y + 1;
      
      for( var i = 0, len = container.length; i < len; i++ )
      {
        if( Array.isArray( container[i] ) )
          container[i].length = 0;
        else
          container[i] = [];
      };
    };
    
    /**
     * Debug function: draw tiles
     */
    this.draw = function( ctx, scale ) {
      var 
        context = ctx[0],
        transform = ctx[1];
        
      context.beginPath();
      for( var x = 0; x < tileNumbers.x; x++ )
      {
        context.moveTo( scale * x * tileSize.x, 0 );
        context.lineTo( scale * x * tileSize.x, scale * tileNumbers.y * tileSize.y );
      }
      for( var y = 0; y < tileNumbers.y; y++ )
      {
        context.moveTo( 0                         , scale * y * tileSize.y );
        context.lineTo( scale * tileNumbers.x * tileSize.x, scale * y * tileSize.y );
      }
      context.stroke();
      for( var x = 0; x < tileNumbers.x; x++ )
      {
        for( var y = 0; y < tileNumbers.y; y++ )
        {
          context.fillText( container[x+y*tileNumbers.x].length, scale * (x+0.5)*tileSize.x, scale * (y+0.5)*tileSize.y );
        }
      }
    };
    
    /**
     * Fill the Bucket based on a list of elements.
     * @param list {Array}
     * @param maxSize {Vec2D} the maximum size to care for
     */
    this.fill = function( list, maxSize ) {
      this.clear();
      tileSize.replace( maxSize ).cdiv( tileNumbers );
      
      list.forEach( this.insert );
    };
    
    /**
     * Look up elements in Bucket tile by position.
     * @param {Vec2D} position
     * @return {Array} List of elements
     */
    this.getElements = function( position ){
      return container[ getBucketID( getBucketID2D( position ) ) ];
    };
    
    /**
     * Look up all elements within an area.
     * @param {Vec2D} topLeft
     * @param {Vec2D} bottomRight
     * @return {Array} List of elements
     */
    this.getElementsInArea = function( topLeft, bottomRight ) {
      var
        tl = getBucketID2D( topLeft ),
        br = getBucketID2D( bottomRight ),
        ret_array = [];
        
      for( var x = tl.x; x <= br.x; x++ )
      {
        for( var y = tl.y; y <= br.y; y++ )
        {
          container[ x + y * tileNumbers.x ].forEach( function( element ){
            if( -1 === ret_array.indexOf( element ) )
              ret_array.push( element );
          });
        }
      }
        
      return ret_array;
    };
    
    /**
     * Insert a single element in the Bucket
     */
    this.insert = function( element ){
      var
        tl = getBucketID2D( element.getTopLeft() ),
        br = getBucketID2D( element.getBottomRight() );
        
      for( var pos = tl.copy(); pos.x <= br.x; pos.x++ )
        for( pos.y = tl.y; pos.y <= br.y; pos.y++ )
          container[ getBucketID( pos ) ].push( element );
    };
    
    // Constructor:
    this.clear();
  }
  
  /**
   * GrAF logic engine: graphical logic editor.
   * @exports GLE
   */
  // private variables:
  var mousemove = 'mousemove', // will be redefined on a touch device
      mouseup   = 'mouseup',
      contentSize = new Vec2D( 0, 0 ), // maximum needed size of the content
      scale         = 1,   // overall scale / zoom level
      scaleFactor   = Math.pow(2,1/3),
      scaleID       = 0,   // running number to make sure that no multiple animations are running
      scaleTarget   = 1,   // zoomlevel to animate to
      $canvasContainer,    // jQ object containing the canvases and the scroll bars
      //handlerList = [[]],  // array of elements to draw, first element has to be empty as it corresponds to the background
      activeElements = [], // The active elements, i.e. the one on the Fg
      bucket        = new Bucket(), // the 2D lookup structure
 
      /**
       * The GLE constructor
       */
      GLE = function( passedCanvasContainer ) {
        // private:
        var 
          self = this, 
          blocks = [],  // array of all existent blocks
          view,
          // private methods:
          /**
           * Return array of two Vec2D that define the bounding box of the 
           * current content (i.e. blocks and connections.)
           * @param elements {Array} Array of the elements for the calculation
           *                         or undefined if all.
           */
          getBoundingBox = function( elements ) {
            if( undefined === elements )
              //elements = handlerList.map( function(a){return a[0];} );
              elements = blocks;
            
            if( 0 === elements.length )
              return [ new Vec2D(0, 0), new Vec2D( 0, 0 ) ];
            
            //var firstElement = elements.shift();
            //if( undefined === firstElement )  // when all elements are passed the fist is undefined as it is a placeholder for the background
            //  firstElement = elements.shift();
            
            var
              topLeft    ,// = new Vec2D(Infinity,Infinity);//firstElement.getTopLeft(),
              bottomRight;// = new Vec2D(-1,-1);//firstElement.getBottomRight();
              
            elements.forEach( function( thisElement ){
              if( undefined === topLeft )
              {
                topLeft     = thisElement.getTopLeft().copy();
                bottomRight = thisElement.getBottomRight().copy();
              } else {
                topLeft.cmin( thisElement.getTopLeft() );
                bottomRight.cmax( thisElement.getBottomRight() );
              }
            });
            
            console.log( 'gle getBoundingBox', topLeft, bottomRight );
            return [ topLeft, bottomRight ];
          },
          dummy = true;
          
        /**
         * Constants to define mask to look for element types during interaction
         */
        this.InterestMap = {
          Block:                    1<<0,
          InPortOpen:               1<<1,
          InPortConnected:          1<<2,
          InPort:                   1<<2|1<<1,
          OutPortOpen:              1<<3,
          OutPortConnected:         1<<4,
          OutPort:                  1<<4|1<<3,
          Connection:               1<<5,
          ConnectionStartOpen:      1<<6,
          ConnectionStartConnected: 1<<7,
          ConnectionStart:          1<<7|1<<6,
          ConnectionEndOpen:        1<<8,
          ConnectionEndConnected:   1<<9,
          ConnectionEnd:            1<<9|1<<8,
          /////////////////////////////////////////////////////////
          None:                     0,        // universal selector
          Any:                      (1<<16)-1 // universal selector
        };
        
        /**
         * Update the state information that the user can see
         */
        this.updateStateInfos = (function(){
          var $zoom = $('#zoom'); // cache DOM element
          return function() {
            $zoom.text( Math.round(scale * 100) + '% (scale: ' + scale + ' / scaleInternal: ' + 'n/a' + ')' );
          }
        })();
          
        /**
         * Get the user tuneable settings.
         */
        this.settings = new Settings();
        
        /**
         * Make view visible to the outside. - FIXME DEBUG
         */
        this.view           = function(){ return view;           };
        //this.activeElements = function(){ return activeElements; };
        //this.blocks = blocks; // FIXME only for transision
        
        /**
         * Delete everything - clears the full drawing plane.
         */
        this.deleteEverything = function() {
          console.warn( 'GLE.deleteEverything !!!!!!!!!!!!!!!');
          //bucket.clear();
          self.selection.clear();
          
          blocks.forEach( function(block){
            block.delete();
          });
          blocks = [];
          
          //view.invalidateContext();
          self.invalidateBBox();
        }
        
        /**
         * Create and register a new block.
         */
        this.addBlock = function() {
          console.log( 'GLE.addBlock ----------------------');
          var thisBlock = new Block( self, true );
          blocks.push( thisBlock );
          bucket.insert( thisBlock );
          self.invalidateBBox();
          view.invalidateContext();
          console.log( 'blocks:', blocks );
          return thisBlock;
        }
        
        /**
         * Lookup a block by its name.
         */
        this.getBlockByName = function( name ) {
          console.log( 'getBlockByName', name, blocks );
          for( var i = 0, len = blocks.length; i < len; i++ )
            if( blocks[i].getName() === name )
              return blocks[i];
        }
        
        /**
         * Create and register a new connection.
         */
        this.addConnection = function( parameters ) {
          console.log( 'GLE.addConnection ----------------------');
          var thisConnection = new Connection( self, parameters );
          blocks.push( thisConnection );
          bucket.insert( thisConnection );
          self.invalidateBBox();
          view.invalidateContext();
          return thisConnection;
        }
        
        /**
         * Draw all blocks
         */
        this.draw = function( ctxFn, scale ) {
          blocks.forEach( function drawBlocks_PROFILENAME( thisBlock, index ){
            var thisActive = activeElements.indexOf( thisBlock ) !== -1;//(thisBlock === activeElement);
            var thisSelected = self.selection.isSelected( thisBlock );
            thisBlock.draw( ctxFn( thisActive ), thisSelected, false, scale );
          } );
          bucket.draw( ctxFn( false ), scale );
        };
        
        /**
         * Draw only active blocks (i.e. the foreground)
         */
        this.drawActive = function( ctx, scale ) {
          activeElements.forEach( function( thisActiveElement ) {
            var thisSelected = self.selection.isSelected( thisActiveElement );
            thisActiveElement.draw( ctx, thisSelected, true, scale );
          } );
          self.showGesture(scale);
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
         * Update Bucket list.
         */
        this.invaidateBucket = function()
        {
          bucket.fill( blocks, contentSize );
        };
        
        /**
         * Call this when a bounding box has changed.
         */
        this.invalidateBBox = function()
        {
          self.updateContentSize();
          self.invaidateBucket();
        };
        
        this.invalidateContext = function(){
          // FIXME do that only when really required...:
          //self.updateContentSize();
          
          view.invalidateContext();
        }
        this.invalidateForeground = function(){
          view.invalidateForeground();
        }
        
        /**
        * Return true if the @parm mousePos doesn't belong to this handler
        */
        this.checkHandlerBadSelection = function( mousePos, handlerPos ) {
          var halfSize = self.settings.toleranceHandle;
          return (handlerPos.x-halfSize) > mousePos.x ||
                 (handlerPos.y-halfSize) > mousePos.y || 
                 (handlerPos.x+halfSize) < mousePos.x ||
                 (handlerPos.y+halfSize) < mousePos.y;
        };
        /**
         * Return true if mousePos does belong to this handler
         */
        this.checkHandlerSelection = function( mousePos, handlerPos ) {
          var halfSize = self.settings.toleranceHandle;
          return (handlerPos.x-halfSize) <= mousePos.x &&
                 (handlerPos.y-halfSize) <= mousePos.y && 
                 (handlerPos.x+halfSize) >= mousePos.x &&
                 (handlerPos.y+halfSize) >= mousePos.y;
        }; 
        
        /**
         * Do a full search for maximum content size
         */
        this.updateContentSize = function()
        {
          // grow or shrink canvas depending on content size
          var 
            bbox = getBoundingBox(),
            contentSizeNew = bbox[1];
          contentSizeNew.plus( new Vec2D( self.settings.borderWidth,
                                          self.settings.borderWidth ) );
          if( !contentSize.equal( contentSizeNew ) )
          {
            contentSize = contentSizeNew;
            view.resizeSpace( contentSize );
          }
        }
        
        this.zoomIn = function( centerScreenCoord )
        {
          // basically do: scale *= scaleFactor;
          var 
            newScale = Math.pow( scaleFactor, Math.round( 10*Math.log( scale*scaleFactor )/Math.log( scaleFactor ) ) / 10 ),
            centerCanvasPos = (undefined !== centerScreenCoord) ? view.screen2canvas( centerScreenCoord ) : undefined;
          self.setZoom( newScale, centerCanvasPos, centerScreenCoord );
        };
        this.zoomOut = function( centerScreenCoord )
        {
          // basically do: scale /= scaleFactor;
          var 
            newScale = Math.pow( scaleFactor, Math.round( 10*Math.log( scale/scaleFactor )/Math.log( scaleFactor ) ) / 10 ),
            centerCanvasPos = (undefined !== centerScreenCoord) ? view.screen2canvas( centerScreenCoord ) : undefined;
          self.setZoom( newScale, centerCanvasPos, centerScreenCoord );
        };
        this.zoomDefault = function( centerScreenCoord )
        {
          var 
            centerCanvasPos = (undefined !== centerScreenCoord) ? view.screen2canvas( centerScreenCoord ) : undefined;
          self.setZoom( 1.0, centerCanvasPos, centerScreenCoord );
        };
        this.zoomElements = function( elements )
        {
          if( elements && elements.length === 0 )
            elements = undefined;
          
          var 
            bbox = getBoundingBox( elements ),
            newSize = bbox[1].copy().minus( bbox[0] ),
            centerCanvasPos = bbox[0].copy().plus( newSize.copy().scale( 0.5 ) );
          
          // center the selection => screen pos = undefined
          self.setZoom( view.zoomGetFactor(newSize), centerCanvasPos, undefined );
        };
        
        /**
         * Set the zoom level
         */
        this.setZoom = function( newScale, contentPos, screenPos, temporary )
        {
          if( newScale < self.settings.minScale ) 
            newScale = self.settings.minScale;
          else if( newScale > self.settings.maxScale ) 
            newScale = self.settings.maxScale;
          else if( isNaN( newScale ) )
            newScale = scale;
          
          var zoomAnimation = function(){
            var zoomStep = 0.05;
            if( temporary===true || (Math.abs( scale - scaleTarget ) <= zoomStep) )
            {
              scale = scaleTarget;
              view.zoomView( scale, contentPos, screenPos, temporary );
              if( !temporary )
                self.updateStateInfos();
            } else {
              scale += (scale < scaleTarget) ? zoomStep : -zoomStep; 
              view.zoomView( scale, contentPos, screenPos, true, zoomAnimation );
            }
          };
          if( scale === scaleTarget )
          {
            scaleTarget = newScale;
            zoomAnimation();
          } else {
            scaleTarget = newScale;
          }
        }
        
        /**
         * Get all elements selected that are in the area defined by pos1 and
         * pos2.
         * When pos2 is a Number and not a Vec2D the circle around pos1 with
         * radius "pos2" is checked.
         * The found elements are inserted in the elementContainer.
         */
        var getSelectionCandidatesInArea = function( pos1, pos2, elementContainer ) {
          var 
            minScreenPos,
            maxScreenPos,
            pos1screen, // pos1 in screen coordinates
            pos2screen, // pos2 in screen coordinates OR the radius
            indices;
          if( 'number' === typeof pos2 ) {
            // fake circular selection by similar square selection - the user
            // won't notice it anyway...
            var delta = new Vec2D( pos2, pos2 );
            minScreenPos = pos1.copy().minus( delta );
            maxScreenPos = pos1.copy().plus( delta );
            //pos1screen = view.screen2canvas( pos1 );
            //pos2screen = pos2;
          } else {
            minScreenPos  = pos1.copy().cmin( pos2 );
            maxScreenPos  = pos1.copy().cmax( pos2 );
          }
          pos1screen = view.screen2canvas( minScreenPos ),
          pos2screen = view.screen2canvas( maxScreenPos );
          bucket.getElementsInArea( pos1screen, pos2screen ).forEach( function( thisElement ){
            // Set() type of insert:
            if( !thisElement.checkAreaBadSelection( pos1screen, pos2screen ) &&
                elementContainer.indexOf( thisElement ) === -1 ) {
              elementContainer.push( thisElement );
            }
          });
        };
        
        /**
         * Return the handler at the given screen position.
         * When it is empty (i.e. the background) undefined will be returned.
         * @param {Vec2D} thisScreenPos
         * @param {InterestMap} interest
         */
        this.position2handler = function( thisScreenPos, interest ) {
          var 
            list = bucket.getElements( thisScreenPos ),
            i = list.length;
          if( undefined === interest )
            interest = this.InterestMap.Any;
          
          while( i-- )
          {
            var index = list[i].getSelection( thisScreenPos, interest );
            if( undefined !== index )
            {
              return [ list[i], index ];
            }
          }
        };
        
        /**
         * Return screen position from absolute position (i.e. relative to the
         * document).
         * @param {Vec2D} absoulutePos
         * @returns {Vec2D} Position in screen coordinates
         */
        this.absolute2screen = function( absoulutePos ) {
          var
            canvasOffset  = $canvasContainer.offset(),
            screenPos = absoulutePos.copy().minus( new Vec2D( canvasOffset.left, canvasOffset.top ) );
            
          return screenPos;
        }
        
        /**
         * Return content position from screen position.
         * @param {Vec2D} thisScreenPos
         * @returns {Vec2D} Position in content coordinates
         */
        this.screen2content = function( thisScreenPos ) {
          return view.screen2canvas(thisScreenPos);
        };
        
        /**
         * Return content position from absolute position (i.e. relative to the
         * document).
         * @param {Vec2D} absoulutePos
         * @returns {Vec2D} Position in content coordinates
         */
        this.absolute2content = function( absoulutePos ) {
          return this.screen2content( this.absolute2screen( absoulutePos ) );
        };
        
        // ****************************************************************** //
        // ****************************************************************** //
        // **                                                              ** //
        // ** Selection handling                                           ** //
        // **                                                              ** //
        // ****************************************************************** //
        // ****************************************************************** //
        this.selection = (function(){
          // private variables:
          var selectedElements = []; // The user selected elements
          
          // public methods:
          return {
            /**
            * Check if element is selected
            */
            isSelected: function( element ) {
              return -1 !== selectedElements.indexOf( element );
            },
            /**
             * Return the list of selected elements
             * NOTE: the returned value should be read only!
             */
            getElements: function() {
              return selectedElements;
            },
            /**
            * Call a function for each selected element
            */
            forEach: function( callback ) {
              selectedElements.forEach( callback );
            },
            /**
            * Clear complete selection.
            * @param resetActiveElements {Bool} Clear also active elements when true
            */
            clear: function( resetActiveElements ) {
              var redraw = false;

              if( resetActiveElements )
              {
                if( 0 < activeElements.length )
                {
                  activeElements.length = 0;
                  redraw = true;
                }
              } else {
                // remove all selectedElements from the activeElements
                selectedElements.forEach( function( thisElement ) {
                  var index = activeElements.indexOf( thisElement );
                  if( -1 !== index )
                  {
                    activeElements.splice( index, 1 );
                    redraw = true;
                  }
                } );
              }
              selectedElements.length = 0;
              
              if( redraw )
                view.invalidateContext();
            },
            /**
            * Add element to current selection.
            * @param activateDerivedElements {Bool} Make also derived elements 
            *                                       active
            */
            doSelection: function( element, activateDerivedElements ) {
              var redraw = false;
              
              // activate derived elements
              if( activateDerivedElements )
              {
                element.getDerivedActive().forEach( function(dE){
                  if( -1 === activeElements.indexOf( dE ) )
                  {
                    activeElements.push( dE );
                    redraw = true;
                  }
                });
              }
              
              // and finally select the element itself
              if( !self.selection.isSelected( element ) )
              {
                selectedElements.push( element );
                if( -1 === activeElements.indexOf( element ) )
                  activeElements.push( element );
                
                redraw = true;
              }
              
              if( redraw )
                view.invalidateContext();
            },
            /**
            * Unselect a single element and leave other selections as is.
            */
            removeSelection: function( element ) {
              var 
                aEindex = activeElements.indexOf( element ),
                sEindex = selectedElements.indexOf( element );
                
              if( -1 !== aEindex )
                activeElements.splice( aEindex, 1 );
              if( -1 !== sEindex )
                selectedElements.splice( sEindex, 1 );
              
              if( -1 !== aEindex || -1 !== sEindex )
                view.invalidateContext();
            },
            /**
            * Mark all elements selected that are in the area defined by pos1 and
            * pos2.
            * When pos2 is a Number and not a Vec2D the circle around pos1 with
            * radius "pos2" is checked.
            * lastScreenPos
            * and prevScreenPos.lastScreenPos
            * and prevScreenPos, lastScreenPos
            */
            selectArea: function( pos1, pos2 ) {
              //console.log( 'selecting ' + prevScreenPos.print() + ' -> ' + lastScreenPos.print() );
              /*
              var
                minScreenPos  = prevScreenPos.copy().cmin( lastScreenPos ),
                maxScreenPos  = prevScreenPos.copy().cmax( lastScreenPos ),
                minPos        = view.screen2canvas( minScreenPos ),
                maxPos        = view.screen2canvas( maxScreenPos ),
                indices = view.area2id( minScreenPos, maxScreenPos, 1, handlerList.length );
              for( var i = 0; i < indices.length; i++ )
              {
                var thisElement = handlerList[ indices[i] ][0];
                
                // Set() type of insert:
                if( !thisElement.checkAreaBadSelection( minPos, maxPos ) &&
                    selectedElements.indexOf( thisElement ) === -1 ) {
                  selectedElements.push( thisElement );
                }
              }
              */
              getSelectionCandidatesInArea( pos1, pos2, selectedElements );
              // and now make them appear on the forground
              activeElements = selectedElements.slice(); // make copy
            }
          };
        })();
        
        /**
         * Move selected elements
         */
        this.selectionMove = function( direction ) {
          self.selection.forEach( function( thisElement ) {
            thisElement.update( undefined, undefined, direction );
          } );
          self.invaidateBucket();
          self.invalidateContext(); // context to force index redraw
        };
        
        /**
         * Delete selected elements
         */
        this.selectionDelete = function() {
          self.selection.forEach( function( thisElement ) {
            if( thisElement.delete() )
            {
              blocks = blocks.filter( function( thisBlock ){
                return thisBlock != thisElement;
              } );
            }
          } );
          self.selection.clear(); // elements were deleted -> remove them from the selection...
          self.invaidateBucket();
        };
        
        /**
         * Flip selected elements
         */
        this.selectionFlip = function() {
          // TODO: this is currently just flipping each element individually
          // it would be better if the selection is flipped on its whole though
          self.selection.forEach( function( thisElement ) {
            if( thisElement instanceof Block )
            {
              thisElement.setFlip();
            }
          });
        };
        
        /**
         * Rotate selected elements
         */
        this.selectionRotate = function( deltaAngle ) {
          // TODO: this is currently just rotating each element individually
          // it would be better if the selection is rotated on its whole though
          self.selection.forEach( function( thisElement ) {
            if( thisElement instanceof Block )
            {
              thisElement.setRotationDelta( deltaAngle );
            }
          });
        };
        
        /*
        this.blob = function() { 
          ctxBg.save();
          ctxBg.setTransform( 1, 0, 0, 1, 0.5, 0.5 );
          ctxBg.drawImage( idBuffer, 0, 0 ); console.log(handlerList);
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
        
        /**
         * Event handler for any kind of resize, including browser zoom level.
         */
        this.resize = function( eventObject ) {
          console.log( 'resize', eventObject ); // FIXME DEBUG
          view.resizeView();
          
          self.updateStateInfos();
        };
        
        /**
         * Handle user interaction request with a element (i.e. double click
         * on it.
         */
        this.elementInteraction = function( element ) {
          if( element instanceof Block )
          {
            $('#main').trigger( 'blockInteraction', element );
          }
        }
        
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        // Big temporary hack
        /*
        var gesture = new _GLE.gesture( self );
        this.startGesture = gesture.start;
        this.continueGesture = gesture.update;
        */
        this.showGesture = function(scale){ 
          if( inputevent )
            inputevent.showGesture( scale );
          else
            console.log( 'FIXME - implement gesture.show' );  // FIXME TODO
        };
        this.scale = function(){ return scale; };
        //this.fixmeGetElementList = function(){ return handlerList; };
        this.moveElementToTop = function( thisElement ) {
          blocks = blocks.filter( function( thisBlock ){
            return thisBlock != thisElement;
          });
          blocks.push( thisElement );
        };
        // End: Big temporary hack
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        
        // Constructor
        $canvasContainer = passedCanvasContainer;
        view = new View( passedCanvasContainer, this );
        var inputevent = new Inputevent( self );
        /*
        view.getForeground().on( 'mousedown',  this.mousedown ); 
        view.getForeground().on( 'touchstart', this.mousedown );
        */
        view.getForeground()
          .on( 'mousedown',   inputevent.mousedown  )
          .on( 'touchstart',  inputevent.touchstart );
        $(document)  
          .on( 'mousemove',   inputevent.mousemove   )
          .on( 'touchmove',   inputevent.touchmove   )
          .on( 'mouseup',     inputevent.mouseup     )
          .on( 'touchend',    inputevent.touchend    )
          .on( 'touchcancel', inputevent.touchcancel ); 
        $canvasContainer.on( 'scroll', inputevent.scroll );
        $canvasContainer.on( 'wheel',  inputevent.wheel  );
        $(document).on( 'keydown',  inputevent.keyPress  ); 
        $(window).on( 'resize',     this.resize    );
      };
      
  /*
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
  */
  return new GLE( $('#canvascontainer') );
});