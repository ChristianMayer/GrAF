/**
 * Line2D.js (c) 2014 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 * @title  GrAF logic engine: graphical logic editor
 */

/**
 * Line2D - a JS library for 2D line operations.
 * Design decision:
 *   All operations modify the source!
 *   All operations are chainable.
 * 
 * Exceptions are marked explicitly.
 * If the source mustn't be changed, use the copy() method.
 * @module Line2D
 */ 
define( ['lib/Vec2D'], function( Vec2D ){
  //////////////////////////////////////////////////////////////////////////////
  // Line                                                                     //
  //////////////////////////////////////////////////////////////////////////////
  
  var Line = function( start, end ) {
    if( !( this instanceof Line ) )
      throw 'Error, use "new" operator for Line!';

    if( !( start instanceof Vec2D ) || !( end instanceof Vec2D ) )
      throw 'Error, parameters has to be of type Vec2D!';
    
    this.start = start;
    this.end   = end;
  };
    
  // fill the prototype public methods of GLE:
  Line.prototype.toString = function() { return '[object Line]'; };
  
  /**
   * Calculate the intersection point of two lines.
   * When the @retrurn value num1 or num2 is divided by det you have the
   * intersection point in local coordinates.
   */
  Line.prototype.calcIntersection = function( otherLine )
  {
    var dir1 = this.end.copy().minus( this.start ),
        dir2 = otherLine.end.copy().minus( otherLine.start ),
        diff = this.start.copy().minus( otherLine.start ),
        num1 = dir2.x * diff.y - dir2.y * diff.x,
        num2 = dir1.x * diff.y - dir1.y * diff.x,
        det  = dir2.y * dir1.x - dir2.x * dir1.y;
    return [ num1, num2, det ];
  };
  
  /**
   * Return true if both line segments do intersect.
   */
  Line.prototype.checkSegmentIntersection = function( otherLine )
  {
    var intersection = this.calcIntersection( otherLine ),
        num1 = intersection[0],
        num2 = intersection[1],
        det  = intersection[2];
    
    if( 0 === det ) return false; // lines parallel, probably identical...
    
    var t1 = num1 / det,
        t2 = num2 / det;
    console.log( num1, num2, det, t1, t2 );    
    return (t1 >= 0) && (t1 <= 1) && (t2 >= 0) && (t2 <= 1); 
  };
  
  /**
   * Return true if the point is closer to the segment than the epsilon
   */
  Line.prototype.checkPointProximity = function( point, epsilon )
  {
    var ps = point.copy().minus( this.start ),
        es = this.end.copy().minus( this.start ),
        num = ps.sprod( es ),
        det = es.sprod( es );
      
    if( (num < 0) || (num > det) )
      return false; // point outside of segment
      
    var s = ( ps.x*es.y - ps.y*es.x ) / det;
    
    return Math.abs( s ) * Math.sqrt( det ) < epsilon;
    /*    
     (Cx-Ax)(Bx-Ax) + (Cy-Ay)(By-Ay)
        r = -------------------------------
                          L^2
    */
  }

  return Line;
});