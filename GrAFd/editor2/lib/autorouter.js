/**
 * autorouter.js (c) 2013 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 * @module autorouter
 * @title  GrAF logic engine: graphical logic editor
 */

/**
 * Implemennt Mikami and Tabuchi routing algorithm.
 * 
 * Also look at http://cc.ee.ntu.edu.tw/~ywchang/Courses/PD/EDA_routing.pdf
 */

"use strict";

var lineStep = 10,
    img;

if( 'undefined' === typeof console )
  self.console = {};
if( undefined === console.log )
  self.console.log = function() {
    postMessage( makeTrueArray( arguments ) );
  };

var makeTrueArray = function( obj ) {
  return Array.prototype.slice.call( obj );
};

importScripts( 'Vec2D.js' );

/**
 * Get the value of a pixel
 */
function getPixel( x, y )
{
  return img.data[ (x + y * img.width)*4 + 1 ];
}

function getCandidate( startPos, direction, newPos, endPos )
{
  var waypoints = [ startPos ];
  
  waypoints[1] = newPos.copy();
  waypoints[2] = newPos.copy();
  switch( direction )
  {
    case 0: // Right
    default:
      if( waypoints[0].x > newPos.x )
        waypoints[1].x = waypoints[0].x;
      else
        waypoints[1].y = waypoints[0].y;
      break;
      
    case 2: // Left
      if( waypoints[0].x < newPos.x )
        waypoints[1].x = waypoints[0].x;
      else
        waypoints[1].y = waypoints[0].y;
      break;
      
    case 1: // Up
      if( waypoints[0].y > newPos.y )
        waypoints[1].x = waypoints[0].x;
      else
        waypoints[1].y = waypoints[0].y;
      break;
      
    case 3: // Down
      if( waypoints[0].y < newPos.y )
        waypoints[1].x = waypoints[0].x;
      else
        waypoints[1].y = waypoints[0].y;
      break;
  }
  if( undefined !== endPos )
  {
    waypoints[3] = endPos.copy();
    waypoints[2].protected = true;
    waypoints[3].protected = true;
  } else {
    waypoints.length = 3;
    waypoints[2].protected = false;
  }
  
  return waypoints;
};

onmessage = function( event ) {
  var data = event.data;
  
  if( 'getCandidate' === data[0] )
  {
    var startPos  = new Vec2D( data[1] ),
        direction = data[2] | 0,
        newPos    = new Vec2D( data[3] ),
        endPos    = undefined === data[4] ? undefined : new Vec2D( data[4] );
    
    postMessage( [ 'gotCandidate', getCandidate( startPos, direction, newPos, endPos ) ] );
  }   
  //img = data.img;
  
  /*
  */
 // console.log( data );
  //postMessage("Hi " + oEvent.data);
};