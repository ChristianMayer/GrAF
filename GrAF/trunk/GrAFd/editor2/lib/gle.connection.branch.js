/**
 * gle.connection..branch.js (C) 2013-2015 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
      //console.log( 'Branch getSelection', this );
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
    /**
     * Walk the branch tree and return the last sub branch where block is the 
     * target.
     */
    getSubBranchForBlock: function( block )
    {
      function recGetSubBranchForBlock( branch )
      {
        if( branch.target && branch.target.block === block )
          return branch;
        
        for( var i = 0, len = branch.waypoints ? branch.waypoints.length : 0; i < len; i++ )
        {
          if( !(branch.waypoints[i] instanceof Vec2D) )
          {
            var ret = recGetSubBranchForBlock( branch.waypoints[i] );
            if( ret )
              return ret;
          }
        }
        return false;
      }
      return recGetSubBranchForBlock( this );
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
  
  return Branch;
});