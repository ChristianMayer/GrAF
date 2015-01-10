/**
 * gle.connection.js (C) 2013-2015 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
define( ['lib/Vec2D', 'lib/Line2D'], function( Vec2D, Line, undefined ) {
  "use strict";
  
  // local globals
  var worker = (typeof Worker !== 'undefined') ? new Worker("lib/autorouter.js") : undefined;
  
  /**
   * Private class: a Branch holds waypoints and branches
   */
  function Branch( GLE, signal, connection ) {
    // constructor
    console.log( 'Branch', signal );
    //////////
    
    // local helper function to recursively translate branch structure, e.g. to
    // convert to Vec2D
    function translateSignal( signalElement, upperLastPoint ){
      var branch = {};
      if( signalElement.target ) {
        branch.target = {
          block: GLE.getBlockByName( signalElement.target ),
          port:  signalElement.targetPort
        };
        branch.target.block.setInConnection( connection, branch.target.port );
        branch.isConnected = undefined !== signal.source; // connection set only when source is also set
        branch.isEndpoint  = true;
      } else {
        branch.isConnected = false;
        branch.isEndpoint  = false;
      }
      
      if( signalElement.waypoints ) 
      {
        branch.waypoints = [];
        signalElement.waypoints.forEach( function( wp ){
          var newWp;
          if( Array.isArray( wp ) )
          {
            newWp = new Vec2D( wp[0], wp[1] );
            upperLastPoint.replace( newWp );
          } else {
            newWp = translateSignal( wp, upperLastPoint.copy() );
            newWp.source = upperLastPoint.copy();
          }
          branch.waypoints.push( newWp );
        });
      }
      
      if( !branch.isConnected && branch.waypoints && 
          branch.waypoints.some(function(wp){return wp.isConnected;}) )
        branch.isConnected = true;
      
      branch.isEndpoint = true;
      if( branch.waypoints &&
          branch.waypoints.some(function(wp){return !(wp instanceof Vec2D);}) )
        branch.isEndpoint = false;
      
      return branch;
    }

    // object elements:
    if( signal.source )
    {
      this.source = { 
        block: GLE.getBlockByName( signal.source ),
        port:  signal.sourcePort 
      };
      this.source.block.setOutConnection( connection, signal.sourcePort );
    } else {
      this.source = {};
    }
    
    var translatedSignal = translateSignal( signal, this.source.block ? this.source.block.getOutCoordinates( this.source.port, true )[1] : new Vec2D(-1,-1) );
    this.target      = translatedSignal.target;
    this.waypoints   = translatedSignal.waypoints || [];
    this.isEndpoint  = translatedSignal.isEndpoint;
    this.isConnected = translatedSignal.isConnected;
    
    this.updateListToDraw();
    
    //this.topLeft     = translatedSignal.topLeft;//new Vec2D( -1, -1 );
    //this.bottomRight = translatedSignal.bottomRight;//new Vec2D( -1, -1 );
    //this.topLeft     = new Vec2D( -1, -1 );
    //this.bottomRight = new Vec2D( -1, -1 );
    console.log('Constructor Branch finish', this );
  }
  Branch.prototype = {
    /**
     * Delete selected branches.
     * @return true when everything was deleted
     */
    deleteSelection: function() {
      function recursiveDelete( branch )
      {
        if( branch.waypoints )
          branch.waypoints = branch.waypoints.filter( function(p){
          if( p instanceof Vec2D )
            return true;
          recursiveDelete( p );
          return !p.isDeleted;
        });
        
        if( branch.isSelected )
        {
          if( branch.source && branch.source.block )
            branch.source.block.setOutConnection( undefined, branch.source.port );
          delete branch.source;
          
          if( branch.target && branch.target.block )
            branch.target.block.setInConnection( undefined, branch.target.port );
          delete branch.target;
          
          delete branch.waypoints;
          branch.isDeleted = true;
        }
      }
      recursiveDelete( this );
      this.simplify();
      this.updateListToDraw();
      return this.isDeleted;
    },
    getTopLeft:     function() { return this.topLeft;     },
    getBottomRight: function() { return this.bottomRight; },
    /**
     * Return array with path to the selected element or undefined.
     */
    getSelection: function( pos, checkFn, interest, InterestMap ) {
      console.log( 'Branch getSelection', this );
      var
        isEndSelectedConnected = false,
        isEndSelectedOpen      = false,
        startPoint,
        returnList = [];
      if( this.source && this.source.block )
      {
        var p = this.source.block.getOutCoordinates( this.source.port, true );
        if( checkFn( pos, p[0] ) || checkFn( pos, p[1] ) )
          if( interest & InterestMap.Connection || 
              interest & InterestMap.ConnectionStartConnected )
            return [];
          else
            return;
        startPoint = p[1];
      }
      
      function recursiveGetSelection( branch )
      {
        var 
          wpts = branch.waypoints;
        
        if( wpts )
        {
          for( var i = 0, len = wpts.length; i < len; i++ )
          {
            var wp = wpts[i];
            
            if( wp instanceof Vec2D )
            {
              if( checkFn( pos, wpts[i] ) )
              {
                returnList.push( i );
                if( i + 1 === len && (!branch.target || !branch.target.block) )
                  isEndSelectedOpen = true;
                  
                return true;
              }
              //console.log( 'getSelection', returnList, i, startPoint, wp );
              if( startPoint && (new Line( startPoint, wp )).checkPointProximity( pos, 5 ) )
              {
                returnList.push( -i-1 );
                return true;
              }
              
              startPoint = wp;
            } else {
              returnList.push( i );
              var currentStartPoint = startPoint.copy();
              if( recursiveGetSelection( wp ) )
                return true;
              returnList.pop();
              startPoint = currentStartPoint;
            }
          }
        }
        
        if( branch.target && branch.target.block )
        {
          var p = branch.target.block.getInCoordinates( branch.target.port, true );
          if( checkFn( pos, p[0] ) )
          {
            returnList.push( wpts ? wpts.length : 0 );
            return true;
          } else
          if( checkFn( pos, p[1] ) )
          {
            returnList.push( wpts ? wpts.length+1 : 1 );
            isEndSelectedConnected = true;
            return true;
          }
          if( (new Line( startPoint, p[0] )).checkPointProximity( pos, 5 ) )
          {
            returnList.push( wpts ? -wpts.length-1 : -1 );
            return true;
          }
        }
      }
      
      if( recursiveGetSelection( this ) )
      {
        if(
          (interest & InterestMap.ConnectionStart && returnList.length === 1 && returnList[0] === 0) ||
          (interest & InterestMap.Connection) ||
          (interest & InterestMap.ConnectionEndConnected && isEndSelectedConnected) ||
          (interest & InterestMap.ConnectionEndOpen      && isEndSelectedOpen     )
        )
          return returnList;
      }
    },
    moveSelected: function( delta )
    {
      function recMoveSelectedBranch( branch )
      {
        branch.waypoints && branch.waypoints.forEach( function(p){
          if( p instanceof Vec2D )
            branch.isSelected && p.plus( delta );
          else
            recMoveSelectedBranch( p );
        });
      }
      this.print();
      recMoveSelectedBranch( this );
      this.updateListToDraw();
      this.print();
    },
    print: function() {
      function recPrint( branch )
      {
        if( branch.source instanceof Vec2D )
          str += '(' + branch.source.print() + ')';
        if( branch.waypoints && branch.waypoints.length > 0 )
        {
          branch.waypoints.forEach( function(wp) {
            if( wp instanceof Vec2D )
              str += wp.print() + ';';
            else {
              str += '[';
              recPrint( wp );
              str += ']';
            }
          });
        }
        if( branch.target && branch.target.block )
        {
          var p = branch.target.block.getInCoordinates( branch.target.port, true );
          str += '(' + p[0].print() + ';' + p[1].print() + ')';
        }
      }
      
      var str = '[';
      if( this.source.block )
      {
        var p = this.source.block.getOutCoordinates( this.source.port, true );
        str += '(' + p[0].print() + ';' + p[1].print() + ')';
      }
      recPrint( this );
      console.log( str + ']' );
    },
    removeSource: function( index ) {
      if( this.source.block )
        this.source.block.setOutConnection( undefined, this.source.port );
      this.source = {};
    },
    removeTarget: function( index ) {
      function recursiveTargetRemove( branch ) {
        var
          i = index.shift();
          
        if( index.length ) 
        {
          recursiveTargetRemove( branch.waypoints[i] );
          if( !branch.waypoints.some(function(wp){return wp.isConnected;}) )
            branch.isConnected = false;
        } else {
          if( branch.target && branch.target.block )
            branch.target.block.setInConnection( undefined, branch.target.port );
          branch.target = undefined;
          branch.isConnected = false;
        }
      }
      
      index = index.slice(); // deep copy
      recursiveTargetRemove( this );
    },
    setSource: function( index, connection, block, handler ) {
      console.log( 'setSource', index, connection, block, handler );
      // remove old source if it is set
      if( this.source.block )
        this.source.block.setOutConnection( undefined, this.source.port );
      
      this.source = { block: block, port: block.getOutPortFromHandler( handler ) };
      block.setOutConnection( connection, this.source.port );
    },
    setTarget: function( index, connection, block, handler ) {
      console.log( 'setTarget', index, connection, block, handler );
      function recursiveTargetSet( branch ) {
        var
          i = index.shift();
          
        if( index.length ) 
        {
          recursiveTargetSet( branch.waypoints[i] );
          branch.isConnected = true;
        } else {
          // remove old target if it is set
          if( branch.target && branch.target.block )
            branch.target.block.setInConnection( undefined, branch.target.port );
          
          branch.target = { block: block, port: block.getInPortFromHandler( handler ) };
          block.setInConnection( connection, branch.target.port );
          branch.isConnected = true;
        }
      }
      
      index = index.slice(); // deep copy
      recursiveTargetSet( this );
    },
    /**
     * Select a branch.
     * @param index false to unselect, Array otherwise
     */
    selectMarking: function( index ) {
      function recursiveSelect( branch, thisIndex, isParentSelected )
      {
        if( thisIndex === false )
          branch.isSelected = false;
        else
          branch.isSelected = thisIndex.length === 1;
        branch.isSelected |= isParentSelected;
        
        var thisIndexEntry = thisIndex && thisIndex.shift();
        branch.waypoints && branch.waypoints.forEach( function(b, i){
          if( !(b instanceof Vec2D ) )
          {
            recursiveSelect( b, thisIndexEntry === i ? thisIndex : false, branch.isSelected );
          }
        });
      }
      recursiveSelect( this, index ? index.slice() : false, index && index.length === 0 );
    },
    /**
     * Fix branches and bring it to unique form. E.g. remove double points.
     */
    simplify: function() {
      function recSimplifyDblPoint( thisBranch ) {
        var lastPoint = thisBranch.source;
        if( lastPoint && !(lastPoint instanceof Vec2D) && lastPoint.block )
        {
          lastPoint = lastPoint.block.getOutCoordinates( lastPoint.port, true )[1];
        }
        
        if( thisBranch.waypoints )
        {
          for( var i = 0; i < thisBranch.waypoints.length; i++ )
          {
            var wp = thisBranch.waypoints[i];
            if( wp instanceof Vec2D )
            {
              if( wp.equal( lastPoint ) )
              {
                thisBranch.waypoints.splice( i, 1 );
              } else
                lastPoint = wp;
            } else {
              recSimplifyDblPoint( wp );
            }
          }
          
          if( thisBranch.target && thisBranch.target.block && thisBranch.waypoints && thisBranch.waypoints.length )
          {
            var p = thisBranch.target.block.getInCoordinates( thisBranch.target.port, true )[0];
            if( thisBranch.waypoints[ thisBranch.waypoints.length - 1 ].equal( p ) )
              thisBranch.waypoints.pop();
          }
        }
      }
      function recSimplifyUnusedBranch( thisBranch ) {
        var
          waypoints = thisBranch.waypoints;
        if( waypoints )
        {
          // last waypoint is a branch
          var
            hasOtherBranch = !!(thisBranch.target && thisBranch.target.block);
          for( var i = 0, len = waypoints.length; i < len; i++ )
          {
            var b = waypoints[i];
            if( !(b instanceof Vec2D) )
            {
              hasOtherBranch |= i < len-1; // make true when not last element
              recSimplifyUnusedBranch( b );
            }
          }
          if( !hasOtherBranch && !(waypoints[waypoints.length-1] instanceof Vec2D) )
          {
            // ok, something to do:
            var otherBranch = waypoints.pop();
            if( otherBranch.waypoints )
              thisBranch.waypoints = waypoints.concat( otherBranch.waypoints );
            
            thisBranch.isConnected = otherBranch.isConnected;
            thisBranch.isEndpoint  = otherBranch.isEndpoint;
            thisBranch.target      = otherBranch.target;
          }
        }
      }
      recSimplifyDblPoint( this );
      recSimplifyUnusedBranch( this );
      this.updateListToDraw();
    },
    updateListToDraw: function() {
      // console.log( 'getListToDraw', this );
      var
        returnList = { connected: [], connectedHead: [], unconnected: [], unconnectedHead: [], branching: [], handlers: [] },
        hasSource = !!(this.source && this.source.block),
        recursiveBranchFetch = function( thisBranch, thisPoints ) {
          var 
            //lastPoint;  // ???-> = thisPoints[ thisPoints.length - 1 ];
            pointList = thisPoints,//[],
            lastPoint = thisPoints[ thisPoints.length - 1 ];
            
          if( thisBranch.isDeleted )
            return;
          
          thisBranch.topLeft = new Vec2D( Infinity, Infinity );
          thisBranch.bottomRight = new Vec2D( -1, -1 );
          //returnList.push( thisPoints ); // insert here to keep order, JS reference handling will fill thisPoints later
          //console.log( 'recursiveBranchFetch thisBranch:', thisBranch, 'thisPoints:', thisPoints );
          
          thisBranch.waypoints && thisBranch.waypoints.forEach( function( thisEntry ){
            //console.log( 'recursiveBranchFetch - waypoints thisEntry:', thisEntry );
            if( thisEntry instanceof Vec2D )
            {
              //thisPoints.push( thisEntry.copy() );
              pointList.push( thisEntry.copy() );
              lastPoint = thisEntry;
            } else {
              var branchPoints = [];
              if( lastPoint )
              {
                branchPoints.push( lastPoint.copy() );
                returnList.branching.push( branchPoints[0] );
              }
              
              if( undefined !== thisEntry.waypoints || true)
              {
                recursiveBranchFetch( thisEntry, branchPoints );//[ lastPoint.copy() ] );
                thisBranch.topLeft.cmin( thisEntry.topLeft );
                thisBranch.bottomRight.cmax( thisEntry.bottomRight );
              }
            }
          });
              
          if( thisBranch.target && thisBranch.target.block )
          {
            var p = thisBranch.target.block.getInCoordinates( thisBranch.target.port, true );
            pointList.push( p[0] );
            pointList.push( p[1] );
          }
          
          if( thisBranch.isEndpoint )
          {
            /////////
            //if( branchPoints.length < 2 )
            if( pointList.length < 2 )
              debugger;
            /////////
            var
              lastBPoint = pointList[ pointList.length - 1 ],
              prevPoint = pointList[ pointList.length - 2 ],
              direction = lastBPoint.copy().minus( prevPoint ).toLength( 1.0 ),
              normal    = direction.getNormal(),
              headSize  = 5 * 1;//thisGLE.settings.drawSizeBlock;// * scale;
            
            if( isNaN( direction.x ) )
            {
              if( pointList.length >= 3 )
              {
                prevPoint = pointList[ pointList.length - 3 ];
                direction = lastBPoint.copy().minus( prevPoint ).toLength( 1.0 );
                normal    = direction.getNormal();
              } else {
                direction.x = 1; direction.y = 0;
                normal = direction.getNormal();
              }
            }
              
            if( thisBranch.isConnected )
            {
              returnList.connectedHead.push([
                lastBPoint.copy().minus( direction.copy().scale(2).minus(normal).scale(headSize) ),
                lastBPoint.copy(),
                lastBPoint.copy().minus( direction.copy().scale(2).plus(normal).scale(headSize) )
              ]);
            } else {
              returnList.unconnectedHead.push([
              lastBPoint.copy().minus( direction.copy().scale(1).minus(normal).scale(headSize) ),
                lastBPoint.copy(),
                lastBPoint.copy().minus( direction.copy().scale(1).plus(normal).scale(headSize) )
              ]);
            }
          } // endif(isEndpoint)

          if( thisBranch.isConnected && hasSource )
            returnList.connected.push( pointList );
          else
            returnList.unconnected.push( pointList );
          
          if( thisBranch.isSelected )
            returnList.handlers.push( pointList );
          
          pointList.forEach( function(p){
            thisBranch.topLeft.cmin( p );
            thisBranch.bottomRight.cmax( p );
          });
        },
        start = ( this.source && this.source.block ) ?
          this.source.block.getOutCoordinates( this.source.port, true ).splice( 0, 2 ) :
          [];
      
      recursiveBranchFetch( this, start );
      this.listToDraw = returnList;
    }
  };
  
  /**
   * A Connection is a link between blocks that shows how the signals are 
   * flowing. The position is defined as:
   * - source / start block and port
   * - waypoints
   * - destination / end block
   * The waypoints is an array consisting of points and branches. Each branch
   * will again consist out of waypoints and a destination.
   * The source and the destination is not part of the waypoints, it is derived
   * from the linkes object (when it exists)
   * 
   * @module GLE.Connection
   * @title  GrAF logic engine: graphical logic editor
   * @constructor
   */
  var Connection = function( thisGLE, parameters ){
    //console.log( 'new Connection', parameters );
    if( !( this instanceof Connection ) )
      throw 'Error, use "new" operator for Connection!';
    
    if( undefined === parameters )
      parameters = {};
    
    // private:
    var self     = this,
        //worker   = (typeof Worker !== 'undefined') ? new Worker("lib/autorouter.js") : undefined,
        //topLeftPos,     // bounding box
        //bottomRightPos, // bounding box
      moveObject = { x: [], y: [], relative: [] }, // hold all points that must be moved
      lastInterestFullfillment, // stores the last object that was found under the cursor during movement
      lookingForSource, // true when current interaction is looking for a new source
      lookingForTarget, // true when current interaction is looking for a new target
      updateBoundingBox = function() {
        console.error( 'connection updateBoundingBox is deprectiated' );
        //self.branch.updateBoundingBox();
        //topLeftPos = self.branch.topLeft;
        //bottomRightPos = self.branch.bottomRight;
      };
        
    this.name      = parameters.name;
    this.start     = parameters.start; // object where the connection begins
    this.end       = parameters.end;   // object where the connection ends
    this.waypoints = [];
    this.branch    = undefined;//new Branch( thisGLE );
    this.candidates = { waypoints: [], direction: 5 };
    this.GLE       = thisGLE;
    
    this.getTopLeft = function() {
      /*
      if( undefined === topLeftPos )
        updateBoundingBox();
      
      return topLeftPos;
      */
      return this.branch.getTopLeft();
    };
    
    this.getBottomRight = function() {
      /*
      if( undefined === bottomRightPos )
        updateBoundingBox();
      
      return bottomRightPos;
      */
      return this.branch.getBottomRight();
    }

    /**
     * Draw itself on the canvas @param context and it's shape on the
     * @param index context.
     */
    this.draw = function( context, focus, isDrawFg, scale ) {
      //var
      //  lineWidth = ((thisGLE.settings.drawSizeBlock * scale * 0.5)|0)*2+1; // make sure it's uneven to prevent antialiasing unsharpness
      //console.log( self.branch.getListToDraw() );
      //self.branch.draw( context, index, focus, isDrawFg, scale, lineWidth );
      //return;
      ////////////////////////////////////////77
      var 
        view = thisGLE.view(),
        listToDraw =  self.branch.listToDraw, //getListToDraw(),
        noStart = undefined === this.start,
        noEnd   = undefined === this.end;
      //console.log( 'draw conn', this, context, index, active );
      
      //thisGLE.prepareHandlerDrawing( this.handler );
      //console.log( listToDraw );
      
      // draw lines themself
      context.save(); // make sure to leave the context alone
      context.fillStyle = '#000000';
      /*
      if( noStart || noEnd )
      {
        context.setLineDash( [5] );
        context.strokeStyle = '#ff0000';
      }
      */
      context.lineWidth  = ((thisGLE.settings.drawSizeBlock * scale * 0.5)|0)*2+1; // make sure it's uneven to prevent antialiasing unsharpness
      //context.beginPath();
      //console.log( 'beginPath' );
      var oldIndexPos,
          waypoints = self.candidates.appendEnd 
                      ? self.waypoints.concat( self.candidates.waypoints )
                      : self.candidates.waypoints.slice().reverse().concat( self.waypoints ),
          wpHalfsize = (thisGLE.settings.drawSizeHandle * scale)|0,
          wpSize     = 2 * wpHalfsize + 1,
          lastPoint  = new Vec2D( 0, 0 ),
          dummy;//arrows     = [[new Vec2D(300,300), new Vec2D(350,300), false]]; // array of all the arrow heads to draw
      
      //var branchStartList = [];
      var connectedArrowHeads   = [];
      var unconnectedArrowHeads = [];
      function drawList( singleBranch, number, array, isConnected ){
        //console.log( 'drawList', singleBranch, number, array, isConnected );
        //if( true || singleBranch.length > 1 )
        //{
          
          var p = singleBranch[0].copy().scale( scale ).round(1);
          context.moveTo( p.x, p.y );
          for( var i = 1, len = singleBranch.length; i < len; i++ )
          {
            p = singleBranch[i].copy().scale( scale ).round(1);
            context.lineTo( p.x, p.y );
          }
        //}
      };
      function drawArrowHead( points )
      {
        context.moveTo( points[0].x * scale, points[0].y * scale );
        context.lineTo( points[1].x * scale, points[1].y * scale );
        context.lineTo( points[2].x * scale, points[2].y * scale );
      };
      
      // draw the signal arrows (optimized for minimal context state changes):
      // 0: handlers
      if( focus )
      {
        context.fillStyle = '#808080';
        context.beginPath();
        listToDraw.handlers.forEach( function(list) { list.forEach( function(p){
          context.rect( p.x * scale - wpHalfsize, p.y * scale - wpHalfsize, wpSize, wpSize );
        }) });
        context.stroke();
        context.fill();
      }
      context.fillStyle = '#000000';
      // 1: unconnected strokes
      context.strokeStyle = '#ff0000';
      context.setLineDash( [5] );
      context.beginPath();
      listToDraw.unconnected.forEach( function(b,n,a){ drawList(b,n,a,false) } );
      context.stroke();
      // 2: unconnected stroke arrow heads
      context.setLineDash( [] );
      context.beginPath();
      //unconnectedArrowHeads.forEach( drawArrowHead );
      listToDraw.unconnectedHead.forEach( drawArrowHead );
      context.stroke();
      // 3: connected strokes
      context.strokeStyle = '#000000';
      context.beginPath();
      listToDraw.connected.forEach( function(b,n,a){ drawList(b,n,a,true) } );
      context.stroke();
      // 4: connected stoke arrow heads
      context.beginPath();
      //connectedArrowHeads.forEach(  drawArrowHead );
      listToDraw.connectedHead.forEach( drawArrowHead );
      // 5: branch points
      //branchStartList.forEach( function(point){
      listToDraw.branching.forEach( function(point){
        context.rect( (point.x-1)*scale, (point.y-1)*scale, 3*scale, 3*scale );
      });
      context.fill();
      
      context.restore();
    }
    
    this.prepareCandidate = function( startPos, direction, appendEnd, endPos )
    {
      if( worker ) {
        worker.postMessage( ['prepareCandidate', startPos, direction, endPos] );
      }
      
      this.candidates.waypoints = [ startPos ];
      this.candidates.direction = direction;
      this.candidates.appendEnd = appendEnd;
      if( endPos )
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
     * Return true when the area between @param minPos and @param maxPos don't
     * belong to this object.
     */
    this.checkAreaBadSelection = function( minPos, maxPos ) {
      // only a rough check...
      var bbMin = self.waypoints[0].copy(), // bounding box
          bbMax = bbMin.copy();
          
      self.waypoints.forEach( function(wp) {
        bbMin.cmin( wp );
        bbMax.cmax( wp );
      } );
      
      return (
        (maxPos.x < bbMin.x) || (bbMax.x < minPos.x) ||
        (maxPos.y < bbMin.y) || (bbMax.y < minPos.y)
      );
    };
    
    /**
     * Return true if the @parm mousePos doesn't belong to this object
     */
    this.checkBadSelection = function( mousePos, index, epsilon )
    {
      return false;
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
    
    /**
     * Return the index of the mouse pos - or undefined when no active area was
     * hit.
     */
    this.getSelection = function( mousePos, interest )
    {
      return self.branch.getSelection( mousePos, thisGLE.checkHandlerSelection, interest, thisGLE.InterestMap );
    }
    
    this.prepareUpdate = function( index, mousePos, ctrlKey, shiftKey )
    {
      console.log( 'Connection prepareUpdate:', this, index );
      this.branch.print();
      
      this.branch.selectMarking( index );
      lookingForSource = false;
      lookingForTarget = false;
      lastInterestFullfillment = [];
      
      var
        isBlockStart = undefined === index, // true when new connection starting out of a block
        waypoints = this.branch.waypoints;
        
      if( !isBlockStart && index.length === 0 )
      { // case: remove source connection
        var 
          branch = this.branch,
          source = branch.source.block.getOutCoordinates( branch.source.port, true );
          
        if( undefined === branch.waypoints )
          waypoints = branch.waypoints = [];
        
        waypoints.unshift( source[1].copy() );
        if( waypoints.length > 1 )
        {
          if( waypoints[1] instanceof Vec2D )
          {
            // nomale case: a point follows
            if( waypoints[1].x === waypoints[0].x || waypoints[1].y === waypoints[0].y )
            {
              waypoints.unshift( source[1].copy() );
              movePointInverseConditionally( 1, 1, 2 );
            }
          } else {
            // check special case: a branch follows directly
            waypoints.unshift( source[1].copy() );
            waypoints.unshift( source[1].copy() );
            moveObject.y.push( waypoints[1] );
          }
        } else {
          if( !branch.target || !branch.target.block )
            debugger;
          var target = branch.target.block.getInCoordinates( branch.target.port, true );
          if( waypoints[0].x === target[0].x || waypoints[0].y === target[0].y )
          {
            waypoints.unshift( target[0] );
            movePointInverseConditionally( 1, 0, 1 );
            waypoints[0].replace( source[1] );
          }
        }
        movePoint( 0 );
        branch.source.block.setOutConnection( undefined, branch.source.port );
        branch.source = {};
        lookingForSource = true;
        return [ this, index, thisGLE.InterestMap.OutPortOpen | thisGLE.InterestMap.ConnectionEndOpen ];
      } // End: case: remove source connection
      
      var
        i = 0,
        branch = this.branch;
      for( ; !isBlockStart && i < index.length - 1; i++ )
      {
        branch = branch.waypoints[ index[i] ];
      }
      
      var 
        thisIndex = isBlockStart ? -1 : index[i];
      waypoints = branch.waypoints;

      // helper functions
      function movePointConditionally( indexToMove, indexForCondition1, indexForCondition2 )
      {
        var
          moveX = waypoints[ indexForCondition1 ].x === waypoints[ indexForCondition2 ].x,
          moveY = waypoints[ indexForCondition1 ].y === waypoints[ indexForCondition2 ].y;
          
        moveX && moveObject.x.push( waypoints[ indexToMove ] );
        moveY && moveObject.y.push( waypoints[ indexToMove ] );
      }
      function movePointConditionallyPoint( indexToMove, indexForCondition1, pointForCondition2 )
      {
        if( waypoints[ indexForCondition1 ].x === pointForCondition2.x )
          moveObject.x.push( waypoints[ indexToMove ] );
        if( waypoints[ indexForCondition1 ].y === pointForCondition2.y )
          moveObject.y.push( waypoints[ indexToMove ] );
      }
      function movePointInverseConditionally( indexToMove, indexForCondition1, indexForCondition2 )
      {
        if( waypoints[ indexForCondition1 ].x === waypoints[ indexForCondition2 ].x )
          moveObject.y.push( waypoints[ indexToMove ] );
        if( waypoints[ indexForCondition1 ].y === waypoints[ indexForCondition2 ].y )
          moveObject.x.push( waypoints[ indexToMove ] );
      }
      function movePoint( indexToMove )
      {
        moveObject.x.push( waypoints[ indexToMove ] );
        moveObject.y.push( waypoints[ indexToMove ] );
      }
      function movePointRelative( indexToMove )
      {
        moveObject.relative.push( waypoints[ indexToMove ] );
      }
      function moveBranchSource( thisBranch )
      {
        moveObject.x.push( thisBranch.source );
        moveObject.y.push( thisBranch.source );
        moveBranch( thisBranch );
      }
      function moveBranch( thisBranch )
      {
        if( !thisBranch.waypoints || thisBranch.waypoints.length === 0 )
        {
          thisBranch.waypoints = [ 
            thisBranch.target.block.getInCoordinates( thisBranch.target.port, true )[0]
          ];
        } else
        if( thisBranch.waypoints.length === 1 && !thisBranch.target )
          thisBranch.waypoints.push( thisBranch.waypoints[0].copy() );
        else if( thisBranch.waypoints.length > 2 && !(thisBranch.waypoints[1] instanceof Vec2D) )
          // a new branch follows directly
          thisBranch.waypoints.unshift( thisBranch.waypoints[0].copy() );
        
        if( thisBranch.source.x === thisBranch.waypoints[0].x )
          moveObject.x.push( thisBranch.waypoints[0] );
        if( thisBranch.source.y === thisBranch.waypoints[0].y )
          moveObject.y.push( thisBranch.waypoints[0] );        
      }
      
      if( !waypoints )
        waypoints = [];
      
      console.log( thisIndex, waypoints && waypoints.length, waypoints && waypoints[thisIndex-1], waypoints && waypoints[thisIndex], waypoints && waypoints[thisIndex+1], branch.source, branch.target );
      if( thisIndex === waypoints.length )
      {
        // case: last point selected, i.e. first of target
        waypoints.push( branch.target.block.getInCoordinates( branch.target.port, true )[0] );
        thisIndex = -thisIndex-1;
      }
      if( !isBlockStart && thisIndex < 0 )
      { // case: move whole edge
        thisIndex = -thisIndex; // convert to normal ordering
        
        if( undefined === branch.waypoints )
          waypoints = branch.waypoints = [];
        
        if( thisIndex === 1 )
        {
          if( branch.source instanceof Vec2D )
            // case: selected is start edge after branch
            waypoints.unshift( branch.source.copy() );
          else
            // case: selected is conected start edge
            waypoints.unshift( branch.source.block.getOutCoordinates( branch.source.port, true )[1] );
          thisIndex++;
        }
        
        if( thisIndex === waypoints.length + 1 )
        {
          if( branch.target && branch.target.block )
            waypoints.push( branch.target.block.getInCoordinates( branch.target.port, true )[0] );
          else
            debugger; // this must not happen...
        }
        
        // case: selected is middle edge
        if( waypoints[ thisIndex-2 ].x === waypoints[ thisIndex-1 ].x ||
            waypoints[ thisIndex-2 ].y === waypoints[ thisIndex-1 ].y )
        {
          movePointConditionally( thisIndex-2, thisIndex-2, thisIndex-1 );
          movePointConditionally( thisIndex-1, thisIndex-2, thisIndex-1 );
        } else {
          movePointRelative( thisIndex - 2 );
          movePointRelative( thisIndex - 1 );
        }
        if( thisIndex < waypoints.length && !(waypoints[ thisIndex ] instanceof Vec2D) )
        { 
          // case: a branch follows
          waypoints.splice( thisIndex, 0, waypoints[ thisIndex - 1].copy() );
        }
        return [ this, index ];
      }
      
      // very special cases: append end:
      if( thisIndex + 1 === waypoints.length && (!branch.target || !branch.target.block) )
      {
        lookingForTarget = true;
        if( isBlockStart )
        {
          var p = branch.source.block.getOutCoordinates( branch.source.port, true );
          waypoints.push( p[1].copy() );
          waypoints.push( p[1].copy() );
          if( p[0].y === p[1].y )
            moveObject.y.push( waypoints[0] );
          else
            moveObject.x.push( waypoints[0] );
          movePoint( 1 );
          return [ this, [1], thisGLE.InterestMap.InPort | thisGLE.InterestMap.ConnectionStart ];
        } else {
          waypoints.push( waypoints[ thisIndex ].copy() );
          waypoints.push( waypoints[ thisIndex ].copy() );
        }
        if( thisIndex === 0 )
          // case: directly after branch
          movePointConditionallyPoint( thisIndex + 1, thisIndex, branch.source );
        else
          movePointConditionally( thisIndex + 1, thisIndex, thisIndex - 1 );
        movePoint( thisIndex + 2 );
        return [ this, index, thisGLE.InterestMap.InPortOpen | thisGLE.InterestMap.ConnectionStartOpen ];
        // TODO: test for #-1
      }
      /*
      if( thisIndex === waypoints.length )
      {
        //waypoints.push( branch.target.block.getInCoordinates( branch.target.port, true )[1] );
        waypoints.push( branch.target.block.getInCoordinates( branch.target.port, true )[0] );
      }*/
      
      // very special cases: disconnect end:
      if( thisIndex === waypoints.length + 1 )
      {
        if( !branch.target || !branch.target.block )
          debugger;
        
        waypoints.push( branch.target.block.getInCoordinates( branch.target.port, true )[0] );
        if( !branch.waypoints )
          branch.waypoints = waypoints;
        this.branch.removeTarget( index );
        lookingForTarget = true;
        thisIndex--;
      }
      
      // distinguish all special cases:
      if( 0 === thisIndex )
      {
        if( branch.source instanceof Vec2D )
        {
          // case: selected is directly after branch start
          waypoints.unshift( branch.source.copy() );
          movePointConditionally( 0, 0, 1 );
          thisIndex = 1;
        } else
        if( branch.source.block )
        {
          // case: selected is connected start
          var p = branch.source.block.getOutCoordinates( branch.source.port, true );
          waypoints.unshift( p[1] );
          movePointConditionally( 0, 0, 1 );
          thisIndex = 1;
        } else {
          // case: selected is unconnected start --> append front
          waypoints.unshift( waypoints[0].copy() );
          waypoints.unshift( waypoints[0].copy() );
          movePoint( 0 );
          movePointConditionally( 1, 2, 3 );
          // TODO: test for #3
          return [ this, index ];
        }
      } else
      if( 1 === thisIndex )
      {
        if( branch.source instanceof Vec2D )
          // case: selected is 2nd after branch
          waypoints.unshift( branch.source.copy() );
        else if( branch.source.block )
          // case: selected is connected after start
          waypoints.unshift( branch.source.block.getOutCoordinates( branch.source.port, true )[1] );
        else
          // case: selected is unconnected after start
          waypoints.unshift( waypoints[0].copy() );
          
        movePointConditionally( 1, 1, 2 );
        thisIndex = 2;
      } else {
        // case: selected is no special start
        if( thisIndex < waypoints.length )
          movePointConditionally( thisIndex - 1, thisIndex - 1, thisIndex );
        else
          // case: last point before connected end.
          // note: as "append end" was already covered, we can safely assume branch.target.block does exist
          movePointConditionallyPoint( thisIndex - 1, thisIndex - 1, branch.target.block.getInCoordinates( branch.target.port, true )[0] );
      }
      
      
      movePoint( thisIndex );
        
      //movePointConditionally( 2, 2, 1 );
      // TODO: #2 is branch or unconnected
      
      if( thisIndex + 1 === waypoints.length )
      {
        if( branch.target && branch.target.block )
          // case: selected is connected end
          waypoints.push( branch.target.block.getInCoordinates( branch.target.port, true )[0] );
        else
          // case: selected is unconnected end --> already handled as very special case, except when point was connected
          ; // do nothing
      } else
      //if( !(waypoints[ thisIndex + 1 ] instanceof Vec2D) )
      {
        // case: selected is last waypoint before branch
        console.log('last for brach',waypoints[ thisIndex + 1 ] );
        while( thisIndex+1 < waypoints.length && !(waypoints[ thisIndex + 1 ] instanceof Vec2D) )
        {
          //waypoints.splice( thisIndex + 1, 0, waypoints[ thisIndex + 0 ].copy() );
          moveBranchSource( waypoints[ thisIndex + 1 ] );
          thisIndex++;
        }
      }
      console.log( '--------', thisIndex, waypoints.length );
      // case: selected is connected before end
      // case: selected is unconnected before end
      // case: selected is middle waypoint
      if( thisIndex+1 < waypoints.length )
      { // automatically true: (waypoints[ thisIndex + 1 ] instanceof Vec2D)
        movePointConditionally( thisIndex + 1, thisIndex + 1, thisIndex );
        
        if( thisIndex+2 === waypoints.length && !branch.target )
        {
          // case: next point is last point and that is not connected
          console.log('case: next point is last point and that is not connected');
          waypoints.push( waypoints[thisIndex+1].copy() );
        } else
        if( thisIndex+2 < waypoints.length && !(waypoints[ thisIndex+2 ] instanceof Vec2D) )
        {
          console.log('move following');
          // case: following point is start of branch(es)
          waypoints.splice( thisIndex + 2, 0, waypoints[ thisIndex + 1 ].copy() );
          //moveBranchSource( waypoints[ thisIndex + 2 ] );
        }
      }
      
      
      // case: selected is 
      return [ this, index ];
      ////////////////////////////////////////
      ////////////////////////////////////////
      ////////////////////////////////////////
      //console.log( 'prepareUpdate', index, handler , this.waypoints.length );
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
        //console.log( 'firstPoint', direction, index, handler, e.handler );
        return this.prepareCandidate( e.copy(), direction, false, mousePos );
      }
      
      // last point?
      if( index === this.waypoints.length - 1 )
      {
        //console.log( 'upd last Point 1: end:', this.end );
        if( undefined !== this.end )
        {
          // unconnect to allow reconnection
          this.end.block.setInConnection( undefined, this.end.portNumber );
          this.end = undefined;
          this.waypoints.length = Math.max( 1, this.waypoints.length - 3 );
        }
        //console.log( 'upd last Point 2: end:', this.end );
        
        var s         = this.waypoints[ this.waypoints.length - 2 ],
            e         = this.waypoints[ this.waypoints.length - 1 ],
            direction = (undefined === s) ? 5 : (s.x === e.x) 
                        ? (s.y > e.y ? 1 : 3)
                        : (s.y === e.y)
                          ? (s.x > e.x ? 2 : 0)
                          : 5;
        //console.log( 'lastPoint', direction, index, handler, e.handler );
        return this.prepareCandidate( e.copy(), direction, true, mousePos );
      }
      return handler;
    };
    
    /**
      * Update the position of the index.
      */
    this.update = function( index, newPos, shortDeltaPos, lowerHandler, shiftKey )
    {
      if( undefined === index )
      {
        // move all
        console.log('move all');
        this.branch.moveSelected( shortDeltaPos );
        return;
      }
      
      ////////////
      var mo = '';
      moveObject.x.forEach( function(p){ mo += ((p instanceof Vec2D) ? p.print() : '(-)') + ';'; } ); mo += '//';
      moveObject.y.forEach( function(p){ mo += ((p instanceof Vec2D) ? p.print() : '(-)') + ';'; } ); mo += '//';
      moveObject.relative.forEach( function(p){ mo += ((p instanceof Vec2D) ? p.print() : '(-)') + ';'; } );
      console.log( 'Connection Update:', this, index, newPos && newPos.print(), shortDeltaPos && shortDeltaPos.print(), mo );
      this.branch.print();
      console.log( 'Connection Update: lookingForSource / lookingForTarget:', lookingForSource, lookingForTarget, lowerHandler, lastInterestFullfillment  );
      ////////////
      if( undefined === lowerHandler )
        lowerHandler = [];
      
      if( lastInterestFullfillment[0] !== lowerHandler[0] ||
          lastInterestFullfillment[1] !== lowerHandler[1] )
      {
        console.warn( 'lastInterestFullfillment CHANGED!!!', lastInterestFullfillment, lowerHandler );
        if( lookingForSource )
        {
          this.branch.removeSource( index ); // remove current target, just in case
          if( lowerHandler.length )
            this.branch.setSource( index, this, lowerHandler[0], lowerHandler[1] );
        } else
        if( lookingForTarget )
        {
          this.branch.removeTarget( index ); // remove current target, just in case
          if( lowerHandler.length )
            this.branch.setTarget( index, this, lowerHandler[0], lowerHandler[1] );
        }
        lastInterestFullfillment = lowerHandler;
      }
      
      moveObject.x.forEach( function(p){ p.x = newPos.x; } );
      moveObject.y.forEach( function(p){ p.y = newPos.y; } );
      moveObject.relative.forEach( function(p){ p.plus( shortDeltaPos ); } );
      this.branch.updateListToDraw( index );
      return index;
    }
      
    this.finishUpdate = function( index )
    {
      console.log( 'Connection - finishUpdate', index );
      moveObject.x.length = 0;
      moveObject.y.length = 0;
      moveObject.relative.length = 0;
      this.branch.print();
      this.branch.simplify();
      this.branch.print();
      return;
      /////////////////////////7
      /////////////////////////7
      /////////////////////////7
      
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
     * @retrun true when this block can be deleted completely
     */
    this.delete = function()
    {
      console.log( 'delCon', 'start', this.start, 'end', this.end );
      
      if( this.branch.deleteSelection() )
      {
        this.name = '### Deleted Connection! ###'; // Help debuging the GC
        return true;
      }
      return false;
    }
    
    /**
     * Helper function for the constructor
     */
    function parseWaypointsBranch( branch )
    {
      var retval = [];
      branch.forEach( function(w){ 
        if( Array.isArray( w ) )
        { 
          // a waypoint
          retval.push( new Vec2D( w[0], w[1] ) ); 
        } else {
          // a branch
          var branch = {};
          if( w.waypoints && w.waypoints.length > 0 )
            branch.waypoints = parseWaypointsBranch( w.waypoints )
          retval.push( branch );
        }
      });
      return retval;
    }
    
    // constructor
    /*
    if( parameters.start )
    {
      parameters.start.block.setOutConnection( this, parameters.start.portNumber );
      var pos = parameters.start.block.getOutCoordinates( parameters.start.portNumber, true );
      this.waypoints.push( pos[0] );
      this.waypoints.push( pos[1] );
    }*/
    
      console.log( parameters );
    if( true || parameters.waypoints && parameters.waypoints.length > 0 )
    {
      //self.waypoints = self.waypoints.concat( parseWaypointsBranch( parameters.waypoints ) );
      self.branch = new Branch( thisGLE, parameters, this );
      self.waypoints = self.branch.waypoints;
      /*
      parameters.waypoints.forEach( function(w){ 
        if( Array.isArray( w ) )
        { 
          // a waypoint
          self.waypoints.push( new Vec2D( w[0], w[1] ) ); 
        } else {
          // a branch
          return; // TODO FIXME
        }
      });*/
    }
    /*
    if( parameters.end )
    {
      parameters.end.block.setInConnection( this, parameters.end.portNumber );
      var pos = parameters.end.block.getInCoordinates( parameters.end.portNumber, true );
      this.waypoints.push( pos[0] );
      this.waypoints.push( pos[1] );
    }
    */
    //self.branch = new Branch( self.waypoints );
    console.log( self.waypoints );
    
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
    this.branch = new Branch( thisGLE, this.waypoints, this );
    this.GLE.invalidateHandlers();
    return this;
  };
  
  return Connection;
});