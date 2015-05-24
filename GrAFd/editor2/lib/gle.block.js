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
        pos      = new Vec2D( 0, 0 ),     // position in screen coordinates
        size     = new Vec2D( 100, 100 ), // size in screen coordinates
        minWidth = 5,
        minHeight = 5,
        matrix   = new Mat2D(),  // transformation matrix of unpositioned block
        mirror   = false,        // mirror axis after tranformation matrix
        rotation = 0,
        flip     = false,
        color    = '#000000',          // how to display
        fill     = '#ffffff',
        mask     = undefined,          // code for generating mask image
        maskFn   = undefined,          // parsed code for mask image
        maskOptions = {},//defaultMaskOptions,
        name     = '',
        fontSize,     // undefined --> use global
        fontFamiliy,  // undefined --> use global
        fontStyle,    // undefined --> use global
        inPorts  = [], 
        outPorts = [],
        handlers = [],
        updateTransformationMatrix = function(){
          switch( rotation )
          {
            default:
            case 0:
              matrix = new Mat2D();
              mirror = false;
              break;
              
            case 90:
              matrix = new Mat2D( 0,-1, 1, 0,   0, size.y);
              mirror = false;
              break;
              
            case 180:
              matrix = new Mat2D();
              mirror = true;
              break;
              
            case 270:
              matrix = new Mat2D( 0,-1, 1, 0,   0, size.y);
              mirror = true;
              break;
          }
        },
        updateMinSize = function(){
          var
            inLetters = 0,
            outLetters = 0;
          inPorts.forEach( function(thisPort){
            inLetters = Math.max( inLetters, thisPort.name.length );
          });
          outPorts.forEach( function(thisPort){
            outLetters = Math.max( outLetters, thisPort.name.length );
          });
          minWidth = 5 + 5*(inLetters + outLetters); // reserve 5px per letter
          minHeight = 5 + Math.max( inPorts.length, outPorts.length ) * 10;
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
        getCornerPos = function( index ){
          //var matri = matrix;//new Mat2D();
          var matri = new Mat2D();
          switch( index )
          {
            default:
            case 1:
              return pos.copy().plus( matri.mul( new Vec2D( 0, 0 ) ) );
              
            case 2:
              return pos.copy().plus( matri.mul( size.copy().cmul([1,0]) ) );
              
            case 3:
              return pos.copy().plus( matri.mul( size.copy().cmul([0,1]) ) );
              
            case 4:
              return pos.copy().plus( matri.mul( size ) );
          }
        },
        getInPortPos = function( index ){
          var
            width = (rotation%180===90?size.y:size.x),
            height = (rotation%180===90?size.x:size.y),
            thisIndex = maskOptions.portReorder ? index : ((rotation<180)?index:(inPorts.length - 1 - index)),
            centerY = (height * (thisIndex+0.5) / inPorts.length) | 0;
            
          return pos.copy().plus( matrix.mul( new Vec2D( (mirror?!flip:flip) ? width : 0, centerY ) ) );
        },
        getOutPortPos = function( index ){
          var 
            width = (rotation%180===90?size.y:size.x),
            height = (rotation%180===90?size.x:size.y),
            thisIndex = maskOptions.portReorder ? index : ((rotation<180)?index:(inPorts.length - 1 - index)),
            centerY = (height * (thisIndex+0.5) / outPorts.length) | 0;
            
          return pos.copy().plus( matrix.mul( new Vec2D( (mirror?!flip:flip) ? 0 : width, centerY ) ) );
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
      updateMinSize();
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
      updateMinSize();
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
      isLogicElement && (thisGLE.invalidateBBox(), thisGLE.invalidateContext());
      return this;
    };
    this.getTopLeft = function() {
      return pos.copy();
    };
    this.setBottomRight = function( coord ) {
      size = coord.minus( pos );
      isLogicElement && (thisGLE.invalidateBBox(), thisGLE.invalidateContext());
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
    this.setRotation = function( newAngle, keepAspectRatio ) {
      var
        needFlip = keepAspectRatio && ((newAngle - rotation + 360)%180 === 90);
        
      rotation = newAngle;
      size.reverse( needFlip );
      updateTransformationMatrix();
      isLogicElement && (thisGLE.invalidateBBox(), thisGLE.invalidateContext());
      return this;
    };
    this.setRotationDelta = function( deltaAngle ) {
      this.setRotation( (rotation + deltaAngle + 360)%360, true );
    };
    this.setFlip = function( newFlip ) {
      flip = newFlip === undefined ? (!flip) : newFlip;
      updateTransformationMatrix();
      updateConnections();
      isLogicElement && (thisGLE.invalidateBBox(), thisGLE.invalidateContext());
      return this;
    };
    this.getInCoordinates = function( handler, isPortNumber ) {
      if( (isPortNumber && handler < inPorts.length) ||
        (!isPortNumber && (5 <= handler) && (handler < 5 + inPorts.length) ) )
      {
        var portNumber = isPortNumber ? handler : handler - 5,
            endPos = getInPortPos( portNumber ),
            prevPos = endPos.copy().minus( matrix.nmul( new Vec2D((mirror?!flip:flip)?-1:1,0) ).scale(15) );
        return [ prevPos, endPos, portNumber ];
      }
    }
    this.getOutCoordinates = function( handler, isPortNumber ) {
      if( (isPortNumber && handler < outPorts.length) ||
        (!isPortNumber && handler >= 5 + inPorts.length) )
      {
        var portNumber = isPortNumber ? handler : handler - 5 - inPorts.length,
            startPos = getOutPortPos( portNumber ),
            nextPos = startPos.copy().plus( matrix.nmul( new Vec2D((mirror?!flip:flip)?-1:1,0) ).scale(5) );
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
      
      if( newMaskOptions )
        for( var key in defaultMaskOptions )
          maskOptions[ key ] = newMaskOptions[ key ] !== undefined ? newMaskOptions[ key ] : defaultMaskOptions[ key ];
      else
        for( var key in defaultMaskOptions )
          maskOptions[ key ] = defaultMaskOptions[ key ];
        //maskOptions = defaultMaskOptions;
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
        case 2:
        case 3:
        case 4:
          return thisGLE.checkHandlerBadSelection( mousePos, getCornerPos( index ) );
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
      if( interest & thisGLE.InterestMap.Block &&
          !thisGLE.checkHandlerBadSelection( mousePos, getCornerPos( 1 ) ) )
        return 1;
          
      if( interest & thisGLE.InterestMap.Block &&
          !thisGLE.checkHandlerBadSelection( mousePos, getCornerPos( 2 ) ) )
        return 2;
          
      if( interest & thisGLE.InterestMap.Block &&
          !thisGLE.checkHandlerBadSelection( mousePos, getCornerPos( 3 ) ) )
        return 3;
          
      if( interest & thisGLE.InterestMap.Block &&
          !thisGLE.checkHandlerBadSelection( mousePos, getCornerPos( 4 ) ) )
        return 4;
      
      if( interest & thisGLE.InterestMap.Block &&
          (pos.x <= mousePos.x) && 
          (pos.y <= mousePos.y) && 
          (mousePos.x <= (pos.x+size.x)) && 
          (mousePos.y <= (pos.y+size.y)) )
        return 0;
          
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
      console.log( 'block update', index, newPos.print(), shortDeltaPos.print(), '['+pos.print()+']' );
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
        flipH = maskOptions.imageFixed ? false : (mirror ? !flip : flip),
        flipV = maskOptions.imageFixed ? false : mirror,
        p    = pos.copy().scale( scale ).round(1),
        s    = size.copy().reverse( maskOptions.imageFixed ? false : (rotation%180 === 90) ).scale( scale ).round(1),
        m    = (5 * scale)|0; // the port marker (half-)size

      // draw block itself
      context.save(); // make sure to leave the context alone
      var matrix2 = matrix.copy(); matrix2.f *= scale;
      if( maskOptions.imageFixed )
        transform.copy().mmul( (new Mat2D()).translate( p ) ).setTransform( context );
      else
        transform.copy().mmul( (new Mat2D()).translate( p ).mmul(matrix2) ).setTransform( context );
      
      // draw shape to index map
      if( !isDrawFg )
      {
        view.drawHandler( (new Vec2D(0,0))                             , handlers[ 1 ], focus );
        view.drawHandler( (new Vec2D(0,0)).plus( s.copy().cmul([1,0]) ), handlers[ 2 ], focus );
        view.drawHandler( (new Vec2D(0,0)).plus( s.copy().cmul([0,1]) ), handlers[ 3 ], focus );
        view.drawHandler( (new Vec2D(0,0)).plus( s                    ), handlers[ 4 ], focus );
      }
      
      
      context.colorStyle = color;
      context.fillStyle  = fill;
      context.lineWidth  = ((thisGLE.settings.drawSizeBlock * scale * 0.5)|0)*2+1; // make sure it's uneven to prevent antialiasing unsharpness
      
      if( maskOptions.showBorder )
      {
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
                sA = flipH ? Math.PI - sAngle : sAngle,
                eA = flipH ? Math.PI - eAngle : eAngle;
              context.ellipse( (flipH?(1-x):x)*s.x, (flipV?(1-y):y)*s.y, r*s.x, r*s.y, 0, sA, eA, flipH ? !counterclockwise : counterclockwise );
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
              context.lineTo( (flipH?(1-x):x)*s.x, (flipV?(1-y):y)*s.y );
            },
            function move( x, y ) {
              context.moveTo( (flipH?(1-x):x)*s.x, (flipV?(1-y):y)*s.y );
            },
            function newPath() {
              context.beginPath();
            },
            function text( x, y, str, font ) {
              if( font === undefined ) font = {};
              
              context.font = ''
                + (font.style  ? font.style  : (fontStyle   ? fontStyle   : thisGLE.settings.fontStyle)) + ' '
                + (font.size   ? font.size   : (fontSize    ? fontSize    : thisGLE.settings.fontSize ))*scale + 'px '
                + (font.family ? font.family : (fontFamiliy ? fontFamiliy : thisGLE.settings.fontFamiliy));
                
              context.fillStyle = color;
              context.fillText( str, (flipH?(1-x):x)*s.x, (flipV?(1-y):y)*s.y );
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
      
      context.restore();
      context.textBaseline = 'middle';
      context.textAlign = rotation%180===90 ? 'center' : ((mirror?!flip:flip) ? 'right' : 'left');
      var startIndex = 5;
      inPorts.forEach( function( thisPort, index ){
        var 
          coords = self.getInCoordinates( index, true ),
          coord  = coords[1].copy().scale( scale ),
          direction = coords[1].copy().minus( coords[0] ).toLength( m ),
          normal = direction.copy().reverse(); // a fake normal but good enough for us
        context.fillText( thisPort.name, coord.x + direction.x, coord.y + direction.y );
        if( undefined === thisPort.connection ) 
        {
          context.beginPath();
          context.moveTo( coord.x - direction.x - normal.x, coord.y - direction.y - normal.y );
          context.lineTo( coord.x                         , coord.y                          );
          context.lineTo( coord.x - direction.x + normal.x, coord.y - direction.y + normal.y );
          context.stroke(); 
        } else {
        }
      });
      context.textAlign = rotation%180===90 ? 'center' : ((mirror?!flip:flip) ? 'left' : 'right');
      startIndex += inPorts.length;
      outPorts.forEach( function( thisPort, index ){
        var 
          coords = self.getOutCoordinates( index, true ),
          coord  = coords[0].copy().scale( scale ),
          direction = coords[0].copy().minus( coords[1] ).toLength( m ),
          normal = direction.copy().reverse(); // a fake normal but good enough for us
        context.fillText( thisPort.name, coord.x + direction.x, coord.y + direction.y );
        if( undefined === thisPort.connection ) 
        {
          context.beginPath();
          context.moveTo( coord.x               - normal.x, coord.y               - normal.y );
          context.lineTo( coord.x - direction.x           , coord.y - direction.y            );
          context.lineTo( coord.x               + normal.x, coord.y               + normal.y );
          context.stroke(); 
        } else {
        }
      });
    };
    
    // constructor
    //this.reregisterHandlers(); // initial registering
  };
  
  
  block.prototype.toString = function(){
    return '[object GLE:block]';
  };
  
  return block;
});