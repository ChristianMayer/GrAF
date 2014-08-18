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
 * 
 * @module Inputevent
 * @title  GrAF logic engine: graphical logic editor
 */

// create a local context:
(function( window, undefined ) {
  "use strict";
  
  // private variables:
  var 
    confirmedGesR, 

    /**
      * The Inputevent constructor
      */
    Inputevent = function( thisGLE ) {
      // private:
      var 
        self = this,
        view = thisGLE.view();
          
      // public:
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
            
          case 46: // delete
            thisGLE.selectionDelete();
            /*
            eventObject.preventDefault();
            selection.forEach( function( thisElement ) {
              blocks = blocks.filter( function( thisBlock ){
                return thisBlock != thisElement;
              } );
              thisElement.delete();
            } );
            selection.clear(); // elements were deleted -> remove them from the selection...
            self.invalidateHandlers();
            */
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
            thisGLE.zoomElements( selection.getElements() ); // fit to selection // FIXME and TODO - selection doesn't belont to this class anymore!
            break;
            
          default:
            console.log( 'key', eventObject, eventObject.keyCode );
        }
      };
        
      /**
        * Event handler for scrolling.
        */
      this.scroll = function( eventObject ) {
        if( eventObject )
          eventObject.preventDefault();
        
        view.scroll();
      };
    
      
    };
      
  // fill the prototype public methods of Gesture:
  Inputevent.prototype.toString = function() { return '[object Inputevent]'; };
      
    // create namespace if necessary
  if( undefined === window._GLE )
    window._GLE = {};
  
  if( undefined !== window._GLE.inputevent )
    throw 'Error: "inputevent" already in "_GLE" namespace!';
  
  window._GLE.inputevent = Inputevent;
})( window );