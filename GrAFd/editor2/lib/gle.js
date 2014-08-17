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
      scaleID       = 0,   // running number to make sure that no multiple animations are running
      scaleTarget   = 1,   // zoomlevel to animate to
      $canvasContainer,    // jQ object containing the canvases and the scroll bars
      elementList = [[]],  // array of elements to draw, first element has to be empty as it corresponds to the background
      clickTimestamp = 0,  // used to check for double click
      activeElements = [], // The active elements, i.e. the one on the Fg
 
      /**
       * Get the distance between the fingers in screen pixels.
       */
      getTouchDistance = function( eventObject ) {
        var touches = eventObject.originalEvent.touches,
            dx      = touches[0].pageX - touches[1].pageX,
            dy      = touches[0].pageY - touches[1].pageY;
        return Math.sqrt( dx*dx + dy*dy );
      },
 
      /**
       * The GLE constructor
       */
      GLE = function( passedCanvasContainer ) {
        // private:
        var 
          self = this, 
          blocks = [],  // array of all existent blocks
          view,
          lastScreenPos,      // the beginning coordinates of a mouse drag
          lastScale,    // the beginning scale during a mouse drag
          prevScreenPos,      // the coordinates of the previous call to mousemove
          // private methods:
          /**
           * Return position of eventObject realtive to screen view port.
           */
          getMouseScreenPos = function( eventObject ) {
            return view.getScreenCoordinate( eventObject.pageX||eventObject.originalEvent.pageX,
                                             eventObject.pageY||eventObject.originalEvent.pageY );
          },
          /**
           * Return mouse position relative to object space, i.e. canvas.
           */
          getMouseCanvasPos = function( eventObject ) {
            return view.screen2canvas( getMouseScreenPos( eventObject ) );
          },
          //getMousePos = getMouseCanvasPos;
          /**
          * Get all touch coordinates out of the jQ.Event relative to the canvas.
          * @return Array of Vec2D with one Vec2D per touch position
          */
          getTouchScreenPos = function( eventObject ) {
            var touches = eventObject.originalEvent.touches;
                
            return Array.prototype.map.call( touches, function(touch){ 
                return view.getScreenCoordinate( touch.pageX, touch.pageY );
            } ).concat([new Vec2D(0,0)]);
          },
          /**
           * Return array of two Vec2D that define the bounding box of the 
           * current content (i.e. blocks and connections.)
           * @param elements {Array} Array of the elements for the calculation
           *                         or undefined if all.
           */
          getBoundingBox = function( elements ) {
            if( undefined === elements )
              elements = elementList.map( function(a){return a[0];} );
            
            var firstElement = elements.shift();
            if( undefined === firstElement )  // when all elements are passed the fist is undefined as it is a placeholder for the background
              firstElement = elements.shift();
            
            var
              topLeft     = firstElement.getTopLeft(),
              bottomRight = firstElement.getBottomRight();
              
            elements.forEach( function( thisElement ){
              topLeft.cmin( thisElement.getTopLeft() );
              bottomRight.cmax( thisElement.getBottomRight() );
            });
            
            return [ topLeft, bottomRight ];
          },
          /**
          * Update the state information that the user can see
          */
          updateStateInfos = (function(){
            var $zoom = $('#zoom'); // cache DOM element
            return function() {
              $zoom.text( Math.round(scale * 100) + '% (scale: ' + scale + ' / scaleInternal: ' + 'n/a' + ')' );
            }
          })(),
          dummy = true;
          
        /**
         * Get the user tuneable settings.
         */
        this.settings = new window._GLE.settings();
        
        /**
         * Make view visible to the outside. - FIXME DEBUG
         */
        this.view           = function(){ return view;           };
        //this.activeElements = function(){ return activeElements; };
        //this.blocks = blocks; // FIXME only for transision
        
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
         * Draw all blocks
         */
        this.draw = function( ctxFn, ctxId, scale ) {
          blocks.forEach( function drawBlocks_PROFILENAME( thisBlock, index ){
            var thisActive = activeElements.indexOf( thisBlock ) !== -1;//(thisBlock === activeElement);
            var thisSelected = selection.isSelected( thisBlock );
            thisBlock.draw( ctxFn( thisActive ), ctxId, thisSelected, false, scale );
          } );
        };
        
        /**
         * Draw only active blocks (i.e. the foreground)
         */
        this.drawActive = function( ctx, ctxId, scale ) {
          activeElements.forEach( function( thisActiveElement ) {
            var thisSelected = selection.isSelected( thisActiveElement );
            thisActiveElement.draw( ctx, ctxId, thisSelected, true, scale );
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
          //view.invalidateContext();
          view.invalidateIndex();
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
                updateStateInfos();
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
          indices = view.area2id( minScreenPos, maxScreenPos, 1, elementList.length );
          for( var i = 0; i < indices.length; i++ )
          {
            var thisElement = elementList[ indices[i] ][0];
            
            // Set() type of insert:
            if( !thisElement.checkAreaBadSelection( pos1screen, pos2screen ) &&
                elementContainer.indexOf( thisElement ) === -1 ) {
              elementContainer.push( thisElement );
            }
          }
        };
        
        // ****************************************************************** //
        // ****************************************************************** //
        // **                                                              ** //
        // ** Selection handling                                           ** //
        // **                                                              ** //
        // ****************************************************************** //
        // ****************************************************************** //
        var selection = (function(){
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
              if( !selection.isSelected( element ) )
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
              console.log( 'selecting ' + prevScreenPos.print() + ' -> ' + lastScreenPos.print() );
              /*
              var
                minScreenPos  = prevScreenPos.copy().cmin( lastScreenPos ),
                maxScreenPos  = prevScreenPos.copy().cmax( lastScreenPos ),
                minPos        = view.screen2canvas( minScreenPos ),
                maxPos        = view.screen2canvas( maxScreenPos ),
                indices = view.area2id( minScreenPos, maxScreenPos, 1, elementList.length );
              for( var i = 0; i < indices.length; i++ )
              {
                var thisElement = elementList[ indices[i] ][0];
                
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
        
        // ****************************************************************** //
        // ****************************************************************** //
        // **                                                              ** //
        // ** Drag handling                                                ** //
        // **                                                              ** //
        // ****************************************************************** //
        // ****************************************************************** //
        var dragIndex = 0;
        var dragStart = function( mouseScreenPos, ctrlKey, shiftKey ) {
          lastScreenPos = mouseScreenPos.round(1);
          prevScreenPos = lastScreenPos;
          // ---------------
          view.showMarker( view.screen2canvas( lastScreenPos ) );
          // ---------------
          
          var index = view.position2id( lastScreenPos ),
              activeElement = index < elementList.length ? elementList[ index ][0] : undefined;
              
          $('#coords').text( lastScreenPos.print() + '<>' + view.screen2canvas(lastScreenPos).print() + ':' + index + ' (' + scale + ') [' + ']' );
 
          if( 0 === index || undefined === activeElement || activeElement.checkBadSelection( view.screen2canvas(lastScreenPos ), elementList[ index ][1], 2 ) )
          {
            selection.clear();
            
            dragIndex = 0;
            return false; // no object found
          }
          
          var newIndex = activeElement.prepareUpdate( elementList[ index ][1], index, view.screen2canvas(lastScreenPos), ctrlKey, shiftKey );
          //console.log( 'down', index, newIndex, activeElement, elementList[ index ][1] );
          index = newIndex;
          activeElement = elementList[ index ][0]; // if index was changed...
          
          // move activeElement to the end of the array to draw it on the top
          blocks = blocks.filter( function( thisBlock ){
            return thisBlock != activeElement;
          });
          blocks.push( activeElement );
          //console.log( 'da', activeElement.getDerivedActive() );
          selection.clear( true );
          selection.doSelection( activeElement, true );
          
          dragIndex = index;
          view.invalidateContext();
          return true;
        };
        
        //var dragMove = function( mouseCanvasPos, ctrlKey, shiftKey ) {
        var dragMove = function( mouseScreenPos, ctrlKey, shiftKey ) {
          var index         = dragIndex, //eventObject.data,
              thisElem      = elementList[ index ],
              //thisPos       = mouseCanvasPos.round(1),
              thisPos       = view.screen2canvas(mouseScreenPos).round(1),
              shortDeltaPos = thisPos.copy().minus( view.screen2canvas(prevScreenPos) ),
              //lowerIndex    = view.position2id( thisPos ),
              lowerIndex    = view.position2id( mouseScreenPos ),
              lowerElement  = elementList[lowerIndex];
          
          if( (!lowerElement) ||
              (lowerElement.length && lowerElement[0].checkBadSelection( thisPos, lowerElement[1], 2 ) ) )
            lowerElement = [];
          
          var newIndex = (thisElem[0]).update( thisElem[1], thisPos, shortDeltaPos, lowerElement, shiftKey );
          ////console.log( index, newIndex );
          // check if the handler might have been changed during the update
          if( newIndex !== undefined && newIndex !== index )
          {
            dragIndex = newIndex;
          }
          
          // necessary? Causes currently double redraws...
          view.invalidateForeground(); // redraw to fix Id map
          
          prevScreenPos = view.canvas2screen( thisPos );
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
        
        /**
         * Alle the handlers and private variables for the pinch support
         * that allows the user to zoom and pan.
         */
        var pinch = (function() {
          // The private variables that are hidden to the outside
          var pinchLength, 
              pinchStartScale,
              contentPos, 
              screenPos;
          // The public methods, callable as "pinch.*()"
          return {
            start: function( eventObject ) {
                pinchStartScale = scale;
                pinchLength = getTouchDistance( eventObject );
                var touches = getTouchScreenPos( eventObject );
                contentPos = view.screen2canvas( touches[0].plus( touches[1] ).scale( 0.5 ) );// The middle between the fingers
              },
            move: function( eventObject ) {
                var length  = getTouchDistance( eventObject ),
                    ratio   = length / pinchLength,
                    touches = getTouchScreenPos( eventObject );
                screenPos   = touches[0].plus( touches[1] ).scale( 0.5 );    // The middle between the fingers
                self.setZoom( pinchStartScale * ratio, contentPos, screenPos, true );
              },
            end: function() {
                self.setZoom( scale, contentPos, screenPos, false ); // finalize temporary zoom
              }
          };
        })();
        
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
                selection.forEach( function( thisElement ) {
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
              selection.forEach( function( thisElement ) {
                blocks = blocks.filter( function( thisBlock ){
                  return thisBlock != thisElement;
                } );
                thisElement.delete();
              } );
              selection.clear(); // elements were deleted -> remove them from the selection...
              self.invalidateHandlers();
              break;
              
            case 66: // key: b - zoom to 100%
              self.zoomDefault();
              break;
              
            case 71: // key: g - toggle grid
              view.toggleGrid();
              break;
              
            case 82: // key: r - zoom in
              self.zoomIn();
              break;
              
            case 86: // key: v - zoom out
              self.zoomOut();
              break;
              
            case 70: // key: f - zoom to fit
              self.zoomElements( selection.getElements() ); // fit to selection
              break;
              
            default:
              console.log( 'key', eventObject, eventObject.keyCode );
          }
          
          // updateStateInfos(); // FIXME should be done with each operation that changes state and not here...
        };
        
        var mouseStateNone       = 0, // implies no button pressed
            mouseStateDrag       = 1, // implies a pressed button and a element
            mouseStateSelectDrag = 2, // implies a pressed button to select elements
            mouseStatePinch      = 3, // implies two touches
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
        var contentCanvasPos = new Vec2D(0,0);
        this.mousedown = function( eventObject ) {
          // check for double click
          if( isDoubleClick( eventObject.timeStamp ) )
            return false;
          
          contentCanvasPos = getMouseCanvasPos( eventObject );
          if( eventObject.ctrlKey )
          {
              mouseState = mouseStatePinch;
              lastScreenPos = new Vec2D( eventObject.pageX, eventObject.pageY );
              lastScale = scale;
              prevScreenPos = getMouseScreenPos( eventObject ); // abuse it a bit...
          } else {
            var
              thisScreenPos = getMouseScreenPos( eventObject ),
              index         = view.position2id( thisScreenPos ),
              validObject   = (index > 0) && (index < elementList.length);
            if( eventObject.shiftKey )   // Shift = add to selection
            {
              if( validObject &&
                  selection.isSelected( elementList[ index ][0] ) ) // already selected?
              { // yes -> toggle away
                selection.removeSelection( elementList[ index ][0] );
              } else {
                mouseState = mouseStateSelectDrag;
                prevScreenPos = getMouseScreenPos( eventObject );
                self.startGesture( getMouseScreenPos( eventObject ), scale );
              }
            } else {
              if( dragStart( getMouseScreenPos( eventObject ), 
                             eventObject.ctrlKey, 
                             eventObject.shiftKey ) )
                mouseState = mouseStateDrag;
            }
            //&&&&6
            /*
            if( !eventObject.shiftKey &&            // Shift = add to selection
                dragStart( getMouseScreenPos( eventObject ), 
                           eventObject.ctrlKey, 
                           eventObject.shiftKey ) 
              )
              mouseState = mouseStateDrag;
            else {
              mouseState = mouseStateSelectDrag;
              prevScreenPos = getMouseScreenPos( eventObject );
              self.startGesture( getMouseScreenPos( eventObject ), scale );
            }*/
          }
          //view.showKlick( view.screen2canvas( prevScreenPos ) );
          
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
              
              if( dragStart( getTouchScreenPos( eventObject )[0] ) )
                mouseState = mouseStateDrag;
              else {
                mouseState = mouseStateSelectDrag;
                prevScreenPos = getTouchScreenPos( eventObject )[0];
                self.startGesture( prevScreenPos, scale );
              }
              break;
              
            case 2:
              mouseState = mouseStatePinch;
              pinch.start( eventObject );
              break;
          }
          $('#coords').text( 'touchstart' + printMouseState() + eventObject.originalEvent.touches.length);
          //getTouchPos( eventObject );
          return false; // stopp propagation as well as bubbling
        };
        
        /**
         * Event handler for mousemove.
         */
        this.mousemove = function( eventObject ) {
          switch( mouseState )
          {
            case mouseStateNone:
              return true;
              
            case mouseStateDrag:
              //dragMove( getMouseCanvasPos( eventObject ), eventObject.ctrlKey, eventObject.shiftKey );
              dragMove( getMouseScreenPos( eventObject ), eventObject.ctrlKey, eventObject.shiftKey );
              break;
              
            case mouseStateSelectDrag:
              view.showSelectionArea( view.screen2canvas( prevScreenPos ), 
                                      view.screen2canvas( getMouseScreenPos( eventObject ) ) );
              if( gesture.update( getMouseScreenPos( eventObject ) ) ) {
                // gesture detection sucessfull...
                var 
                  gestureInfo = gesture.getInfo(),
                  dS = dragStart( gestureInfo.center, false, false ),
                  eL = [];
                getSelectionCandidatesInArea( gestureInfo.center, gestureInfo.radius, eL );
                console.log( gestureInfo.center.print(), gestureInfo.radius, dS, eL );
                //mouseState = mouseStateDrag;
              }
              break;
              
            case mouseStatePinch:
              var length   = lastScreenPos.copy().minus( new Vec2D( eventObject.pageX, eventObject.pageY ) ),
                  newScale = Math.abs( length.x + length.y ) / 200 + 1; // will allways be bigger than 0
              if( (length.x + length.y) > 0 )
                newScale = 1/newScale;
              
              if( eventObject.shiftKey ) { // only move
                var deltaPos = (new Vec2D( eventObject.pageX, eventObject.pageY ) ).minus( lastScreenPos );
                self.setZoom( lastScale, contentCanvasPos, deltaPos.plus(prevScreenPos), true ); // zoom with temporary = true
                break;
              }
              
              self.setZoom( newScale * lastScale, contentCanvasPos, prevScreenPos, true ); // zoom with temporary = true
              break;
          }
          
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
              
              // keep event propagating and bubbling
              return eventObject.target.id !== 'canvas_fg';
              
            case mouseStateDrag:
              //dragMove( view.screen2canvas( getTouchScreenPos( eventObject )[0] ) );
              dragMove( getTouchScreenPos( eventObject )[0] );
              break;
              
            case mouseStateSelectDrag:
              lastScreenPos = getTouchScreenPos( eventObject )[0]; // store as TouchUp doesn't have corrdinates anymore
              view.showSelectionArea( view.screen2canvas( prevScreenPos ),
                                      view.screen2canvas( lastScreenPos ) );
              self.continueGesture( getTouchScreenPos( eventObject )[0] ); // FIXME TEMP
              break;
              
            case mouseStatePinch:
              pinch.move( eventObject );
              break;
          }
          
          return false; // stopp propagation as well as bubbling
        };
        
        /**
         * Event handler for mouseup.
         */
        this.mouseup = function( eventObject ) {
          switch( mouseState )
          {
            case mouseStateDrag:
              dragEnd();
              break;
              
            case mouseStateSelectDrag:
              view.showSelectionArea( undefined ); // unshow selection rectangle
              lastScreenPos = getMouseScreenPos( eventObject );
              selection.selectArea( prevScreenPos, lastScreenPos );
              break;
              
            case mouseStatePinch:
              if( eventObject.shiftKey ) { // only move
                var deltaPos = (new Vec2D( eventObject.pageX, eventObject.pageY ) ).minus( lastScreenPos );
                self.setZoom( lastScale, contentCanvasPos, deltaPos.plus(prevScreenPos), false );
              } else
                self.setZoom( scale, contentCanvasPos, prevScreenPos, false );
              break;
          }
          
          mouseState = mouseStateNone;
          
          updateStateInfos();
          
          return false; // stopp propagation as well as bubbling
        };
        
        /**
         * Event handler for touchend.
         */
        this.touchend = function( eventObject ) {
          switch( mouseState )
          {
            case mouseStateDrag:
              dragEnd();
              break;
              
            case mouseStateSelectDrag:
              view.showSelectionArea( undefined ); // unshow selection rectangle
              selection.selectArea( prevScreenPos, lastScreenPos );
              break;
              
            case mouseStatePinch:
              pinch.end();
              break;
          }
          
          updateStateInfos();
          
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
          
          updateStateInfos();
          
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
          
          updateStateInfos();
        };
        
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        // Big temporary hack
        var gesture = new _GLE.gesture( self );
        this.startGesture = gesture.start;
        this.continueGesture = gesture.update;
        this.showGesture = function(scale){ gesture.show( view, scale ); }
        // End: Big temporary hack
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////
        
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
              mousePos   = getMouseScreenPos(e);
          /*    
          console.log('sroll', e, left_right, up_down, 
                    mousePos ,  
          (e.shiftKey ? 's' : '') +
          (e.ctrlKey ? 'c' : '')  +
          (e.altKey ? 'a' : '' ));
          */
          if( e.shiftKey || e.ctrlKey ) // should be only ctrlKey, but Chrome doesn't support that yet
          {
            if( up_down < 0 || left_right < 0 )
            {
              self.zoomOut( mousePos );
            } else if( up_down > 0 || left_right > 0 )
            {
              self.zoomIn( mousePos );
            }
            
            updateStateInfos();
            return false;
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
          
          return false;
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