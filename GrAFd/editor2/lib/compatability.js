/**
 * compatability.js (C) 2015 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
define( [], function( undefined ) {
  "use strict";
  
  // some browsers don't have canvas ellipsis yet - polyfill it:
  if( !CanvasRenderingContext2D.prototype.ellipse )
  {
    CanvasRenderingContext2D.prototype.ellipse = function( x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise )
    {
      // note: this is only a quick fix using the transformation matrix
      // the drawback of this approach is that it might also affect the line
      // width in a non even way
      this.save();
      this.translate( x, y );
      this.rotate( rotation );
      this.scale( radiusX, radiusY );
      this.arc( 0, 0, 1, startAngle, endAngle, anticlockwise );
      this.restore();
    }
  }

});