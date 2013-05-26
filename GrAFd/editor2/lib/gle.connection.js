/**
 * gle.connection.js (c) 2013 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 * @module GLE.Connection
 * @title  GrAF logic engine: graphical logic editor
 */
 
// create a local context:
(function( window, undefined ) {
  "use strict";
  
  // Constructor
  var Connection = function( thisGLE, parameters ){
    console.log( 'new Connection', parameters );
    if( !( this instanceof Connection ) )
      throw 'Error, use "new" operator for Connection!';
    
    if( undefined === parameters )
      parameters = {};
    
    // private:
    var self     = this,
        worker   = (typeof Worker !== 'undefined') ? new Worker("lib/autorouter.js") : undefined,
        /**
         * Remove double waypoints.
         * If the @param currentIndex gets a new number it's @returned.
         */
        simplify = function( currentIndex ) {
          var newIndex = (currentIndex < 0) ? (-currentIndex-1) : currentIndex;
          
          // remove duplicate points
          for( var i = self.waypoints.length - 2; i >= 0; i-- )
          {
            if( self.waypoints[i+1].equal( self.waypoints[i] ) )
            {
              // found a duplicate point - but only remove an unproteced one
              if( !self.waypoints[i+1].protected )
              {
                if( i+1 <= newIndex )
                  newIndex--;
                
                var old = self.waypoints.splice( i+1, 1 ); // remove doubled point
                thisGLE.unregisterHandler( old[0].handler );
              } else if( !self.waypoints[i].protected )
              {
                if( i <= newIndex )
                  newIndex--;
                
                var old = self.waypoints.splice( i, 1 ); // remove doubled point
                thisGLE.unregisterHandler( old[0].handler );
              }
            }
          }
          
          // remove colinear points (no need to care about duplicates anymore...
          for( var i = self.waypoints.length - 3; i >= 0; i-- )
          {
            if( (self.waypoints[i+2].x === self.waypoints[i+1].x && self.waypoints[i+1].x === self.waypoints[i].x) ||
                (self.waypoints[i+2].y === self.waypoints[i+1].y && self.waypoints[i+1].y === self.waypoints[i].y) )
            {
              // found a colinear point - but only remove an unproteced one
              if( self.waypoints[i+1].protected )
                continue;
              
              if( i+1 <= newIndex )
              {
                if( i+1 == newIndex ) continue;
                console.log( 'sim 2', currentIndex, newIndex, i );
                newIndex--;
              }
              
              var old = self.waypoints.splice( i+1, 1 ); // remove doubled point
              thisGLE.unregisterHandler( old[0].handler );
            }
          }
          
          thisGLE.invalidateHandlers();
          
          return newIndex;
        };
        
    this.name      = parameters.name;
    this.start     = parameters.start; // object where the connection begins
    this.end       = parameters.end;   // object where the connection ends
    this.waypoints = [];
    this.candidates = { waypoints: [], direction: 5 };
    this.GLE       = thisGLE;
    
    /**
     * Draw itself on the canvas @param context and it's shape on the
     * @param index context.
     */
    this.draw = function( context, index, focus ) {
      //console.log( 'draw conn', this, context, index, active );
      
      //#//thisGLE.prepareHandlerDrawing( this.handler );
      
      // draw block itself
      context.save(); // make sure to leave the context alone
      context.fillStyle = '#000000';
      context.beginPath();
      index.beginPath();
      var oldIndexPos,
          waypoints = this.candidates.appendEnd 
                      ? this.waypoints.concat( this.candidates.waypoints )
                      : this.candidates.waypoints.slice().reverse().concat( this.waypoints );
      
      waypoints.forEach( function drawWaypoint_PROFILENAME(thisPoint, i ){
        if( thisPoint.protected )
          context.fillStyle = '#FF0000';
        else
          context.fillStyle = '#000000';
          
        context.fillRect( thisPoint.x-2, thisPoint.y-2, 5, 5 );
        //console.log(thisPoint, i );
        if( 0 == i )
        {
          context.moveTo( thisPoint.x, thisPoint.y );
          index.moveTo( thisPoint.x, thisPoint.y );
          //##//oldIndexPos = thisPoint;
        } else {
          context.lineTo( thisPoint.x, thisPoint.y );
          /**/
          index.lineTo( thisPoint.x, thisPoint.y );
          index.stroke();
          index.beginPath();
          index.moveTo( thisPoint.x, thisPoint.y );
      /**//*
        thisGLE.prepareHandlerDrawing( oldIndexPos.lineHandler );
          index.beginPath();
          index.moveTo( oldIndexPos.x, oldIndexPos.y );
          index.lineTo( thisPoint.x, thisPoint.y );
          index.stroke();
      */
        }
        thisGLE.prepareHandlerDrawing( thisPoint.lineHandler );
      });
      index.stroke();
      context.stroke();
      
      // draw arrow head
      context.beginPath();
      if( waypoints.length > 1 )
      {
        var lastPoint = waypoints[ waypoints.length - 1 ],
            prevPoint = waypoints[ waypoints.length - 2 ],
            direction = lastPoint.copy().minus( prevPoint ).toLength( 1.0 ),
            normal    = direction.getNormal();
        context.moveTo( lastPoint.x, lastPoint.y );
        context.lineTo( lastPoint.x - 15 * direction.x + 5 * normal.x,
                        lastPoint.y - 15 * direction.y + 5 * normal.y );
        context.lineTo( lastPoint.x - 15 * direction.x - 5 * normal.x,
                        lastPoint.y - 15 * direction.y - 5 * normal.y );
        context.lineTo( lastPoint.x, lastPoint.y );
      }
      context.fill();
      context.restore();
      
      // draw waypoints to index map
      this.waypoints.forEach( function drawWaypointHandler_PROFILENAME(thisPoint, i ){
        thisGLE.drawHandler( thisPoint, thisPoint.handler, focus );
      } );
      
    }
    
    /**
     * Move a single waypoint and take care that the neigbours keep their 
     * direction.
     */
    this.moveWaypoint = function( index, newPos, absolute )
    {
      var waypoints = self.waypoints, // speed up indirection
          minIdx = 'number' === typeof index ? index  : index[0],
          minPos = Array.isArray( newPos )   ? newPos[0] : newPos,
          maxIdx = 'number' === typeof index ? index  : index[1],
          maxPos = Array.isArray( newPos )   ? newPos[newPos.length-1] : newPos,
          myIdx  = maxIdx;
      console.log( 'moveWaypoint', index, minIdx, maxIdx, newPos, absolute, waypoints.length );
      // move prev point
      if( minIdx > 0 )
      {
        if( 1 === minIdx && undefined !== self.start )
        {
          console.log('add Pt');
        console.log( waypoints.map(function(p){return p.print()+p.protected;}) );
          self.insertWaypoint( waypoints[ minIdx ].copy(), minIdx+1 );
        console.log( waypoints.map(function(p){return p.print()+p.protected;})  );
          minIdx++;
          maxIdx++;
          minIdx++;
          maxIdx++;
          myIdx += 2;
        } else
        if( waypoints[ minIdx-1 ].protected || 1 === minIdx )
        {
          self.insertWaypoint( waypoints[ minIdx-1 ].copy(), minIdx );
          minIdx++;
          maxIdx++;
          myIdx++;
        }
        
        if     ( waypoints[ minIdx-1 ].x === waypoints[ minIdx ].x )
          waypoints[ minIdx-1 ].x = minPos.x + (!absolute ? waypoints[ minIdx-1 ].x : 0);
        else if( waypoints[ minIdx-1 ].y === waypoints[ minIdx ].y )
          waypoints[ minIdx-1 ].y = minPos.y + (!absolute ? waypoints[ minIdx-1 ].y : 0);
      }
      // move next point
      //if( index+2 == waypoints.length ) // second last point?
      //  self.insertWaypoint( waypoints[ index+1 ].copy() );
      if( maxIdx+1 < waypoints.length )
      {
        if( waypoints[ maxIdx+1 ].protected || (maxIdx+2) === waypoints.length )
        {
          self.insertWaypoint( waypoints[ maxIdx+1 ].copy(), maxIdx+1 );
        }
        
        if     ( waypoints[ maxIdx+1 ].x === waypoints[ maxIdx ].x )
          waypoints[ maxIdx+1 ].x = maxPos.x + (!absolute ? waypoints[ maxIdx+1 ].x : 0);
        else if( waypoints[ maxIdx+1 ].y === waypoints[ maxIdx ].y )
          waypoints[ maxIdx+1 ].y = maxPos.y + (!absolute ? waypoints[ maxIdx+1 ].y : 0);
      }
      // move points itself 
      for( var i = minIdx; i <= maxIdx; i++ )
      {
        if( newPos.length )
          minPos = newPos.shift();
        console.log( i, minIdx, maxIdx, minPos, waypoints.length );
        console.log( waypoints.map(function(p){return p.print()+p.protected;}) );
        
        if( absolute )
          waypoints[ i ].replace( minPos );
        else
          waypoints[ i ].plus( minPos );
        console.log( waypoints.map(function(p){return p.print()+p.protected+p.handler;}) );
      }
      
      var ret = waypoints[ simplify( myIdx ) ].handler; console.log(ret); return ret;
      return waypoints[ simplify( myIdx ) ].handler;
    }
      
    this.prepareCandidate = function( startPos, direction, appendEnd, endPos )
    {
      if( worker ) {
        worker.postMessage( ['prepareCandidate', startPos, direction, endPos] );
      }
      
      this.candidates.waypoints = [ startPos ];
      this.candidates.direction = direction;
      this.candidates.appendEnd = appendEnd;
      this.getCandidate( endPos, endPos );
      return this.GLE.registerHandler( this, this.waypoints.length );
    };
    
    /**
     * Get a potential connection from the end of the current connection
     * towards the newPos.
     * If endPos is also given then the candidate will be extended to it - this
     * helps for the last bit of connection to a block.
     */
    this.getCandidate = function( newPos, endPos, disableWorker )
    {
      if( !disableWorker && worker ) {
        worker.postMessage( ['getCandidate', this.candidates.waypoints[0], this.candidates.direction, newPos, endPos] );
        return;
      }
      
      this.candidates.waypoints[1] = newPos.copy();
      this.candidates.waypoints[2] = newPos.copy();
      switch( this.candidates.direction )
      {
        case 0: // Right
        default:
          if( this.candidates.waypoints[0].x > newPos.x )
            this.candidates.waypoints[1].x = this.candidates.waypoints[0].x;
          else
            this.candidates.waypoints[1].y = this.candidates.waypoints[0].y;
          break;
          
        case 2: // Left
          if( this.candidates.waypoints[0].x < newPos.x )
            this.candidates.waypoints[1].x = this.candidates.waypoints[0].x;
          else
            this.candidates.waypoints[1].y = this.candidates.waypoints[0].y;
          break;
          
        case 1: // Up
          if( this.candidates.waypoints[0].y > newPos.y )
            this.candidates.waypoints[1].x = this.candidates.waypoints[0].x;
          else
            this.candidates.waypoints[1].y = this.candidates.waypoints[0].y;
          break;
          
        case 3: // Down
          if( this.candidates.waypoints[0].y < newPos.y )
            this.candidates.waypoints[1].x = this.candidates.waypoints[0].x;
          else
            this.candidates.waypoints[1].y = this.candidates.waypoints[0].y;
          break;
      }
      if( undefined !== endPos )
      {
        this.candidates.waypoints[3] = endPos.copy();
        this.candidates.waypoints[2].protected = true;
        this.candidates.waypoints[3].protected = true;
      } else {
        this.candidates.waypoints.length = 3;
        this.candidates.waypoints[2].protected = false;
      }
      this.GLE.invalidateForeground();
    };
    
    if( worker )
    worker.onmessage = function( message ) 
    {
      var data = message.data;
      if( data[0] === 'gotCandidate' )
      {
        self.candidates.waypoints.length = data[1].length;
        data[1].forEach( function( thisPoint, i ) {
          self.candidates.waypoints[i] = new Vec2D( thisPoint );
          self.candidates.waypoints[i].protected = thisPoint.protected;
        } );
        self.GLE.invalidateForeground();
      }
      else console.log( 'Message from worker:', message.data );
    };
    
    /**
     * Return true if the @parm mousePos doesn't belong to this object
     */
    this.checkBadSelection = function( mousePos, index, epsilon, scale )
    {
      var eps    = epsilon | 0,
          i      = index   | 0,
          points = this.waypoints,
          cnt    = points.length - 1;
          
      if( index < 0 ) // segment
      {
        if( -i < points.length )
        {
          var x = (new Line( points[-i-1], points[-i] )).checkPointProximity( mousePos, eps );
          if( x ) 
            return false;
        }
      } else {        // handler
        return (i >= points.length) || self.GLE.checkHandlerBadSelection( mousePos, points[i] );
      }
      
      return true; // not found
    };
    
    this.prepareUpdate = function( index, handler, mousePos, ctrlKey, shiftKey )
    {
      console.log( 'prepareUpdate', index, handler , this.waypoints.length );
      // start point?
      if( 0 === index )
      {
        if( undefined !== this.start )
        {
          // unconnect to allow reconnection
          this.start.block.setOutConnection( undefined, this.start.portNumber );
          this.start = undefined;
          this.waypoints.splice( 0, Math.min( 3, this.waypoints.length - 1 ) );
        }
        
        var s         = this.waypoints[ 1 ],
            e         = this.waypoints[ 0 ],
            direction = (undefined === s) ? 5 : (s.x === e.x) 
                        ? (s.y > e.y ? 1 : 3)
                        : (s.y === e.y)
                          ? (s.x > e.x ? 2 : 0)
                          : 5;
        console.log( 'firstPoint', direction, index, handler, e.handler );
        return this.prepareCandidate( e.copy(), direction, false, mousePos );
      }
      
      // last point?
      if( index === this.waypoints.length - 1 )
      {
        console.log( 'upd last Point 1: end:', this.end );
        if( undefined !== this.end )
        {
          // unconnect to allow reconnection
          this.end.block.setInConnection( undefined, this.end.portNumber );
          this.end = undefined;
          this.waypoints.length = Math.max( 1, this.waypoints.length - 3 );
        }
        console.log( 'upd last Point 2: end:', this.end );
        
        var s         = this.waypoints[ this.waypoints.length - 2 ],
            e         = this.waypoints[ this.waypoints.length - 1 ],
            direction = (undefined === s) ? 5 : (s.x === e.x) 
                        ? (s.y > e.y ? 1 : 3)
                        : (s.y === e.y)
                          ? (s.x > e.x ? 2 : 0)
                          : 5;
        console.log( 'lastPoint', direction, index, handler, e.handler );
        return this.prepareCandidate( e.copy(), direction, true, mousePos );
      }
      return handler;
    };
    
    /**
      * Update the position of the index.
      */
    this.update = function( index, newPos, deltaPos, shortDeltaPos, lowerElement, shiftKey )
    {
      //console.log( 'Connection Update:', this, index, newPos, deltaPos, shortDeltaPos);
      //console.log( 'Connection Update:', /*this,*/ index, self.waypoints.length, newPos.print(), deltaPos.print(), shortDeltaPos.print(), this.candidates.appendEnd);
      if( undefined === index )
      {
        // move all
        self.waypoints.forEach( function( thisWaypoint ) {
          thisWaypoint.plus( shortDeltaPos );
        } );
        return;
      }
      
      if( index === self.waypoints.length )
      {
        var thisPos = newPos.copy(),
            endPos; // undefined
            
        if( this.candidates.appendEnd )
        {
          if( lowerElement.length && lowerElement[0].getInCoordinates )
          {
            var res = lowerElement[0].getInCoordinates(lowerElement[1]);
            if( res )
            {
              thisPos = res[0];
              endPos  = res[1];
              this.end = { block: lowerElement[0], portNumber: res[2] };
            }
          } else {
            this.end = undefined;
          }
        } else {
          if( lowerElement.length && lowerElement[0].getOutCoordinates )
          {
            var res = lowerElement[0].getOutCoordinates(lowerElement[1]);
            if( res )
            {
              thisPos = res[1];
              endPos  = res[0];
              this.start = { block: lowerElement[0], portNumber: res[2] };
            }
          } else {
            this.start = undefined;
          }
        }
        
        //console.log( 'move candidates', self.candidates.direction, thisPos, endPos, lowerElement );
        self.getCandidate( thisPos, endPos, shiftKey );
        return;
      }
      
      if( index < 0 ) // move segment
      {
        if( -index >= self.waypoints.length )
        {
      console.log( '2Connection Update:', /*this,*/ index, newPos, deltaPos, shortDeltaPos);
          return;
        }
        //console.log( 'up', self.name, index, self.waypoints.length , self.waypoints[ -index-1 ].protected, self.waypoints[ -index   ].protected );
        if( self.waypoints[ -index-1 ].protected )
        {
          self.insertWaypoint( self.waypoints[ -index-1 ].copy(), -index );
          index--;
        }
        if( self.waypoints[ -index   ].protected )
        {
          self.insertWaypoint( self.waypoints[ -index ].copy(), -index );
        }
        
        if       ( self.waypoints[ -index-1 ].x === self.waypoints[ -index ].x )
        {
          self.waypoints[ -index-1 ].x += shortDeltaPos.x;
          self.waypoints[ -index   ].x += shortDeltaPos.x;
        } else if( self.waypoints[ -index-1 ].y === self.waypoints[ -index ].y )
        {
          self.waypoints[ -index-1 ].y += shortDeltaPos.y;
          self.waypoints[ -index   ].y += shortDeltaPos.y;
        } else {
          self.waypoints[ -index-1 ].plus( shortDeltaPos );
          self.waypoints[ -index   ].plus( shortDeltaPos );
        }
        
        return self.waypoints[ simplify( index ) ].lineHandler;
      }
      
      return self.moveWaypoint( index, shortDeltaPos );
      
      // check if the handler ID has changed and return it
      //return self.waypoints[ simplify( index ) ].handler;
    }
      
    this.finishUpdate = function( index )
    {
      this.waypoints = this.candidates.appendEnd 
                       ? this.waypoints.concat( this.candidates.waypoints )
                       : this.candidates.waypoints.slice().reverse().concat( this.waypoints );
      this.candidates.waypoints.length = 0;
      
      if( this.start )
      {
        this.start.block.setOutConnection( this, this.start.portNumber );
      }
      
      if( this.end )
      {
        this.end.block.setInConnection( this, this.end.portNumber );
      }
      
      simplify();
    };
    
    /**
     * Delete itself, i.e. cancel references to it in the connected blocks.
     */
    this.delete = function()
    {
      console.log( 'delCon', 'start', this.start, 'end', this.end );
      if( undefined !== this.start )
      {
        this.start.block.setOutConnection( undefined, this.start.portNumber );
      }
      if( undefined !== this.end )
      {
        this.end.block.setInConnection( undefined, this.end.portNumber );
      }
      this.name = '### Deleted Connection! ###'; // Help debuging the GC
    }
    
    // constructor
    
    //######################################################################
    //######################################################################
    //######################################################################
    /*
    worker.onmessage = function (oEvent) {
      console.log("Called back by the worker! '" + oEvent.data + "'", oEvent.data );
    };
    */
    if( worker )
    worker.onerror = function(event) {
      console.log(event);
    };
    //######################################################################
    //######################################################################
    //######################################################################
  };
  
  /**
   * Get all the elements that should be considers active when this element
   * is active
   */
  Connection.prototype.getDerivedActive = function()
  {
    return []; // no elements will be active...
  };
    
  /**
   * Reregister all handlers, e.g. when they got invalid.
   */
  Connection.prototype.reregisterHandlers = function(){
    var self = this;
    //#//this.handler = this.GLE.registerHandler( this, -1 ), // the connection itself
    this.waypoints.forEach( function( thisWaypoint, i ){
      thisWaypoint.handler     = self.GLE.registerHandler( self,  i );
      thisWaypoint.lineHandler = self.GLE.registerHandler( self, -i-1 );
    } );
  };
  
  Connection.prototype.toString = function(){
    return '[object GLE:Connection]';
  };
  
  Connection.prototype.getName = function() {
    return this.name;
  }

  /**
   * Inderxst a new waypoint.
   * @param {Vec2D}   pos       Postion of the new point
   * @param {Integer} index     Index of the new point, when undefined the new
   *                            point is appended.
   */
  Connection.prototype.insertWaypoint = function( pos, index ){
    if( undefined === index )
      index = this.waypoints.length;
    this.waypoints.splice( index, 0, pos );
    this.GLE.invalidateHandlers();
    return this;
  };
  
  // create namespace if necessary
  if( undefined === window._GLE )
    window._GLE = {};
  
  if( undefined !== window._GLE.Connection )
    throw 'Error: "Connection" already in "_GLE" namespace!';
  
  window._GLE.Connection = Connection;
})( window );