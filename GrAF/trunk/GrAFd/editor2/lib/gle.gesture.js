/**
 * gle.gesture.js (c) 2014 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 * @module Gesture
 * @title  GrAF logic engine: graphical logic editor
 */

// Use an algorthim to do a least square fit as described in the paper
// "A Few Methods for Fitting Circles to Data" by Dale Umbach and Kerry
// N. Jones (http://dx.doi.org/10.1109/TIM.2003.820472).
// There it was called "Modified Least Squares Methods" or "MLS".
// I selected that approach as it created good results and could be
// used incremental, i.e. with each new point it get's a bit better
// without the need to remember each other old point.
// This is also the reason that I didn't use any of their least squares
// apporach to calculate the radius. Instead I created my own apporach
// where the area of the circle is calculated incremental (it's using
// a simple polyline / fan formula) and the readius is generated out of
// it. Not as perfect - but memory efficient and good enough.

// create a local context:
(function( window, undefined ) {
  "use strict";
  
  // private variables:
  var 
    // the values and limits to recognize the gesture
    straightDistSqMin,    // limit: cursor must have been moved further than this - squared
    straightDistSqMax,    // limit: cursor must not have been moved further than this - squared
    straightDistSqCurMax, // value: furthest distance from the initial point so far - squared
    filledDoubleAreaMin,  // limit: minimum area to be in moved polyline - doubled
    curTriangleDoubleA,   // value: area between init, center and current pos - doubled
    // the accumulating values for the least square fit
    xSum    = 0.0,
    xxSum   = 0.0,
    xxxSum  = 0.0,
    xySum   = 0.0,
    xxySum  = 0.0,
    xyySum  = 0.0,
    ySum    = 0.0,
    yySum   = 0.0,
    yyySum  = 0.0,
    nSum    = 0.0,
    doubleA = 0.0,
    initPos,
    lastPos,
    detGesPos,
    xGesPos,
    yGesPos,
    rGesPos,
    confirmedGesPos, // will be set whith a correct position when found
    confirmedGesR, 

    /**
      * The Gesture constructor
      */
    Gesture = function( thisGLE ) {
      // private:
      var 
        self = this;
          
      // public:
      /**
       * Inital call to start a new gesture recognition.
       * @param screenPos Vec2D the first point of the gesture
       * @param scale     float Modify valid recognition size by that scale
       */
      this.start = function( screenPos, scale ) {
        scale = 1.0; // prevent scaling right now, dunno if it's a good idea anyway... TODO
        
        var
          x = +screenPos.x,
          y = +screenPos.y,
          rMinSqare = thisGLE.settings.gestureCircleMinR * scale
                    * thisGLE.settings.gestureCircleMinR * scale,
          rMaxSqare = thisGLE.settings.gestureCircleMaxR * scale
                    * thisGLE.settings.gestureCircleMaxR * scale;
        
        // calculate and initialize the limits:
        // make sure that at least the minimum half circle was traveled:
        straightDistSqMin = 4 * rMinSqare; // = 2*MinR - squared to prevent root taking...
        straightDistSqMax = 4 * rMaxSqare; // = 2*MaxR - squared to prevent root taking...
        straightDistSqCurMax = 0.0;
        filledDoubleAreaMin = Math.PI * rMinSqare; // area of half circle - doubled
        
        // initialize the least square fit values
        xSum    = x;
        xxSum   = x * x;
        xxxSum  = x * x * x;
        xySum   = x * y;
        xxySum  = x * x * y;
        xyySum  = x * y * y;
        ySum    = y;
        yySum   = y * y;
        yyySum  = y * y * y;
        nSum    = 1.0;
        doubleA = 0.0;
        initPos = screenPos.copy();
        lastPos = screenPos.copy();
        
        confirmedGesPos = undefined;
      };
      
      this.update = function( screenPos ) {
        var
          x = +screenPos.x,
          y = +screenPos.y;
        
        // update least square fit:
        xSum   += x;
        xxSum  += x * x;
        xxxSum += x * x * x;
        xySum  += x * y;
        xxySum += x * x * y;
        xyySum += x * y * y;
        ySum   += y;
        yySum  += y * y;
        yyySum += y * y * y;
        nSum++;
        doubleA += (lastPos.x - initPos.x) * (y - initPos.y) -
                   (lastPos.y - initPos.y) * (x - initPos.x);
        lastPos = screenPos.copy();
        var
          A = nSum * xxSum - xSum * xSum,
          B = nSum * xySum - xSum * ySum,
          C = nSum * yySum - ySum * ySum,
          D = 0.5 * ( nSum * xyySum - xSum * yySum + nSum * xxxSum - xSum * xxSum ),
          E = 0.5 * ( nSum * xxySum - ySum * xxSum + nSum * yyySum - ySum * yySum );
        detGesPos = A * C - B * B,
        xGesPos   = D * C - B * E,
        yGesPos   = A * E - B * D;
        rGesPos   = Math.sqrt( Math.abs(doubleA/2/Math.PI) );
        
        // update values for limits:
        straightDistSqCurMax = Math.max( 
          straightDistSqCurMax, 
          screenPos.copy().minus( initPos ).getNorm()
        );
        curTriangleDoubleA = (detGesPos == 0) ? 0 :
          (xGesPos/detGesPos - initPos.x) * (y - initPos.y) -
          (yGesPos/detGesPos - initPos.y) * (x - initPos.x);
          
        // check if gesture was detected:
        var 
          // is the gesture far enough to be able to call it a (half-)circle?
          validCircleReached =
            ( straightDistSqCurMax > straightDistSqMin   ) &&
            ( Math.abs( doubleA )  > filledDoubleAreaMin ) &&
            ( curTriangleDoubleA*doubleA > 0 ), // check that cursor moved in the second half of the circle
          // has the gesture not gone too far so that it can never be a vaild
          // circle again
          validCircleNotOverreached =
            ( straightDistSqCurMax < straightDistSqMax   ) &&
            true;
            
        if( validCircleReached && validCircleNotOverreached && detGesPos != 0 ) {
          confirmedGesPos = new Vec2D( xGesPos/detGesPos, yGesPos/detGesPos );
          confirmedGesR   = rGesPos;
          return true;
         }
         
         return false;
      };
      
      /**
       * Return information about the detected gesture.
       */
      this.getInfo = function() {
        if( undefined === confirmedGesPos ) {
          return {};
        } else {
          return {
            center: confirmedGesPos,
            radius: confirmedGesR
          };
        }
      };
      
      // FIXME and TODO: remove and put function to the update function what is necessary...
      this.show = function( view, scale ) {
        /*
        console.log( 'det:',detGesPos, 'x',xGesPos/detGesPos, 'y',yGesPos/detGesPos, '2A',doubleA, 'r',rGesPos );
        console.log( 'Erkannt?', 
                     'DistCurMax', straightDistSqCurMax, straightDistSqCurMax>straightDistSqMin?'OK':'no',straightDistSqCurMax<straightDistSqMax?'OK':'no',
                     'Area', doubleA, Math.abs(doubleA)>filledDoubleAreaMin?'OK':'no', 
                     'SideSwitch', curTriangleDoubleA, (curTriangleDoubleA*doubleA>0)?'OK':'no'
                   );
        */
        var 
          // is the gesture far enough to be able to call it a (half-)circle?
          validCircleReached =
            ( straightDistSqCurMax > straightDistSqMin   ) &&
            ( Math.abs( doubleA )  > filledDoubleAreaMin ) &&
            ( curTriangleDoubleA*doubleA > 0 ), // check that cursor moved in the second half of the circle
          // has the gesture not gone too far so that it can never be a vaild
          // circle again
          validCircleNotOverreached =
            ( straightDistSqCurMax < straightDistSqMax   ) &&
            true;
        
        if( validCircleReached && validCircleNotOverreached ) {
          confirmedGesPos = new Vec2D( xGesPos/detGesPos, yGesPos/detGesPos );
          confirmedGesR   = rGesPos;
        }
          
        if( detGesPos != 0 && view !== undefined ) {
          var 
            ctxBg = view.debugGetCtxBg(),
            ctxFg = view.debugGetCtxFg(),
            pScreen = new Vec2D( xGesPos/detGesPos, yGesPos/detGesPos ),
            p = view.screen2canvas( pScreen ).scale(scale);
          ctxFg.fillRect( p.x, p.y, 2, 2 );
          if( undefined !== confirmedGesPos ) {
            var confirmedGesPosCanvas = view.screen2canvas( confirmedGesPos ).scale(scale);
            ctxFg.beginPath();
            ctxFg.fillStyle = 'rgba(0,255,0,0.2)';
            ctxFg.arc( confirmedGesPosCanvas.x, confirmedGesPosCanvas.y, confirmedGesR, 0, 2 * Math.PI, false);
            ctxFg.fill();
            ctxFg.fillStyle = '#000000';
          }
          ctxFg.beginPath();
          ctxFg.arc( p.x, p.y, rGesPos, 0, 2 * Math.PI, false);
          ctxFg.strokeStyle = validCircleReached ? (validCircleNotOverreached?'#00ff00':'#ff0000') : '#000000';
          ctxFg.stroke();
          ctxFg.strokeStyle = '#000000';
        }
      };
        
    };
      
  // fill the prototype public methods of Gesture:
  Gesture.prototype.toString = function() { return '[object Gesture]'; };
      
    // create namespace if necessary
  if( undefined === window._GLE )
    window._GLE = {};
  
  if( undefined !== window._GLE.gesture )
    throw 'Error: "gesture" already in "_GLE" namespace!';
  
  window._GLE.gesture = Gesture;
})( window );