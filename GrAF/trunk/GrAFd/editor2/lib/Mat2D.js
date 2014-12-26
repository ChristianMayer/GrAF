/**
 * Mat2D.js (c) 2014 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 * Mat2D - a JS library for 2D vector operations.
 * Design decision:
 *   All operations modify the source!
 *   All operations are chainable.
 * 
 * Exceptions are marked explicitly.
 * If the source mustn't be changed, use the copy() method.
 * @module Mat2D
 */ 
define( ['lib/Vec2D'], function( Vec2D, undefined ) {
  "use strict";

  /**
   * The Mat2D class - a two dimensional matrix in projective coordinates.
   * The parameters follow the same definition as the HTML <canvas>:
   *   [ a c e ]
   *   [ b d f ]
   *   [ 0 0 1 ]
   * @constructor
   * @exports Mat2D
   * @class Mat2D
   * @global
   * @alias module:Mat2D
   */
  var Mat2D = function( optA, optB, optC, optD, optE, optF ) {
    if( !( this instanceof Mat2D ) )
      throw 'Error, use "new" operator for Mat2D!';

    if( 'object' === typeof optA )
    {
      debugger; // TODO implement...
    } else if( undefined === optA ) { // create an identitiy matrix
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
    } else { // create a matrix as defined
      this.a = +optA;
      this.b = +optB;
      this.c = +optC;
      this.d = +optD;
      this.e = +optE;
      this.f = +optF;
    }
  };
    
  // fill the prototype public methods of GLE:
  Mat2D.prototype.toString = function() { return '[object Mat2D]'; };
  Mat2D.prototype.print    = function( precision ) {
    var toPrint = this.copy();
    if( precision )
      return toPrint.x.toFixed( precision ) + '/' + toPrint.y.toFixed( precision );
      return toPrint.a.toFixed( precision ) + ', ' + toPrint.c.toFixed( precision ) + ', ' + toPrint.e.toFixed( precision ) + ' / '
           + toPrint.b.toFixed( precision ) + ', ' + toPrint.d.toFixed( precision ) + ', ' + toPrint.f.toFixed( precision );
    return toPrint.a + ', ' + toPrint.c + ', ' + toPrint.e + ' / '
         + toPrint.b + ', ' + toPrint.d + ', ' + toPrint.f;
  };
  
  /**
   * Create a copy of the current Mat2D object.
   * @returns {Mat2D} The copy, a new object.
   */
  Mat2D.prototype.copy = function() {
    return new Mat2D( this.a, this.b, this.c, this.d, this.e, this.f );
  };
  
  /**
   * Multiply a scale matrix
   */
  Mat2D.prototype.scale = function( x, y ) {
    if( x instanceof Vec2D )
    {
      this.a *= x.x;
      this.b *= x.x;
      this.c *= x.y;
      this.d *= x.y;
    } else {
      if( undefined === y )
      {
        this.a *= x;
        this.b *= x;
        this.c *= x;
        this.d *= x;
      } else {
        this.a *= x;
        this.b *= x;
        this.c *= y;
        this.d *= y;
      }
    }
    return this;
  };
  
  /**
   * Multiply a rotation matrix
   * @param {number} angle - the rotation angle in rad (i.e. [0;2*pi[
   */
  Mat2D.prototype.rotate = function( angle ) {
    var
      s = Math.sin( angle ),
      c = Math.cos( angle );
      
    this.mmul( new Mat2D( c, -s, s, c, 0, 0 ));
    return this;
  }
  
  /**
   * Multiply a tranlation matrix
   */
  Mat2D.prototype.translate = function( x, y ) {
    if( x instanceof Vec2D )
    {
      this.e += this.a*x.x + this.c*x.y;
      this.f += this.b*x.x + this.d*x.y;
    } else {
      this.e += this.a*x   + this.c*y;
      this.f += this.b*x   + this.d*y;
    }
    return this;
  };
  
  /**
   * Multiply a Mat2D on the right side and return the result.
   * @return {Mat2D} this after the multiplication
   */
  Mat2D.prototype.mmul = function( rhs ) {
    var
      a = this.a * rhs.a + this.c * rhs.b,
      b = this.b * rhs.a + this.d * rhs.b,
      c = this.a * rhs.c + this.c * rhs.d,
      d = this.b * rhs.c + this.d * rhs.d,
      e = this.a * rhs.e + this.c * rhs.f + this.e,
      f = this.b * rhs.e + this.d * rhs.f + this.f;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    
    return this;
  };
  
  /**
   * Multiply a Vec2D and return the result.
   * @return {Vec2D} The result of the multiplication
   */
  Mat2D.prototype.mul = function( rhs ) {
    return new Vec2D(
      this.a * rhs.x + this.c * rhs.y + this.e,
      this.b * rhs.x + this.d * rhs.y + this.f
    );
  }
  
  /**
   * Multiply a Vec2D represensting a normal and return the result.
   * @return {Vec2D} The result of the multiplication, normaized
   */
  Mat2D.prototype.nmul = function( rhs ) {
    return (new Vec2D(
      this.a * rhs.x + this.c * rhs.y,
      this.b * rhs.x + this.d * rhs.y
    )).toLength(1.0);
  }
  
  /**
   * Set a <canvas> transform to the context of the matrix.
   */
  Mat2D.prototype.setTransform = function( context ) {
    context.setTransform( this.a, this.b, this.c, this.d, this.e, this.f );
  };
  
  return Mat2D;
});