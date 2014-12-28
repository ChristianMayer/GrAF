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
 */

 
// create a local context:
define( ['lib/Vec2D', 'lib/Mat2D'], function( Vec2D, Mat2D, undefined ) {
  "use strict";
  
  /**
   * @module GLE.Block
   * @title  GrAF logic engine: graphical logic editor
   * @constructor
   * @param isLogicElement {Bool} normaly true, false when a library element
   */
  var block = function( thisGLE, isLogicElement ){
    if( !( this instanceof block ) )
      throw 'Error, use "new" operator for Block!';
    
    // private:
    var self     = this,
        pos      = new Vec2D( 0, 0 ),  // geometry
        size     = new Vec2D( 100, 100 ),
        minWidth = 5,
        minHeight = 5,
        matrix   = new Mat2D(),  // transformation matrix of unpositioned block
        rotation = 0,
        flip     = false,
        color    = '#000000',          // how to display
        fill     = '#ffffff',
        mask     = undefined,
        name     = '',
        fontSize,     // undefined --> use global
        fontFamiliy,  // undefined --> use global
        fontStyle,    // undefined --> use global
        inPorts  = [], 
        outPorts = [],
        handlers = [],
        updateTransformationMatrix = function(){
          var center = size.copy().scale( 0.5 );
          matrix = (new Mat2D()).translate(center).scale(flip?-1:1,1).rotate(rotation*Math.PI/180).translate(center.scale(-1));
          console.log( 'uTM', name, rotation, flip, matrix.print());
        },
        getInPortPos = function( index ){
          var centerY = (size.y * (index+0.5) / inPorts.length) | 0;
          return pos.copy().plus( matrix.mul( new Vec2D( 0     , centerY ) ) );
          //return matrix.mul( pos.copy().plus( new Vec2D( 0     , centerY ) ) );
        },
        getOutPortPos = function( index ){
          var centerY = (size.y * (index+0.5) / outPorts.length) | 0;
          //console.log( 'getOutPortPos', name, pos.copy().plus( new Vec2D( size.x, centerY ) ), matrix.mul( pos.copy().plus( new Vec2D( size.x, centerY ) ) ), pos.copy().plus( matrix.mul( new Vec2D( size.x, centerY ) ) ) );
          return pos.copy().plus( matrix.mul( new Vec2D( size.x, centerY ) ) );
          //return matrix.mul( pos.copy().plus( new Vec2D( size.x, centerY ) ) );
        };
    
    this.setName = function( newName ) {
      name = newName;
      isLogicElement && thisGLE.invalidateContext();
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
      return this;
    };
    this.setOutConnection = function( theConnection, portNumber )
    {
      if( 0 > portNumber || outPorts.length <= portNumber )
        throw 'portNumber ' + portNumber + ' is out of range for block "' + this.name + '"!';
      
      outPorts[ portNumber ].connection = theConnection;
      return this;
    };
    this.setTopLeft = function( coord ) {
      pos = coord.copy();
      isLogicElement && thisGLE.invalidateBBox();
      return this;
    };
    this.getTopLeft = function() {
      return pos.copy();
    };
    this.setBottomRight = function( coord ) {
      size = coord.minus( pos );
      isLogicElement && thisGLE.invalidateBBox();
      return this;
    };
    this.getBottomRight = function() {
      return pos.copy().plus( size );
    }
    this.getSize = function() {
      return size.copy();
    };
    this.setSize = function( coord_rel ) {
      size = coord_rel.copy();
      updateTransformationMatrix();
      isLogicElement && thisGLE.invalidateBBox();
      return this;
    };
    this.setRotation = function( newAngle ) {
      rotation = newAngle;
      updateTransformationMatrix();
      isLogicElement && thisGLE.invalidateBBox();
      return this;
    };
    this.setFlip = function( newFlip ) {
      flip = newFlip;
      updateTransformationMatrix();
      isLogicElement && thisGLE.invalidateBBox();
      return this;
    };
    this.getInCoordinates = function( handler, isPortNumber ) {
      if( (isPortNumber && handler < inPorts.length) ||
        (!isPortNumber && (5 <= handler) && (handler < 5 + inPorts.length) ) )
      {
        var portNumber = isPortNumber ? handler : handler - 5,
            endPos = getInPortPos( portNumber ),
            prevPos = endPos.copy().minus( matrix.nmul( new Vec2D(1,0) ).scale(15) );
        return [ prevPos, endPos, portNumber ];
      }
    }
    this.getOutCoordinates = function( handler, isPortNumber ) {
      if( (isPortNumber && handler < outPorts.length) ||
        (!isPortNumber && handler >= 5 + inPorts.length) )
      {
        var portNumber = isPortNumber ? handler : handler - 5 - inPorts.length,
            startPos = getOutPortPos( portNumber ),
            nextPos = startPos.copy().plus( matrix.nmul( new Vec2D(1,0) ).scale(5) );
        return [ startPos, nextPos, portNumber ];
      }
    }
    this.getHandler = function() {
      return handlers[0];
    };
    this.setMask = function( newMask )
    {
      mask = newMask;
    };
    
    /**
     * Return true when the area between @param minPos and @param maxPos don't
     * belong to this object.
     */
    this.checkAreaBadSelection = function( minPos, maxPos ) {
      return (
        (maxPos.x < pos.x) || ((pos.x+size.x) < minPos.x) ||
        (maxPos.y < pos.y) || ((pos.y+size.y) < minPos.y)
      );
    };
    
    /**
     * Return true if the @parm mousePos doesn't belong to this object
     */
    this.checkBadSelection = function( mousePos, index, epsilon )
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
    
    /**
     * Return the index of the mouse pos - or undefined when no active area was
     * hit.
     */
    this.getSelection = function( mousePos )
    {
      console.log( 'getSelection', this.getName(), mousePos, pos, pos.copy().plus(size) );
      if( (pos.x <= mousePos.x) && 
          (pos.y <= mousePos.y) && 
          (mousePos.x <= (pos.x+size.x)) && 
          (mousePos.y <= (pos.y+size.y)) )
        return 0;
          
      if( !thisGLE.checkHandlerBadSelection( mousePos, pos ) )
        return 1;
          
      if( !thisGLE.checkHandlerBadSelection( mousePos, pos.copy().plus( size.copy().cmul([1,0]) ) ) )
        return 2;
          
      if( !thisGLE.checkHandlerBadSelection( mousePos, pos.copy().plus( size.copy().cmul([0,1]) ) ) )
        return 3;
          
      if( !thisGLE.checkHandlerBadSelection( mousePos, pos.copy().plus( size ) ) )
        return 4;
      
      for( var i = 0; i < inPorts.length; i++ )
      {
        if( !thisGLE.checkHandlerBadSelection( mousePos, getInPortPos( i ) ) )
          return i + 5;
      }
      
      for( var i = 0; i < outPorts.length; i++ )
      {
        if( !thisGLE.checkHandlerBadSelection( mousePos, getOutPortPos( i ) ) )
          return i + 5 + inPorts.length;
      }
      
      return undefined;
    }
    
    this.prepareUpdate = function( index, handler, mousePos, ctrlKey, shiftKey )
    {
      console.log( 'Block prepareUpdate', index, handler, ctrlKey, mousePos.print(), '['+pos.print()+']' );
      if( 0 === index )
      {
        if( ctrlKey )
        {
          console.log( 'Duplicate Block' );
          handler = thisGLE.addBlock()
                  .setTopLeft( pos )
                  .setBottomRight( pos.copy().plus( size ) )
                  .setName( thisGLE.getNextName( name ) )
                  .setInPorts ( inPorts.map ( function(thisPort){ return thisPort.name} ) )
                  .setOutPorts( outPorts.map( function(thisPort){ return thisPort.name} ) )
                  .getHandler();
        }
      } else if( index < 5 )
      {
      } else if( index < 5 + inPorts.length )
      {
        var thisIndex = index - 5;
      } else {
        var thisIndex = index - 5 - inPorts.length,
            coords    = this.getOutCoordinates( index );
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
      
      return handler;
    };
    
    /**
     * Update the position of the index.
     */
    this.update = function( index, newPos, shortDeltaPos )
    {
      index = index | 0;
      //console.log( 'block update', index, newPos.print(), shortDeltaPos.print(), '['+pos.print()+']' );
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
      console.log( 'Block finishUpdate', index, '['+pos.print()+']' );
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
    this.draw = function( context, focus, isDrawFg, scale ) {
      var 
        index = undefined,
        view = thisGLE.view(),
        p    = pos.copy().scale( scale ).round(1),
        s    = size.copy().scale( scale ).round(1),
        m    = (5 * scale)|0; // the port marker (half-)size
      
      // draw shape to index map
      if( !isDrawFg )
      {
        view.drawHandler( p                                    , handlers[ 1 ], focus );
        view.drawHandler( p.copy().plus( s.copy().cmul([1,0]) ), handlers[ 2 ], focus );
        view.drawHandler( p.copy().plus( s.copy().cmul([0,1]) ), handlers[ 3 ], focus );
        view.drawHandler( p.copy().plus( s )                   , handlers[ 4 ], focus );
      }
      
      // draw block itself
      context.save(); // make sure to leave the context alone
      //matrix.copy().translate( p ).setTransform( context );
      (new Mat2D()).translate( p ).mmul(matrix).setTransform( context );
      context.colorStyle = color;
      context.fillStyle  = fill;
      context.lineWidth  = ((thisGLE.settings.drawSizeBlock * scale * 0.5)|0)*2+1; // make sure it's uneven to prevent antialiasing unsharpness
      if( mask !== undefined )
      {
        context.beginPath();
        mask.forEach( function( gE ){
          var 
            x = 0*p.x + gE.x * s.x, 
            y = 0*p.y + gE.y * s.y;
          switch( gE.type ) {
            case 'arc':
              // todo: make scaling / radius independend of x and y
              context.arc( x, y, gE.r * s.x, gE.sAngle, gE.eAngle, gE.counterclockwise );
              break;
              
            case 'close':
              context.closePath(); 
              context.stroke(); 
              break;
              
            case 'line':
              context.lineTo( x, y );
              break;
              
            case 'move':
              context.moveTo( x, y );
              break;
              
            case 'new':
              context.beginPath();
              break;
              
            case 'text':
              if( gE.styling )
                context.font = gE.styling;
              context.fillStyle = color;
              context.fillText( gE.text, x, y );
              context.fillStyle = fill;
              break;
              
            default:
              console.log( 'mask with unknown gE:', gE );
          };
        });
        context.stroke(); 
      } else {
        //context.fillRect( p.x, p.y, s.x, s.y );
        //context.strokeRect( p.x, p.y, s.x, s.y );
        context.fillRect( 0, 0, s.x, s.y );
        context.strokeRect( 0, 0, s.x, s.y );
      }
      
      context.fillStyle = '#000000';
      context.textAlign = 'center';
      context.textBaseline = 'top';
      
      context.font = ''
        + (fontSize    ? fontSize    : thisGLE.settings.fontSize)*scale + 'px '
        + (fontFamiliy ? fontFamiliy : thisGLE.settings.fontFamiliy) + ' '
        + (fontStyle   ? fontStyle   : thisGLE.settings.fontStyle) ;
      
      //context.fillText( name, p.x + s.x / 2, p.y + s.y + 2 );
      context.fillText( name, s.x / 2, s.y + 2 );
      
      context.textBaseline = 'middle';
      context.textAlign = 'left';
      var startIndex = 5;
      inPorts.forEach( function( thisPort, index ){
        var centerY = (s.y * (index+0.5) / inPorts.length) | 0;
        //context.fillText( thisPort.name, p.x + m, p.y + centerY );
        context.fillText( thisPort.name, m, centerY );
        if( undefined === thisPort.connection ) 
        {
          context.beginPath();
          //context.moveTo( p.x - m, p.y - m + centerY );
          //context.lineTo( p.x    , p.y     + centerY );
          //context.lineTo( p.x - m, p.y + m + centerY );
          context.moveTo( -m, -m + centerY );
          context.lineTo(  0,      centerY );
          context.lineTo( -m,  m + centerY );
          context.stroke(); 
          isDrawFg || view.drawHandler( getInPortPos( index ).copy().scale( scale ).round(1), handlers[ startIndex + index ], focus );
        } else {
        }
      });
      context.textAlign = 'right';
      startIndex += inPorts.length;
      outPorts.forEach( function( thisPort, index ){
        var centerY = (s.y * (index+0.5) / outPorts.length) | 0;
        //context.fillText( thisPort.name, p.x + s.x - m, p.y + centerY );
        context.fillText( thisPort.name, s.x - m, centerY );
        if( undefined === thisPort.connection ) 
        {
          context.beginPath();
          //context.moveTo( p.x + s.x    , p.y - m + centerY );
          //context.lineTo( p.x + s.x + m, p.y     + centerY );
          //context.lineTo( p.x + s.x    , p.y + m + centerY );
          context.moveTo( s.x    , -m + centerY );
          context.lineTo( s.x + m,      centerY );
          context.lineTo( s.x    ,  m + centerY );
          context.stroke(); 
          isDrawFg || view.drawHandler( getOutPortPos( index ).copy().scale( scale ).round(1), handlers[ startIndex + index ], focus );
        } else {
        }
      });
      context.restore();
    };
    
    /**
     * Reregister all handlers, e.g. when they got invalid.
     */
    /*
    this.reregisterHandlers = function(){
      handlers.length = 0; 
      // the first 5 handlers are for the element itself and the 4 handlers
      for( var i = 0, l = 5 + inPorts.length + outPorts.length; i < l; i++ )
      {
        handlers.push( thisGLE.registerHandler( this, i ) );
      }
    }
    */
    
    // constructor
    //this.reregisterHandlers(); // initial registering
  };
  
  
  block.prototype.toString = function(){
    return '[object GLE:block]';
  };
  
  return block;
});