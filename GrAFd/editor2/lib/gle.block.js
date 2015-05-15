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
 */

 
// create a local context:
define( ['lib/Vec2D', 'lib/Mat2D'], function( Vec2D, Mat2D, undefined ) {
  "use strict";
  
  var
    defaultMaskOptions = {
      'showLabel': true,
      'showBorder': true,
      'transparent': false,
      'unit': 'block', 
      // 'block' - (0,0)-(1,1)
      // 'screen' - (0,0)-(size.x,size.y)
      // 'content' - min(mask elements)-max(mask elements)
      'imageFixed': false,
      'portReorder': true
    },
  /**
   * @module GLE.Block
   * @title  GrAF logic engine: graphical logic editor
   * @constructor
   * @param isLogicElement {Bool} normaly true, false when a library element
   */
  block = function( thisGLE, isLogicElement ){
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
        mask     = undefined,          // code for generating mask image
        maskFn   = undefined,          // parsed code for mask image
        maskOptions = defaultMaskOptions,
        name     = '',
        fontSize,     // undefined --> use global
        fontFamiliy,  // undefined --> use global
        fontStyle,    // undefined --> use global
        inPorts  = [], 
        outPorts = [],
        handlers = [],
        updateTransformationMatrix = function(){
          var center = size.copy().scale( 0.5 );
          //matrix = (new Mat2D()).translate(center).scale(flip?-1:1,1).rotate(rotation*Math.PI/180).translate(center.scale(-1));
          matrix = (new Mat2D()).translate(center).rotate(rotation*Math.PI/180).translate(center.scale(-1));
          console.log( 'uTM', name, rotation, flip, matrix.print());
        },
        updateConnections = function() { // function to fix connections to match block after modification
          inPorts.forEach( function moveInPortConnection_PROFILENAME( thisPort, i ) {
            if( undefined !== thisPort.connection )
            {
              thisPort.connection.prepareUpdateEnd( self );
              thisPort.connection.finishUpdate();
            }
          } );
          outPorts.forEach( function moveOutPortConnection_PROFILENAME( thisPort, i ) {
            if( undefined !== thisPort.connection )
            {
              thisPort.connection.prepareUpdateStart();
              thisPort.connection.finishUpdate();
            }
          } );
        },
        getInPortPos = function( index ){
          var centerY = (size.y * (index+0.5) / inPorts.length) | 0;
          return pos.copy().plus( matrix.mul( new Vec2D( flip ? size.x : 0, centerY ) ) );
          //return pos.copy().plus( matrix.mul( new Vec2D( 0     , centerY ) ) );
          //return matrix.mul( pos.copy().plus( new Vec2D( 0     , centerY ) ) );
        },
        getOutPortPos = function( index ){
          var centerY = (size.y * (index+0.5) / outPorts.length) | 0;
          //console.log( 'getOutPortPos', name, pos.copy().plus( new Vec2D( size.x, centerY ) ), matrix.mul( pos.copy().plus( new Vec2D( size.x, centerY ) ) ), pos.copy().plus( matrix.mul( new Vec2D( size.x, centerY ) ) ) );
          return pos.copy().plus( matrix.mul( new Vec2D( flip ? 0 : size.x, centerY ) ) );
          //return pos.copy().plus( matrix.mul( new Vec2D( size.x, centerY ) ) );
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
      flip = newFlip === undefined ? (!flip) : newFlip;
      updateTransformationMatrix();
      updateConnections();
      isLogicElement && thisGLE.invalidateContext();
      return this;
    };
    this.getInCoordinates = function( handler, isPortNumber ) {
      if( (isPortNumber && handler < inPorts.length) ||
        (!isPortNumber && (5 <= handler) && (handler < 5 + inPorts.length) ) )
      {
        var portNumber = isPortNumber ? handler : handler - 5,
            endPos = getInPortPos( portNumber ),
            prevPos = endPos.copy().minus( matrix.nmul( new Vec2D(flip?-1:1,0) ).scale(15) );
        return [ prevPos, endPos, portNumber ];
      }
    }
    this.getOutCoordinates = function( handler, isPortNumber ) {
      if( (isPortNumber && handler < outPorts.length) ||
        (!isPortNumber && handler >= 5 + inPorts.length) )
      {
        var portNumber = isPortNumber ? handler : handler - 5 - inPorts.length,
            startPos = getOutPortPos( portNumber ),
            nextPos = startPos.copy().plus( matrix.nmul( new Vec2D(flip?-1:1,0) ).scale(5) );
        return [ startPos, nextPos, portNumber ];
      }
    }
    /**
     * Look up port number from given handler / index.
     */
    this.getInPortFromHandler = function( handler ) {
      if( (5 <= handler) && (handler < 5 + inPorts.length) )
        return handler - 5;
      throw 'Handler ' + handler + ' is not a valid InPort!';
    };
    /**
     * Look up port number from given handler / index.
     */
    this.getOutPortFromHandler = function( handler ) {
      if( handler >= 5 + inPorts.length )
        return handler - 5 - inPorts.length;
      throw 'Handler ' + handler + ' is not a valid OutPort!';
    };
    this.getHandler = function() {
      return handlers[0];
    };
    this.setMask = function( newMask, newMaskOptions )
    {
      mask = newMask;
      maskFn = undefined;
      
      if( newMask )
      {
        try {
          maskFn = new Function( 'maskOptions', 'maskParameters', 'arc', 'close', 'fill', 'line', 'move', 'newPath', 'text', newMask.join('') );
        } catch( e ) {
          console.error( 'Invalid mask image code!', e );
        }
      }
      maskOptions = newMaskOptions || defaultMaskOptions;
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
    this.getSelection = function( mousePos, interest )
    {
      //console.log( 'getSelection', interest, this.getName(), mousePos, pos, pos.copy().plus(size) );
      if( interest & thisGLE.InterestMap.Block &&
          (pos.x <= mousePos.x) && 
          (pos.y <= mousePos.y) && 
          (mousePos.x <= (pos.x+size.x)) && 
          (mousePos.y <= (pos.y+size.y)) )
        return 0;
          
      if( interest & thisGLE.InterestMap.Block &&
          !thisGLE.checkHandlerBadSelection( mousePos, pos ) )
        return 1;
          
      if( interest & thisGLE.InterestMap.Block &&
          !thisGLE.checkHandlerBadSelection( mousePos, pos.copy().plus( size.copy().cmul([1,0]) ) ) )
        return 2;
          
      if( interest & thisGLE.InterestMap.Block &&
          !thisGLE.checkHandlerBadSelection( mousePos, pos.copy().plus( size.copy().cmul([0,1]) ) ) )
        return 3;
          
      if( interest & thisGLE.InterestMap.Block &&
          !thisGLE.checkHandlerBadSelection( mousePos, pos.copy().plus( size ) ) )
        return 4;
      
      if( interest & thisGLE.InterestMap.InPort )
        for( var i = 0; i < inPorts.length; i++ )
          if( !thisGLE.checkHandlerBadSelection( mousePos, getInPortPos( i ) ) &&
            (
              (undefined === inPorts[ i ].connection) && (interest & thisGLE.InterestMap.InPortOpen) ||
              (undefined !== inPorts[ i ].connection) && (interest & thisGLE.InterestMap.InPortConnected)
            )
          )
            return i + 5;
      
      if( interest & thisGLE.InterestMap.OutPort )
        for( var i = 0; i < outPorts.length; i++ )
          if( !thisGLE.checkHandlerBadSelection( mousePos, getOutPortPos( i ) ) &&
            (
              (undefined === outPorts[ i ].connection) && (interest & thisGLE.InterestMap.OutPortOpen) ||
              (undefined !== outPorts[ i ].connection) && (interest & thisGLE.InterestMap.OutPortConnected)
            )
          )
            return i + 5 + inPorts.length;
      
      return undefined;
    }
    
    this.prepareUpdate = function( index, mousePos, ctrlKey, shiftKey )
    {
      console.log( 'Block prepareUpdate', index, ctrlKey, mousePos.print(), '['+pos.print()+']' );
      if( 0 === index )
      {
        if( ctrlKey )
        {
          console.log( 'Duplicate Block' );
          return thisGLE.addBlock()
                  .setTopLeft( pos )
                  .setBottomRight( pos.copy().plus( size ) )
                  .setName( thisGLE.getNextName( name ) )
                  .setInPorts ( inPorts.map ( function(thisPort){ return thisPort.name} ) )
                  .setOutPorts( outPorts.map( function(thisPort){ return thisPort.name} ) )
                  .getHandler();
        } else {
          console.log( 'move', inPorts, outPorts );
          inPorts.forEach( function( thisPort ) {
            if( undefined !== thisPort.connection )
              thisPort.connection.prepareUpdateEnd( self );
          });
          outPorts.forEach( function( thisPort ) {
            if( undefined !== thisPort.connection )
              thisPort.connection.prepareUpdateStart();
          });
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
          .addConnection( { "source": this.getName(), "sourcePort": thisIndex } );//, "waypoints": [ [mousePos.x, mousePos.y] ] } );
          //.addConnection( { start: { block: this, portNumber: thisIndex }, name: name + '_Out#' + thisIndex } )
          //.insertWaypoint( getOutPortPos( thisIndex ).setQualifier( 'protected', true ) )
          //.insertWaypoint( getOutPortPos( thisIndex ).plus( new Vec2D( 10, 0 ) ).setQualifier( 'protected', true ) );
          //.insertWaypoint( coords[0].setQualifier( 'protected', true ) )
          //.insertWaypoint( coords[1].setQualifier( 'protected', true ) );
          //.insertWaypoint( getOutPortPos( thisIndex ).setQualifier( 'protected', false ) );
        return outPorts[ thisIndex ].connection.prepareUpdate();
        //return outPorts[ thisIndex ].connection.waypoints[1].handler;
      }
    };
    
    /**
     * Update the position of the index.
     */
    this.update = function( index, newPos, shortDeltaPos, totalDeltaPos )
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
      updateTransformationMatrix();
      
      inPorts.forEach( function moveInPortConnection_PROFILENAME( thisPort, i ) {
        if( undefined !== thisPort.connection )
          thisPort.connection.update(index, newPos, shortDeltaPos, [] );
      } );
      outPorts.forEach( function moveOutPortConnection_PROFILENAME( thisPort, i ) {
        if( undefined !== thisPort.connection )
          thisPort.connection.update(index, newPos, shortDeltaPos, [] );
      } );
      return handlers[ index ]; // return handler again as it might have been renumbered by the connection move
    }
    
    this.finishUpdate = function( index )
    {
      console.log( 'Block finishUpdate', index, '['+pos.print()+']' );
      inPorts.forEach( function moveInPortConnection_PROFILENAME( thisPort, i ) {
        if( undefined !== thisPort.connection )
          thisPort.connection.finishUpdate();
      } );
      outPorts.forEach( function moveOutPortConnection_PROFILENAME( thisPort, i ) {
        if( undefined !== thisPort.connection )
          thisPort.connection.finishUpdate();
      } );
    }
    
    /**
     * Delete itself, i.e. cancel references to it in the connections.
     * @retrun true when this block can be deleted completely
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
      return true;
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
    this.draw = function( ctx, focus, isDrawFg, scale ) {
      var 
        index = undefined,
        context = ctx[0],
        transform = ctx[1],
        view = thisGLE.view(),
        doFlip = maskOptions.imageFixed ? false : flip,
        p    = pos.copy().scale( scale ).round(1),
        s    = size.copy().scale( scale ).round(1),
        m    = (5 * scale)|0; // the port marker (half-)size
      
      // Maks Options:
      /*
        "showLabel": false,
        "showBorder": true,
        "transparent": false,
        "unit": 
          "block" - (0,0)-(1,1)
          "screen" - (0,0)-(size.x,size.y)
          "content" - min(mask elements)-max(mask elements)
        "imageFixed": 
          true - only rotate the ports
        "portReorder":
          false - rotate the port position together with the block
          true - port numbers are allways starting on the top and the left
      */

      // draw shape to index map
      if( !isDrawFg )
      {
        /*
        view.drawHandler( p                                    , handlers[ 1 ], focus );
        view.drawHandler( p.copy().plus( s.copy().cmul([1,0]) ), handlers[ 2 ], focus );
        view.drawHandler( p.copy().plus( s.copy().cmul([0,1]) ), handlers[ 3 ], focus );
        view.drawHandler( p.copy().plus( s )                   , handlers[ 4 ], focus );
        */
        /*
        view.drawHandler( matrix.mul( p                                     ), handlers[ 1 ], focus );
        view.drawHandler( matrix.mul( p.copy().plus( s.copy().cmul([1,0]) ) ), handlers[ 2 ], focus );
        view.drawHandler( matrix.mul( p.copy().plus( s.copy().cmul([0,1]) ) ), handlers[ 3 ], focus );
        view.drawHandler( matrix.mul( p.copy().plus( s )                    ), handlers[ 4 ], focus );
        */
        var trM = (new Mat2D()).translate( p ).mmul(matrix);
        view.drawHandler( trM.mul( new Vec2D(0,0)       ), handlers[ 1 ], focus );
        view.drawHandler( trM.mul( s.copy().cmul([1,0]) ), handlers[ 2 ], focus );
        view.drawHandler( trM.mul( s.copy().cmul([0,1]) ), handlers[ 3 ], focus );
        view.drawHandler( trM.mul( s                    ), handlers[ 4 ], focus );
      }
      
      // draw block itself
      context.save(); // make sure to leave the context alone
      //matrix.copy().translate( p ).setTransform( context );
      //context.transformMatrix.copy().mmul( (new Mat2D()).translate( p ).mmul(matrix) ).setTransform( context );
      transform.copy().mmul( (new Mat2D()).translate( p ).mmul(matrix) ).setTransform( context );
      //(new Mat2D()).translate( p ).mmul(matrix).setTransform( context );
      context.colorStyle = color;
      context.fillStyle  = fill;
      context.lineWidth  = ((thisGLE.settings.drawSizeBlock * scale * 0.5)|0)*2+1; // make sure it's uneven to prevent antialiasing unsharpness
      
      if( maskOptions.showBorder )
      {
        //context.fillRect( p.x, p.y, s.x, s.y );
        //context.strokeRect( p.x, p.y, s.x, s.y );
        context.fillRect( 0, 0, s.x, s.y );
        context.strokeRect( 0, 0, s.x, s.y );
      }
      
      if( maskFn !== undefined )
      {
        context.beginPath();
        try {
          maskFn( maskOptions, {},
            function arc( x, y, r, sAngle, eAngle, counterclockwise ) {
              var
                sA = doFlip ? Math.PI - sAngle : sAngle,
                eA = doFlip ? Math.PI - eAngle : eAngle;
              context.ellipse( (doFlip?(1-x):x)*s.x, y*s.y, r*s.x, r*s.y, 0, sA, eA, doFlip ? !counterclockwise : counterclockwise );
            },
            function close() {
              context.closePath(); 
              context.stroke(); 
            },
            function fill() {
              context.fill();
              context.closePath(); 
              context.stroke(); 
            },
            function line( x, y ) {
              context.lineTo( (doFlip?(1-x):x)*s.x, y*s.y );
            },
            function move( x, y ) {
              context.moveTo( (doFlip?(1-x):x)*s.x, y*s.y );
            },
            function newPath() {
              context.beginPath();
            },
            function text( x, y, text, font ) {
              if( font === undefined ) font = {};
              
              context.font = ''
                + (font.style  ? font.style  : (fontStyle   ? fontStyle   : thisGLE.settings.fontStyle)) + ' '
                + (font.size   ? font.size   : (fontSize    ? fontSize    : thisGLE.settings.fontSize ))*scale + 'px '
                + (font.family ? font.family : (fontFamiliy ? fontFamiliy : thisGLE.settings.fontFamiliy));
                
              context.fillStyle = color;
              context.fillText( text, (doFlip?(1-x):x)*s.x, y*s.y );
              context.fillStyle = fill;
            }
          );
        } catch( e ) {
          console.error( 'Invalid mask image code!', e );
          maskFn = undefined; // don't try again during this run
        }
        context.stroke(); 
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
      context.textAlign = flip ? 'right' : 'left';
      var startIndex = 5;
      inPorts.forEach( function( thisPort, index ){
        var centerY = (s.y * (index+0.5) / inPorts.length) | 0;
        //context.fillText( thisPort.name, p.x + m, p.y + centerY );
        context.fillText( thisPort.name, flip ? (s.x - m) : m, centerY );
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
          //isDrawFg || view.drawHandler( getInPortPos( index ).copy().scale( scale ).round(1), handlers[ startIndex + index ], focus );
          isDrawFg || view.drawHandler( getInPortPos( index ).copy().minus(p).scale( 1+0*scale ).round(1), handlers[ startIndex + index ], focus );
        } else {
        }
      });
      context.textAlign = flip ? 'left' : 'right';
      startIndex += inPorts.length;
      outPorts.forEach( function( thisPort, index ){
        var centerY = (s.y * (index+0.5) / outPorts.length) | 0;
        //context.fillText( thisPort.name, p.x + s.x - m, p.y + centerY );
        context.fillText( thisPort.name, flip ? m : (s.x - m), centerY );
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
    
    // constructor
    //this.reregisterHandlers(); // initial registering
  };
  
  
  block.prototype.toString = function(){
    return '[object GLE:block]';
  };
  
  return block;
});