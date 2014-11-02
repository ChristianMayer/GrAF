/**
 * main.js (c) 2014 by Christian Mayer [CometVisu at ChristianMayer dot de]
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
 * @title  GrAF logic engine: graphical logic editor - main file to start up
 */

///////////////////////////////////////////////////////////////////////
//
//  Preparation:
//

// monkey patch: fill global variable with URL GET parameters:
(function(){
  "use strict";
  var
    href = window.location.href,
    parameters = {},
    keyValue = href.slice( href.indexOf( '?' ) + 1 ).split( '&' );
    
  for(var i = 0; i < keyValue.length; i++)
  {
    var k_v = keyValue[i].split('=');
    if( parameters.hasOwnProperty( k_v[0] ) )
      parameters[ k_v[0] ].push( k_v[1] );
    else
      parameters[ k_v[0] ] = [ k_v[1] ];
  }
  window.urlParameter = parameters;
})();

///////////////////////////////////////////////////////////////////////
//
//  Configuration:
//

require.config({
  paths: {
    'i18n':        'dependencies/require-2.1.15.i18n',
    'jquery':      'dependencies/jquery-2.1.1',
    'jquery-i18n': 'dependencies/jquery.i18n',
    'jquery-ui':   'dependencies/jquery-ui-1.11.2.custom/jquery-ui',
    'jstree':      'dependencies/jstree-3.0.8/dist/jstree.min',
    'superfish':   'dependencies/superfish-master/src/js/superfish'
  },
  'shim': {
    'jquery-i18n': ['jquery'],
    'superfish':   ['jquery']
  },
  locale: window.urlParameter['lang'] ? window.urlParameter['lang'][0] : ''
});

///////////////////////////////////////////////////////////////////////
//
//  Main:
//

require([ 'i18n!nls/strings', 'jquery', 'lib/gle', 'lib/Vec2D', 'jquery-i18n','jquery-ui', 'jstree', 
          'superfish','i18n!nls/strings'],
function( i18nStrings,        $, GLE,Vec2D,a1,a2,a3,a4,a5,a6,a7,a8 ) {
  "use strict";
console.log(GLE,a1,a2,a3,a4,a5,a6,a7,a8);
  // load relevant language ressource
  $.i18n.load( i18nStrings );

  /////////////////////////////////////////////////////////////////////
  //
  //  Event handling
  //
  function onNavTreeChanged( e, data ) {
    var
      name    = data.node.text,
      parents = data.node.parents.map(function(node){return data.instance.get_node(node).text;});
      
    parents.pop(); // drop the root node '#' that is now undefined
    parents.reverse();
      
    window.document.title = 'GLE - ' +  parents.join('/') + (parents.length?'/':'') + name;
  }

  /////////////////////////////////////////////////////////////////////
  //
  //  Functions to handle updates of the content:
  //
  
  /**
   * Add a new file to the navigation area.
   */
  function navAddFile( name, content )
  {
    // recursive function to map subsystems to jstree format:
    function mapSub2Tree( subsystems )
    {
      var retval = [];
      for( var i = 0, len = subsystems.length; i < len; i++ )
      {
        var element = subsystems[i];
        
        if( typeof element === 'string' ) {
          retval.push( { 
            'text': element,
            'type': 'subsystem'
          } );
        } else {
          retval.push( { 
            'text': element.text,
            'type': 'subsystem',
            'children': mapSub2Tree( element.children )
          } );
        }
      }
      return retval;
    }
    
    // and insert is as a new node to the nav tree
    $('#nav').jstree().create_node( '#', {
      'text': name,
      'type': 'file',
      'children': mapSub2Tree( content )
    });
  }

  /////////////////////////////////////////////////////////////////////
  //
  //  Helper functions to set up each relevant part of the page:
  //

  /**
   * Helper function to create the menu bar on the page.
   */
  function setupMenu( menubar )
  {
    // Recursively create out of an array an <li>-list
    function generateMenu( $superior, menu )
    {
      $( menu ).each( function(){
        var
          disable = this[2] && this[2].disable,
          $li = $( 
            '<li ' + (disable ? 'class="ui-state-disabled"' : '') + '><a>'
            + $.i18n._(this[0])
            + '</a></li>' );
          
        if( typeof this[1] === 'function' ) {
          var callback = this[1];
          $li.click( function( event ){
            if( !$(this).hasClass( 'ui-state-disabled' ) )
              callback();
          });
        } else {
          $li.append( generateMenu( $('<ul></ul>'), this[1] ) );
        }
        $superior.append( $li );
      });
      return $superior;
    }
    
    $('#menu').append( generateMenu( $('<ul class="sf-menu"></ul>'), menubar ) ).superfish();
  }

  function setupNav()
  {
    $('#nav')
      .on('changed.jstree', onNavTreeChanged )
      .jstree({
        'core': {
          'multiple':       false,
          'worker':         false,
          'check_callback': true,
          // 'data' : [ ... ],
        },
        'dnd': { 'is_draggable': false, 'drag_check': false }, // how to remove dnd?!?
        'types': {
          'file': {
            'icon': 'jstree-folder'
          },
          'subsystem' : {
            'icon': 'jstree-file'
          }
        },
      'plugins' : ['types']
    });
  }

  function setupLib()
  {
    $('#lib')
      // dummy data for demo:
      .append( '<h3>aaa</h3><div>bbb</div><h3>111</h3><div>222</div>' )
      .accordion();
  }

  function setupFoot()
  {
    $('#foot').append('test text');
  }

  $(document).ready( function(){
    var
      nop = function(){},
      col = function(a,b,c){console.log(this,a,b,c);},
      menubar = [
        ['File', col],
        ['Edit', col, {disable:true}],
        ['Struktur', function(){$('#nav').toggle('slide')}, ],
        ['Bibliothek', function(){$('#lib').toggle('slide',{ direction: "right" })}, ],
        ['bla',  [
          ['blub', [
            ['File', nop],
            ['Edit', nop]
          ]],
          ['blub2', nop],
          ['blub', [
            ['File', nop],
            ['Edit', nop]
          ]],
          ['blub2', nop],
          ['blub', [
            ['File', nop],
            ['Edit', nop]
          ]],
          ['blub2', nop],
          ['blub', [
            ['File', nop],
            ['Edit', nop]
          ]],
          ['blub2', nop]
        ]]
      ];
    setupMenu( menubar );
    setupNav();
    setupLib();
    setupFoot();
    
    // dummy data for demo
    navAddFile( 'datei', [ 'sub1', 'sub2', {'text':'sub3','children':['subsub1','subsub2']} ] );
    navAddFile( 'datei2', [ 'sub1', 'sub2', {'text':'sub3','children':['subsub1','subsub2']} ] );
    
    /////////////
    var b1 = GLE.addBlock(); 
b1.setName( 'b1 viel Text üypIµ| viel Text b1' );
b1.setInPorts( ['in1', 'in2'] );

var b2 = GLE.addBlock(); 
b2.setTopLeft( new Vec2D( 300, 350 ) );
b2.setName( 'b2' );
b2.setInPorts( ['in1', 'in2', 'in3'] );
b2.setOutPorts( ['out1', 'out2'] );

var b3 = GLE.addBlock(); 
b3.setTopLeft( new Vec2D( 100, 350 ) );
b3.setName( 'b3' );

var b4 = GLE.addBlock(); 
b4.setTopLeft( new Vec2D( 400, 50 ) );
b4.setName( 'b4' );

var c1 = GLE.addConnection();
c1.insertWaypoint( new Vec2D( 300, 100 ) );
c1.insertWaypoint( new Vec2D( 200, 200 ) );
c1.insertWaypoint( new Vec2D( 300, 200 ), 1 );
c1.waypoints[1].protected = true;

var c2 = GLE.addConnection();
c2.insertWaypoint( new Vec2D( 400, 400 ) );
c2.insertWaypoint( new Vec2D( 450, 420 ) );

var c3 = GLE.addConnection();
c3.insertWaypoint( new Vec2D( 400, 400 ) );
c3.insertWaypoint( new Vec2D( 450, 400 ) );

var c4 = GLE.addConnection();
c4.insertWaypoint( new Vec2D( 400, 400 ) );
c4.insertWaypoint( new Vec2D( 450, 450 ) );

var c5 = GLE.addConnection();
c5.insertWaypoint( new Vec2D( 400, 400 ) );
c5.insertWaypoint( new Vec2D( 400, 450 ) );

var c6 = GLE.addConnection(); // mark the middle...
c6.insertWaypoint( new Vec2D( 350/2, 250/2 ) );
c6.insertWaypoint( new Vec2D( 420/2, 320/2 ) );
c6.insertWaypoint( new Vec2D( 350/2, 320/2 ) );
c6.insertWaypoint( new Vec2D( 420/2, 250/2 ) );

GLE.updateContentSize();
  });
});