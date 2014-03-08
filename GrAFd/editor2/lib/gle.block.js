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
 * @module GLE.Block
 * @title  GrAF logic engine: graphical logic editor
 */
 
// create a local context:
(function( window, undefined ) {
  "use strict";
  
  // Constructor
  var block = function( thisGLE ){
    if( !( this instanceof block ) )
      throw 'Error, use "new" operator for Block!';
    
    // private:
    var self     = this,
        pos      = new Vec2D( 0, 0 ),  // geometry
        size     = new Vec2D( 100, 100 ),
        minWidth = 5,
        minHeight = 5,
        color    = '#000000',          // how to display
        fill     = '#ffffff',
        name     = '',
        inPorts  = [], 
        outPorts = [],
        handlers = [],
        getInPortPos = function( index ){
          var centerY = (size.y * (index+0.5) / inPorts.length) | 0;
          return pos.copy().plus( new Vec2D( 0     , centerY ) );
        },
        getOutPortPos = function( index ){
          var centerY = (size.y * (index+0.5) / outPorts.length) | 0;
          return pos.copy().plus( new Vec2D( size.x, centerY ) );
        };
    
    this.setName = function( newName ) {
      name = newName;
      thisGLE.invalidateContext();
      return this;
    };
    this.getName = function() {
      return name;
    }
    this.setInPorts = function( list ) {
      inPorts = list;
      inPorts.forEach( function( entry, i ) {
        if( 'string' === typeof entry )
          inPorts[ i ] = { name: entry };
      } );
      minHeight = 5 + Math.max( inPorts.length, outPorts.length ) * 10;
      thisGLE.invalidateHandlers();
      return this;
    };
    this.setInConnection = function( theConnection, portNumber )
    {
      if( 0 > portNumber || inPorts.length <= portNumber )
        throw 'portNumber ' + portNumber + ' is out of range!';
      
      inPorts[ portNumber ].connection = theConnection;
      return this;
    };
    this.setOutPorts = function( list ) {
      outPorts = list;
      outPorts.forEach( function( entry, i ) {
        if( 'string' === typeof entry )
          outPorts[ i ] = { name: entry };
      } );
      minHeight = 5 + Math.max( inPorts.length, outPorts.length ) * 10;
      thisGLE.invalidateHandlers();
      return this;
    };
    this.setOutConnection = function( theConnection, portNumber )
    {
      if( 0 > portNumber || outPorts.length <= portNumber )
        throw 'portNumber ' + portNumber + ' is out of range!';
      
      outPorts[ portNumber ].connection = theConnection;
      return this;
    };
    this.setTopLeft = function( coord ) {
      pos = coord.copy();
      thisGLE.invalidateContext();
      return this;
    };
    this.getTopLeft = function() {
      return pos.copy();
    };
    this.setBottomRight = function( coord ) {
      size = coord.minus( pos );
      thisGLE.invalidateContext();
      return this;
    };
    this.getBottomRight = function() {
      return pos.copy().plus( size );
    }
    this.getSize = function() {
      return size.copy();
    };
    this.getInCoordinates = function( handler ) {
      if( (5 <= handler) && (handler < 5 + inPorts.length) )
      {
        var portNumber = handler - 5,
            endPos = getInPortPos( portNumber );
        return [ endPos.copy().minus( new Vec2D( 20, 0 ) ), endPos, portNumber ];
      }
    }
    this.getOutCoordinates = function( handler ) {
      if( handler >= 5 + inPorts.length )
      {
        var portNumber = handler - 5 - inPorts.length,
            startPos = getOutPortPos( portNumber );
        return [ startPos, startPos.copy().plus( new Vec2D( 10, 0 ) ), portNumber ];
      }
    }
    this.getHandler = function() {
      return handlers[0];
    };
    
    /**
     * Return true if the @parm mousePos doesn't belong to this object
     */
    this.checkBadSelection = function( mousePos, index, epsilon, scale )
    {
      index = index | 0;
      switch( index )
      {
        case 0:
          return (pos.x > mousePos.x) || 
                 (pos.y > mousePos.y) || 
                 ((pos.x+size.x) < mousePos.x) || 
                 ((pos.y+size.y) < mousePos.y);
          
        case 1:
          return thisGLE.checkHandlerBadSelection( mousePos, pos );
          
        case 2:
          return thisGLE.checkHandlerBadSelection( mousePos, pos.copy().plus( size.copy().cmul([1,0]) ) );
          
        case 3:
          return thisGLE.checkHandlerBadSelection( mousePos, pos.copy().plus( size.copy().cmul([0,1]) ) );
          
        case 4:
          return thisGLE.checkHandlerBadSelection( mousePos, pos.copy().plus( size ) );
      }
      
      if( index < 5 + inPorts.length )
      {
        return thisGLE.checkHandlerBadSelection( mousePos, getInPortPos( index - 5 ) );
      }
      
      return thisGLE.checkHandlerBadSelection( mousePos, getOutPortPos( index - 5 - inPorts.length ) );
    };
    
    this.prepareUpdate = function( handler, index, mousePos, ctrlKey, shiftKey )
    {
      console.log( 'Block prepareUpdate', index, handler, ctrlKey );
      if( 0 === handler )
      {
        if( ctrlKey )
        {
          console.log( 'Duplicate Block' );
          index = thisGLE.addBlock()
                  .setTopLeft( pos )
                  .setBottomRight( pos.copy().plus( size ) )
                  .setName( thisGLE.getNextName( name ) )
                  .setInPorts ( inPorts.map ( function(thisPort){ return thisPort.name} ) )
                  .setOutPorts( outPorts.map( function(thisPort){ return thisPort.name} ) )
                  .getHandler();
          thisGLE.invalidateHandlers();
        }
      } else if( handler < 5 )
      {
      } else if( handler < 5 + inPorts.length )
      {
        var thisIndex = handler - 5;
      } else {
        var thisIndex = handler - 5 - inPorts.length,
            coords    = this.getOutCoordinates( handler );
        outPorts[ thisIndex ].connection = thisGLE
          .addConnection( { start: { block: this, portNumber: thisIndex }, name: name + '_Out#' + thisIndex } )
          //.insertWaypoint( getOutPortPos( thisIndex ).setQualifier( 'protected', true ) )
          //.insertWaypoint( getOutPortPos( thisIndex ).plus( new Vec2D( 10, 0 ) ).setQualifier( 'protected', true ) );
          .insertWaypoint( coords[0].setQualifier( 'protected', true ) )
          .insertWaypoint( coords[1].setQualifier( 'protected', true ) );
          //.insertWaypoint( getOutPortPos( thisIndex ).setQualifier( 'protected', false ) );
        return outPorts[ thisIndex ].connection.prepareUpdate( 1 );
        //return outPorts[ thisIndex ].connection.waypoints[1].handler;
      }
      
      return index;
    };
    
    /**
     * Update the position of the index.
     */
    this.update = function( index, newPos, shortDeltaPos )
    {
      index = index | 0;
      //console.log( 'block update',  index, newPos, shortDeltaPos );
      switch( index )
      {
        case 0: // main
          pos.plus( shortDeltaPos );
          break;
          
        case 1: // top left
          size.plus( pos ).minus( newPos );
          pos  = newPos;
          break;
          
        case 2: // top right
          size.x  = newPos.x - pos.x;
          size.y -= newPos.y - pos.y;
          pos.y   = newPos.y;
          break;
          
        case 3: // bottom left
          size.x -= newPos.x - pos.x;
          pos.x   = newPos.x;
          size.y  = newPos.y - pos.y;
          
          break;
          
        case 4: // bottom right
          size = newPos.minus( pos );
          break;
          
        default:
          return;
          if( index < 5 + inPorts.length )
          {
            var thisIndex = index - 5;
            console.log( 'upd add in', index, thisIndex, this );
            inPorts[ thisIndex ].connection = thisGLE
              .addConnection()
              .insertWaypoint( getInPortPos( thisIndex ).setQualifier( 'protected', true ) )
              .insertWaypoint( getInPortPos( thisIndex ).plus( new Vec2D( 15, 0 ) ).setQualifier( 'protected', true ) );
          } else {
            /*
            var thisIndex = index - 5 - inPorts.length;
            console.log( 'upd add out', index, thisIndex, this );
            outPorts[ thisIndex ].connection = thisGLE
              .addConnection( { start: { block: this, portNumber: thisIndex }, name: name + '_Out#' + thisIndex } )
              .insertWaypoint( getOutPortPos( thisIndex ).setQualifier( 'protected', true ) )
              .insertWaypoint( getOutPortPos( thisIndex ).plus( new Vec2D( 15, 0 ) ).setQualifier( 'protected', true ) )
              .insertWaypoint( getOutPortPos( thisIndex ).plus( new Vec2D( 15, 0 ) ).setQualifier( 'protected', false ) );
*/
          }
      };
      //pos.round( thisGLE.settings.gridSize );
      //size.round( thisGLE.settings.gridSize );
      //size.x = Math.max( size.x, minWidth  );
      //size.y = Math.max( size.y, minHeight );
      size.cmax( new Vec2D( minWidth, minHeight ) );
      pos.cmax( new Vec2D( 0, 0 ) );
      
      inPorts.forEach( function moveInPortConnection_PROFILENAME( thisPort, i ) {
        //console.log( thisPort, i, undefined !== thisPort.connection );
        if( undefined !== thisPort.connection )
        {
          var coords = self.getInCoordinates( i + 5 );
          var l = thisPort.connection.waypoints.length;
          var res = thisPort.connection.moveWaypoint( [ l-2, l-1 ], [coords[0], coords[1]], true );
          /*
          console.log( coords );
          var l = thisPort.connection.waypoints.length;
          //thisPort.connection.waypoints[ l - 2 ].replace( coords[0] );
          thisPort.connection.waypoints[ l - 1 ].protected = false;
          thisPort.connection.moveWaypoint( l - 2, coords[0].copy(), true );
          l = thisPort.connection.waypoints.length;
          thisPort.connection.waypoints[ l - 1 ].replace( coords[1] );
          thisPort.connection.waypoints[ l - 1 ].protected = true;
          */
        }
      } );
      outPorts.forEach( function moveOutPortConnection_PROFILENAME( thisPort, i ) {
        //console.log( thisPort, i, undefined !== thisPort.connection );
        if( undefined !== thisPort.connection )
        {
          var coords = self.getOutCoordinates( i + 5 + inPorts.length );
          var res = thisPort.connection.moveWaypoint( [0,1], [coords[0], coords[1]], true );
          /*
          var l = thisPort.connection.waypoints.length;
          thisPort.connection.waypoints[ 0 ].protected = false;
          //thisPort.connection.waypoints[ 1 ] = coords[1];
          var res = thisPort.connection.moveWaypoint( 1, coords[1].copy(), true );
          thisPort.connection.waypoints[ 0 ].replace( coords[0] );
          thisPort.connection.waypoints[ 0 ].protected = true;
          
          console.log( coords, res, handlers );
          */
        }
      } );
      return handlers[ index ]; // return handler again as it might have been renumbered by the connection move
    }
    
    this.finishUpdate = function( index )
    {
      console.log( 'Block finishUpdate', index );
    }
    
    /**
     * Delete itself, i.e. cancel references to it in the connections.
     */
    this.delete = function()
    {
      inPorts.forEach( function( thisPort ) {
        if( undefined !== thisPort.connection )
          thisPort.connection.end = undefined;
      } );
      outPorts.forEach( function( thisPort ) {
        if( undefined !== thisPort.connection )
          thisPort.connection.start = undefined;
      } );
      name = '### Deleted Block! ###'; // Help debuging the GC
    };
    
    /**
     * Get all the elements that should be considers active when this element
     * is active
     */
    this.getDerivedActive = function()
    {
      var retVal = [];
      inPorts.forEach( function( thisPort ) {
        if( undefined !== thisPort.connection )
          retVal.push( thisPort.connection );
      } );
      outPorts.forEach( function( thisPort ) {
        if( undefined !== thisPort.connection )
          retVal.push( thisPort.connection );
      } );
      return retVal;
    }
    
    /**
     * Draw itself on the canvas @param context and it's shape on the
     * @param index context.
     */
    this.draw = function( context, index, focus, isDrawFg ) {
      // draw shape to index map
      if( !isDrawFg )
      {
        thisGLE.view.prepareHandlerDrawing( handlers[ 0 ] );
        index.fillRect( pos.x, pos.y, size.x, size.y );
        
        thisGLE.view.drawHandler( pos                                       , handlers[ 1 ], focus );
        thisGLE.view.drawHandler( pos.copy().plus( size.copy().cmul([1,0]) ), handlers[ 2 ], focus );
        thisGLE.view.drawHandler( pos.copy().plus( size.copy().cmul([0,1]) ), handlers[ 3 ], focus );
        thisGLE.view.drawHandler( pos.copy().plus( size )                   , handlers[ 4 ], focus );
      }
      
      // draw block itself
      context.save(); // make sure to leave the context alone
      context.colorStyle = color;
      context.fillStyle  = fill;
      context.lineWidth  = thisGLE.settings.drawSizeBlock;
      context.fillRect( pos.x, pos.y, size.x, size.y );
      context.strokeRect( pos.x, pos.y, size.x, size.y );
      
      context.fillStyle = '#000000';
      context.textAlign = 'center';
      context.textBaseline = 'top';
      
      context.fillText( name, pos.x + size.x / 2, pos.y + size.y + 2 );
      
      context.textBaseline = 'middle';
      context.textAlign = 'left';
      var startIndex = 5;
      inPorts.forEach( function( thisPort, index ){
        var centerY = (size.y * (index+0.5) / inPorts.length) | 0;
        context.fillText( thisPort.name, pos.x + 5, pos.y + centerY );
        if( undefined === thisPort.connection ) 
        {
          context.beginPath();
          context.moveTo( pos.x - 5, pos.y - 5 + centerY );
          context.lineTo( pos.x    , pos.y     + centerY );
          context.lineTo( pos.x - 5, pos.y + 5 + centerY );
          context.stroke(); 
          isDrawFg || thisGLE.view.drawHandler( getInPortPos( index ), handlers[ startIndex + index ], focus );
        } else {
        }
      });
      context.textAlign = 'right';
      startIndex += inPorts.length;
      outPorts.forEach( function( thisPort, index ){
        var centerY = (size.y * (index+0.5) / outPorts.length) | 0;
        context.fillText( thisPort.name, pos.x + size.x - 5, pos.y + centerY );
        if( undefined === thisPort.connection ) 
        {
          context.beginPath();
          context.moveTo( pos.x + size.x    , pos.y - 5 + centerY );
          context.lineTo( pos.x + size.x + 5, pos.y     + centerY );
          context.lineTo( pos.x + size.x    , pos.y + 5 + centerY );
          context.stroke(); 
          isDrawFg || thisGLE.view.drawHandler( getOutPortPos( index ), handlers[ startIndex + index ], focus );
        } else {
        }
      });
      context.restore();
    };
    
    /**
     * Reregister all handlers, e.g. when they got invalid.
     */
    this.reregisterHandlers = function(){
      handlers.length = 0; 
      // the first 5 handlers are for the element itself and the 4 handlers
      for( var i = 0, l = 5 + inPorts.length + outPorts.length; i < l; i++ )
      {
        handlers.push( thisGLE.registerHandler( this, i ) );
      }
    }
    
    // constructor
    this.reregisterHandlers(); // initial registering
  };
  
  
  block.prototype.toString = function(){
    return '[object GLE:block]';
  };
  
  // create namespace if necessary
  if( undefined === window._GLE )
    window._GLE = {};
  
  if( undefined !== window._GLE.block )
    throw 'Error: "block" already in "_GLE" namespace!';
  
  window._GLE.block = block;
})( window );