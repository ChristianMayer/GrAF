/**
 * Vec2D.js (c) 2013, 2014 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 * Vec2D - a JS library for 2D vector operations.
 * Design decision:
 *   All operations modify the source!
 *   All operations are chainable.
 * 
 * Exceptions are marked explicitly.
 * If the source mustn't be changed, use the copy() method.
 * @module Vec2D
 */ 
define( function( undefined ) {
  "use strict";

  /**
   * The Vec2D class.
   * @constructor
   * @exports Vec2D
   * @class Vec2D
   * @global
   * @alias module:Vec2D
   */
  var Vec2D = function( optionalX, optionalY ) {
    if( !( this instanceof Vec2D ) )
      throw 'Error, use "new" operator for Vec2D!';

    if( 'object' === typeof optionalX && 
        undefined !== optionalX.x     &&
        undefined !== optionalX.y        )
    {
      this.x = +optionalX.x;
      this.y = +optionalX.y;
    } else {
      this.x = +optionalX;
      this.y = +optionalY;
    }
  };
    
  // fill the prototype public methods of GLE:
  Vec2D.prototype.toString = function() { return '[object Vec2D]'; };
  Vec2D.prototype.print    = function( precision ) {
    var toPrint = this.copy();
    if( precision )
      return toPrint.x.toFixed( precision ) + '/' + toPrint.y.toFixed( precision );
    return toPrint.x + '/' + toPrint.y;
  };
  
  /**
   * Create a copy of the current Vec2D object.
   * @returns {Vec2D} The copy, a new object.
   */
  Vec2D.prototype.copy = function() {
    return new Vec2D( this.x, this.y );
  };
  
  /**
   * Replace the values by those from a different Vec2D.
   * @param {Vec2D} other
   * @returns {Vec2D} this Vec2D
   */
  Vec2D.prototype.replace = function( other ) {
    this.x = +other.x;
    this.y = +other.y;
    return this;
  };
  Vec2D.prototype.plus = function( other ) {
    this.x += +other.x;
    this.y += +other.y;
    return this;
  };
  Vec2D.prototype.minus = function( other ) {
    this.x -= +other.x;
    this.y -= +other.y;
    return this;
  };
  /**
   * multiplication with scalar
   */
  Vec2D.prototype.scale = function( scalar ) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }
  /**
   * coefficient multiplication
   */
  Vec2D.prototype.cmul = function( other ) {
    if( other instanceof Vec2D )
    {
      this.x *= +other.x;
      this.y *= +other.y;
      return this;
    } else {// treat as array
      this.x = +(this.x * +other[0]);
      this.y = +(this.y * +other[1]);
      return this;
    }
  };
  /**
   * Scalar product.
   * @param {Vec2D} other The other {@link Vec2D}.
   * @returns {Number} The scalar product between this and other
   */
  Vec2D.prototype.sprod = function( other ) {
    return this.x * +other.x + this.y * +other.y;
  };
  /**
   * coefficient division
   */
  Vec2D.prototype.cdiv = function( other ) {
    if( other instanceof Vec2D )
    {
      this.x /= +other.x;
      this.y /= +other.y;
      return this;
    } else {// treat as array
      this.x = +(this.x / +other[0]);
      this.y = +(this.y / +other[1]);
      return this;
    }
  };
  
  /**
   * Component wise minimum.
   */
  Vec2D.prototype.cmin = function( other ) {
    if( other instanceof Vec2D )
    {
      this.x = this.x < other.x ? this.x : other.x;
      this.y = this.y < other.y ? this.y : other.y;
    }
    return this;
  };
  /**
   * Component wise maximum
   */
  Vec2D.prototype.cmax = function( other ) {
    if( other instanceof Vec2D )
    {
      this.x = this.x > other.x ? this.x : other.x;
      this.y = this.y > other.y ? this.y : other.y;
    }
    return this;
  };
  
  /**
   * Compare two Vec2D. 
   * @param {Number} epsilon - if set use that as a tolerance, otherwise exact match.
   */
  Vec2D.prototype.equal = function( other, epsilon ) {
    if( undefined === epsilon )
      return this.x === other.x && this.y === other.y;
    
    var tmp = this.copy().minus( other );
    return tmp.sprod( tmp ) <= epsilon*epsilon;
  };
  /**
   * Component wide "greater then".
   * @return true if any of the components are greater
   */
  Vec2D.prototype.gt = function( other ) {
    return (this.x > other.x) || (this.y > other.y);
  };
  
  /**
   * Scale vector to passed length.
   * If length is 1.0 it will be a unit vector.
   */
  Vec2D.prototype.toLength = function( length ) {
    var scale = +length / Math.sqrt( this.sprod( this ) );
    this.x *= scale;
    this.y *= scale;
    return this;
  };
  /**
   * Calculate the normal vector.
   */
  Vec2D.prototype.getNormal = function() {
    return new Vec2D( this.y, -this.x );
  };
  /**
   * Calculate a norm.
   */
  Vec2D.prototype.getNorm = function() {
    return this.sprod( this );
  };
  
  /**
   * Round values. 
   * This could be used to clamp to a grid.
   */
  Vec2D.prototype.round = function( precision ) {
    this.x = precision * (this.x / precision | 0);
    this.y = precision * (this.y / precision | 0);
    return this;
  };
  /**
   * Floor function and convert to integer.
   */
  Vec2D.prototype.floor = function() {
    this.x = this.x|0;
    this.y = this.y|0;
    return this;
  };
  
  /**
   * Set qualifier.
   */
  Vec2D.prototype.setQualifier = function( key, value ) {
    this[key] = value;
    return this;
  };
  
  return Vec2D;
});