/**
 * settings.js (c) 2014 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 * @module Settings
 * @title  GrAF logic engine: graphical logic editor
 */

// create a local context:
define( ['lib/Vec2D'], function( Vec2D, undefined ) {
  "use strict";
  
  // private variables:
  var 
    defaultValue = {
      // generic settings
      gridSize: 5, // the distance between grid points
      minScale: 0.05, // minimum scale factor
      maxScale: 10.0, // maximum scale factor
      borderWidth: 20,  // add this to the used space when shrinking to content
      // the definition of the drawing sizes
      toleranceHandle      : 6, // halfsize for hotspot in pixel
      drawSizeHandle       : 2, // halfsize for visible handle in pixel
      drawSizeHandleActive : 3, // halfsize for visible handle in pixel
      toleranceLine        : 6, // halfsize for hotspot in pixel
      drawSizeLine         : 1, // line width in pixel
      toleranceBlock       : 3, // halfsize for hotspot in pixel
      drawSizeBlock        : 1, // line width in pixel
      // gesture recognition tolerances:
      gestureCircleMinR    : 15,  // in screen pixel
      gestureCircleMaxR    : 35, // in screen pixel
      // the default values for text
      fontSize             : 10, // in px
      fontFamiliy          : 'sans-serif',
      fontStyle            : '', // e.g. 'italic'
      // the maximum sizes not to push the browser too hard
      maxCanvasSize: new Vec2D( 2048, 2048 ),
      maxCanvasArea: 5*1024*1024,  // 5 MPix = limit for iOS with >256MB RAM
      // dummy element to catch the last ',' of the line above
      end:true
    },

    /**
     * The Settings constructor
     */
    Settings = function() {
      // private:
      var self = this;
      
      /**
       * public methods
       */
      //this.methodABC = function() {};
      
      // Constructor
      for( var key in defaultValue )
        this[ key ] = defaultValue[ key ];
    };
      
  // fill the prototype public methods of Settings:
  Settings.prototype.toString = function() { return '[object Settings]'; };
      
  return Settings;
});