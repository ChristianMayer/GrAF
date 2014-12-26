/**
 * gle.inputevent.js (c) 2014 by Christian Mayer [CometVisu at ChristianMayer dot de]
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

// create a local context:
define( ['lib/Vec2D', 'lib/gle.gesture'], function( Vec2D, Gesture, undefined ) {
  "use strict";
  
  // module private variables:
  var 
    /**
     * The Inputevent constructor
     * @module Inputevent
     * @title  GrAF logic engine: graphical logic editor
     * @constructor
     */
    Inputevent = function( thisGLE ) {
      ////////////////////////////////////////////////////////////////////////
      // private:
      var 
        self = this,
        view = thisGLE.view(),
        gesture = new Gesture( thisGLE ),
        selection = thisGLE.selection,
        lastScreenPos,      // the beginning coordinates of a mouse drag
        lastScale,          // the beginning scale during a mouse drag
        prevScreenPos,      // the coordinates of the previous call to mousemove
        contentCanvasPos = new Vec2D(0,0),
        // enumeration of the mouse (and touch) states
        mouseStateNone       = 0, // implies no button pressed
        mouseStateDrag       = 1, // implies a pressed button and a element
        mouseStateSelectDrag = 2, // implies a pressed button to select elements
        mouseStatePinch      = 3, // implies two touches
        mouseState = mouseStateNone,
        clickTimestamp = 0,  // used to check for double click
        /**
         * Check for a double click.
         */
        isDoubleClick = function( timeStamp ) {
          if( timeStamp - clickTimestamp < 200 )
          {
            mouseState = mouseStateNone;
            return true;
          }
          clickTimestamp = timeStamp;
          return false;
        },
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
         * Get the distance between the fingers in screen pixels.
         */
        getTouchDistance = function( eventObject ) {
          var touches = eventObject.originalEvent.touches,
              dx      = touches[0].pageX - touches[1].pageX,
              dy      = touches[0].pageY - touches[1].pageY;
          return Math.sqrt( dx*dx + dy*dy );
        },
        // ****************************************************************** //
        // ****************************************************************** //
        // **                                                              ** //
        // ** Drag handling                                                ** //
        // **                                                              ** //
        // ****************************************************************** //
        // ****************************************************************** //
        drag = (function(){
          //var dragIndex = 0; // FIXME delete
          var dragHandler = []; // the handler that is currently draged around
          return {
            start: function( mouseScreenPos, ctrlKey, shiftKey ) {
                lastScreenPos = mouseScreenPos.round(1);
                prevScreenPos = lastScreenPos;
                // ---------------
                view.showMarker( view.screen2canvas( lastScreenPos ) );
                // ---------------
                
                dragHandler = thisGLE.position2handler( lastScreenPos );
                    console.log( 'drag', dragHandler );
                if( undefined === dragHandler || dragHandler[0].checkBadSelection( view.screen2canvas(lastScreenPos ), dragHandler[1], 2 ) )
                {
                  selection.clear();
                  
                  dragHandler = [];
                  return false; // no object found
                }
                
                var index = undefined;
                var newIndex = dragHandler[0].prepareUpdate( dragHandler[1], index, view.screen2canvas(lastScreenPos), ctrlKey, shiftKey );
                var elementList = thisGLE.fixmeGetElementList(); // FIXME TODO - nur hier um elementList zu aktuallisieren
                if( newIndex !== undefined )
                  //dragHandler = elementList[ newIndex ];
                  dragHandler = newIndex;
                
                // move activeElement to the end of the array to draw it on the top
                console.log( dragHandler, newIndex );
                thisGLE.moveElementToTop( dragHandler[0] );
                selection.clear( true );
                selection.doSelection( dragHandler[0], true );
                
                view.invalidateContext();
                return true;
              },
        
            move: function( mouseScreenPos, ctrlKey, shiftKey ) {
                var elementList = thisGLE.fixmeGetElementList(); // FIXME TODO
                var 
                  thisPos       = view.screen2canvas(mouseScreenPos).round(1),
                  shortDeltaPos = thisPos.copy().minus( view.screen2canvas(prevScreenPos) ),
                  lowerHandler  = thisGLE.position2handler( mouseScreenPos );
                  
                if( (!lowerHandler) ||
                    (lowerHandler.length && lowerHandler[0].checkBadSelection( thisPos, lowerHandler[1], 2 ) ) )
                        lowerHandler = undefined;//[];
                      
                var newIndex = (dragHandler[0]).update( dragHandler[1], thisPos, shortDeltaPos, lowerHandler, shiftKey );
                // check if the handler might have been changed during the update
                //console.log( 'drag move', dragHandler, newIndex );
                if( newIndex !== undefined && newIndex !== dragHandler[1] )
                {
                  //dragHandler[1] = elementList[newIndex][1];
                  //dragHandler = elementList[newIndex];
                  dragHandler = newIndex;
                }
                
                // necessary? Causes currently double redraws...
                view.invalidateForeground(); // redraw to fix Id map
                
                prevScreenPos = view.canvas2screen( thisPos );
              },
                    
            end: function() {
                (dragHandler[0]).finishUpdate( dragHandler[1] );
              
                dragHandler = [];
                thisGLE.updateContentSize(); // e.g. the boundary has to be updated
                view.invalidateContext(); // redraw to fix Id map
              }
          };
        })(),
 
        /**
         * Alle the handlers and private variables for the pinch support
         * that allows the user to zoom and pan.
         */
        pinch = (function() {
          // The private variables that are hidden to the outside
          var pinchLength, 
              pinchStartScale,
              contentPos, 
              screenPos;
          // The public methods, callable as "pinch.*()"
          return {
            start: function( eventObject ) {
                pinchStartScale = thisGLE.scale();
                pinchLength = getTouchDistance( eventObject );
                var touches = getTouchScreenPos( eventObject );
                contentPos = view.screen2canvas( touches[0].plus( touches[1] ).scale( 0.5 ) );// The middle between the fingers
              },
            move: function( eventObject ) {
                var length  = getTouchDistance( eventObject ),
                    ratio   = length / pinchLength,
                    touches = getTouchScreenPos( eventObject );
                screenPos   = touches[0].plus( touches[1] ).scale( 0.5 );    // The middle between the fingers
                thisGLE.setZoom( pinchStartScale * ratio, contentPos, screenPos, true );
              },
            end: function() {
                thisGLE.setZoom( thisGLE.scale(), contentPos, screenPos, false ); // finalize temporary zoom
              }
          };
        })(),
        //////////////////////////////////////////////////////////////////////////////////////// 
        dummy;  // may be removed anytime - just to ease ',' and ';' handling during development
        ////////////////////////////////////////////////////////////////////////////////////////
      
      ////////////////////////////////////////////////////////////////////////
      // public:
        
      // ****************************************************************** //
      // ****************************************************************** //
      // **                                                              ** //
      // ** Key handling                                                 ** //
      // **                                                              ** //
      // ****************************************************************** //
      // ****************************************************************** //
        
      /**
       * Event handler for key pressing.
       */
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
        var 
          keyMoveDistance = 10,
          dummy;
            
        switch( eventObject.keyCode )
        {
          case 37: // arrow key: left
            thisGLE.selectionMove( new Vec2D( -keyMoveDistance, 0 ) );
            break;
            
          case 38: // arrow key: up
            thisGLE.selectionMove( new Vec2D( 0, -keyMoveDistance ) );
            break;
            
          case 39: // arrow key: right
            thisGLE.selectionMove( new Vec2D( keyMoveDistance, 0 ) );
            break;
            
          case 40: // arrow key: down
            thisGLE.selectionMove( new Vec2D( 0, keyMoveDistance ) );
            break;
            
          case 46: // key: delete
            thisGLE.selectionDelete();
            break;
            
          case 66: // key: b - zoom to 100%
            thisGLE.zoomDefault();
            break;
            
          case 71: // key: g - toggle grid
            view.toggleGrid();
            break;
            
          case 82: // key: r - zoom in
            thisGLE.zoomIn();
            break;
            
          case 86: // key: v - zoom out
            thisGLE.zoomOut();
            break;
            
          case 70: // key: f - zoom to fit
            thisGLE.zoomElements( selection.getElements() ); // fit to selection
            break;
            
          default:
            console.log( 'key', eventObject, eventObject.keyCode );
        }
      };
        
      // ****************************************************************** //
      // ****************************************************************** //
      // **                                                              ** //
      // ** Mouse handling                                               ** //
      // **                                                              ** //
      // ****************************************************************** //
      // ****************************************************************** //
      
      /**
       * Debug function: return a string that represents the current mouse
       * state.
       */
      this.printMouseState = function() {
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
       * Event handler for mouse wheel.
       */
      this.wheel = function( e ){
          e.preventDefault(); 
          var left_right = ( undefined !== e.originalEvent.wheelDeltaX ? e.originalEvent.wheelDeltaX :
                           ( undefined !== e.originalEvent.deltaX      ? e.originalEvent.deltaX      : 0 )),
              up_down    = ( undefined !== e.originalEvent.wheelDeltaY ? -e.originalEvent.wheelDeltaY :
                           ( undefined !== e.originalEvent.deltaY      ? e.originalEvent.deltaY      : 0 )),
              delta      = new Vec2D( Math.sign( left_right ) * 50, Math.sign( up_down ) * 50 ),
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
              thisGLE.zoomOut( mousePos );
            } else if( up_down > 0 || left_right > 0 )
            {
              thisGLE.zoomIn( mousePos );
            }
            
            thisGLE.updateStateInfos();
            return false;
          }
          
          view.scrollDelta( delta );
          
          thisGLE.resize();
          
          return false;
        }
        
      /**
       * Event handler for mousedown.
       */
      this.mousedown = function( eventObject ) {
        // check for double click
        if( isDoubleClick( eventObject.timeStamp ) )
        {
          thisScreenPos = getMouseScreenPos( eventObject ),
          thisHandler   = thisGLE.position2handler( thisScreenPos ),
          thisElement   = thisHandler ? thisHandler[0] : undefined;
          if( undefined !== thisElement &&
              selection.isSelected( thisElement ) ) // already selected?
          {
            thisGLE.elementInteraction( thisElement );
          } else
            thisGLE.zoomDefault();
          return false;
        }
        
        contentCanvasPos = getMouseCanvasPos( eventObject );
        if( eventObject.ctrlKey )
        {
            mouseState = mouseStatePinch;
            lastScreenPos = new Vec2D( eventObject.pageX, eventObject.pageY );
            lastScale = thisGLE.scale();
            prevScreenPos = getMouseScreenPos( eventObject ); // abuse it a bit...
        } else {
          var
            thisScreenPos = getMouseScreenPos( eventObject ),
            thisHandler   = thisGLE.position2handler( thisScreenPos ),
            thisElement   = thisHandler ? thisHandler[0] : undefined;
          if( eventObject.shiftKey )   // Shift = add to selection
          {
            if( undefined !== thisElement &&
                selection.isSelected( thisElement ) ) // already selected?
            { // yes -> toggle away
              selection.removeSelection( thisElement );
            } else {
              mouseState = mouseStateSelectDrag;
              prevScreenPos = getMouseScreenPos( eventObject );
              gesture.start( getMouseScreenPos( eventObject ), thisGLE.scale() );
            }
          } else {
            if( drag.start( getMouseScreenPos( eventObject ), 
                            eventObject.ctrlKey, 
                            eventObject.shiftKey ) )
              mouseState = mouseStateDrag;
          }
        }
        //view.showKlick( view.screen2canvas( prevScreenPos ) );
        
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
            drag.move( getMouseScreenPos( eventObject ), eventObject.ctrlKey, eventObject.shiftKey );
            break;
            
          case mouseStateSelectDrag:
            view.showSelectionArea( view.screen2canvas( prevScreenPos ), 
                                    view.screen2canvas( getMouseScreenPos( eventObject ) ) );
            if( gesture.update( getMouseScreenPos( eventObject ) ) ) {
              // gesture detection sucessfull...
              var 
                gestureInfo = gesture.getInfo(),
                dS = drag.start( gestureInfo.center, false, false ),
                eL = [];
              //getSelectionCandidatesInArea( gestureInfo.center, gestureInfo.radius, eL );
              //console.log( gestureInfo.center.print(), gestureInfo.radius, dS, eL );
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
              thisGLE.setZoom( lastScale, contentCanvasPos, deltaPos.plus(prevScreenPos), true ); // zoom with temporary = true
              break;
            }
            
            thisGLE.setZoom( newScale * lastScale, contentCanvasPos, prevScreenPos, true ); // zoom with temporary = true
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
            drag.end();
            break;
            
          case mouseStateSelectDrag:
            view.showSelectionArea( undefined ); // unshow selection rectangle
            lastScreenPos = getMouseScreenPos( eventObject );
            selection.selectArea( prevScreenPos, lastScreenPos );
            break;
            
          case mouseStatePinch:
            if( eventObject.shiftKey ) { // only move
              var deltaPos = (new Vec2D( eventObject.pageX, eventObject.pageY ) ).minus( lastScreenPos );
              thisGLE.setZoom( lastScale, contentCanvasPos, deltaPos.plus(prevScreenPos), false );
            } else
              thisGLE.setZoom( thisGLE.scale, contentCanvasPos, prevScreenPos, false );
            break;
        }
        
        mouseState = mouseStateNone;
        
        thisGLE.updateStateInfos();
        
        return false; // stopp propagation as well as bubbling
      };
      
      // ****************************************************************** //
      // ****************************************************************** //
      // **                                                              ** //
      // ** Touch handling                                               ** //
      // **                                                              ** //
      // ****************************************************************** //
      // ****************************************************************** //
      
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
            
            if( drag.start( getTouchScreenPos( eventObject )[0] ) )
              mouseState = mouseStateDrag;
            else {
              mouseState = mouseStateSelectDrag;
              prevScreenPos = getTouchScreenPos( eventObject )[0];
              gesture.start( prevScreenPos, thisGLE.scale() );
            }
            break;
            
          case 2:
            mouseState = mouseStatePinch;
            pinch.start( eventObject );
            break;
        }
        $('#coords').text( 'touchstart' + self.printMouseState() + eventObject.originalEvent.touches.length);
        //getTouchPos( eventObject );
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
            drag.move( getTouchScreenPos( eventObject )[0] );
            break;
            
          case mouseStateSelectDrag:
            lastScreenPos = getTouchScreenPos( eventObject )[0]; // store as TouchUp doesn't have corrdinates anymore
            view.showSelectionArea( view.screen2canvas( prevScreenPos ),
                                    view.screen2canvas( lastScreenPos ) );
            gesture.update( getTouchScreenPos( eventObject )[0] ); // FIXME TEMP
            break;
            
          case mouseStatePinch:
            pinch.move( eventObject );
            break;
        }
        
        return false; // stopp propagation as well as bubbling
      };
      
      /**
       * Event handler for touchend.
       */
      this.touchend = function( eventObject ) {
        switch( mouseState )
        {
          case mouseStateDrag:
            drag.end();
            break;
            
          case mouseStateSelectDrag:
            view.showSelectionArea( undefined ); // unshow selection rectangle
            selection.selectArea( prevScreenPos, lastScreenPos );
            break;
            
          case mouseStatePinch:
            pinch.end();
            break;
        }
        
        thisGLE.updateStateInfos();
        
        // finger has left => do a new cycle, mouseState will be set there
        return self.touchstart( eventObject );
      };
      
      /**
       * Event handler for the touchcancel.
       * Set state to none as after a cancel the iPad needs a restart anyway.
       */
      this.touchcancel = function( eventObject ) {
        if( mouseState === mouseStateDrag )
          drag.end();
        
        thisGLE.updateStateInfos();
        
        mouseState = mouseStateNone;
        return false; // stopp propagation as well as bubbling
      };
  
      //////////////////// TODO - only for temporary debugging //////////////// 
      this.showGesture = function(scale){ gesture.show( view, scale ); };
    };
    
  // fill the prototype public methods of Gesture:
  Inputevent.prototype.toString = function() { return '[object Inputevent]'; };
      
  return Inputevent;
});