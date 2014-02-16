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
(function( window, undefined ) {
  "use strict";
  
  // private variables:
  var defaultValue = {
        gridSize: 5, // the distance between grid points
        minScale: 0.05, // minimum scale factor
        maxScale: 10.0, // maximum scale factor
        // the definition of the drawing sizes
        toleranceHandle      : 5, // halfsize for hotspot in pixel
        drawSizeHandle       : 2, // halfsize for visible handle in pixel
        drawSizeHandleActive : 3, // halfsize for visible handle in pixel
        toleranceLine        : 5, // halfsize for hotspot in pixel
        drawSizeLine         : 1, // line width in pixel
        toleranceBlock       : 3, // halfsize for hotspot in pixel
        drawSizeBlock        : 1  // line width in pixel
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
      
  // create namespace if necessary
  if( undefined === window._GLE )
    window._GLE = {};
  
  if( undefined !== window._GLE.settings )
    throw 'Error: "settings" already in "_GLE" namespace!';
  
  window._GLE.settings = Settings;
})( window );