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
    'jstree':      'dependencies/jstree-3.0.8/dist/jstree',
    'superfish':   'dependencies/superfish-master/src/js/superfish'
  },
  'shim': {
    'jquery-i18n': ['jquery'],
    //'jstree':      ['jquery'], // needed?!?
    'superfish':   ['jquery']
  },
  locale: window.urlParameter['lang'] ? window.urlParameter['lang'][0] : ''
});

///////////////////////////////////////////////////////////////////////
//
//  Main:
//

require([ 'i18n!nls/strings', 'jquery', 'lib/gle', 'lib/Vec2D', 'jquery-i18n','jquery-ui', 'jstree', 
          'superfish'],
function( i18nStrings,        $, GLE,Vec2D,a1,a2,a3,a4,a5,a6,a7,a8 ) {
  "use strict";
console.log(GLE,a1,a2,a3,a4,a5,a6,a7,a8);
  // load relevant language ressource
  $.i18n.load( i18nStrings );

  var
    libraray  = {}, // hash containing all open libaraies
    openFiles = {}; // hash containing all open content
    
  /////////////////////////////////////////////////////////////////////
  //
  //  Event handling
  //
  function onNavTreeChanged( e, data ) {
    var
      name    = data.node.text,
      parents = data.node.parents.map(function(node){return data.instance.get_node(node).text;}),
      file    = name;
      
    parents.pop(); // drop the root node '#' that is now undefined
    parents.reverse();
    if( parents.length > 0 )
      file = parents[0];
    
    window.document.title = 'GLE - ' +  parents.join('/') + (parents.length?'/':'') + name;
    
    var system = openFiles[file];
    if( parents.length > 0 )
    {
      for( var i = 1; i < parents.length; i++ )
      {
        var systemName = parents[i];
        system = system.blocks[ systemName ];
      }
      system = system.blocks[ name ];
    }
    
    editorSwitchContent( system );
  }

  /////////////////////////////////////////////////////////////////////
  //
  //  Functions to interface the editor
  //
  
  /**
   * Clear the current drawing plane and show system.
   */
  function editorSwitchContent( system )
  {
    GLE.deleteEverything();
    
    for( var blockName in system.blocks )
    {
      var
        blockSrc = system.blocks[ blockName ],
        lib      = getFromLib( blockSrc.type ),
        block    = $.extend( {inPorts:[],outPorts:[]}, lib, blockSrc ),
        b        = GLE.addBlock();
        
      b.setName( blockName );
      b.setTopLeft( new Vec2D( block.x, block.y ) );
      b.setSize( new Vec2D( block.width, block.height ) );
      
      // special case: get port info out of subsystem itself
      if( 'subsystem' === block.type )
      {
        for( var subblock in block.blocks )
        {
          if( 'sourceLib/in' === block.blocks[subblock].type )
            block.inPorts.push( {name: subblock} );
          else if( 'sinkLib/out' === block.blocks[subblock].type )
            block.outPorts.push( {name: subblock} );
        }
      }
      b.setInPorts(  block.inPorts.map(  function(p){ return p.name; } ) );
      b.setOutPorts( block.outPorts.map( function(p){ return p.name; } ) );
      b.setMask( block.mask );
    }
    system.signals && system.signals.forEach( function(con){
      var
        param = {
          start: { block: GLE.getBlockByName(con[0]), portNumber: con[1] },
          end:   { block: GLE.getBlockByName(con[2]), portNumber: con[3] },
          waypoints: con[4].waypoints || []
        };
      GLE.addConnection( param );
    });
    GLE.invalidateHandlers();
  }
  
  /////////////////////////////////////////////////////////////////////
  //
  //  Functions to handle updates of the content:
  //
  
  /**
   * Insert a block dropped from the libaray
   */
  function dropBlock( event, ui ) 
  {
    //console.log(this,event,ui);
    console.log( ui.draggable.data('type'), ui.position, ui.offset );

    var
    type     = ui.draggable.data('type'),
    lib      = getFromLib( type ),
    block    = lib, //$.extend( {inPorts:[],outPorts:[]}, lib ),//, blockSrc ),
    b        = GLE.addBlock();

    block.x = ui.offset.left;
    block.y = ui.offset.top;
    b.setName( type.split('/').pop() );
    b.setTopLeft( new Vec2D( block.x, block.y ) );
    b.setSize( new Vec2D( block.width, block.height ) );
    b.setInPorts(  block.inPorts.map(  function(p){ return p.name; } ) );
    b.setOutPorts( block.outPorts.map( function(p){ return p.name; } ) );
    b.setMask( block.mask );
  }
  
  /**
   * Add the content of a newly loaded file.
   */
  function addFile( name, content )
  {
    // recursive function to map subsystems to jstree format:
    function mapSub2Tree( subsystems )
    {
      var retval = [];
      for( var block in subsystems.blocks )
      {
        if( 'subsystem' === subsystems.blocks[block].type )
        {
          retval.push( { 
            'text': block,
            'type': 'subsystem',
            'children': mapSub2Tree( subsystems.blocks[block] )
          } );
        }
      }
      return retval;
    }
    
    // logic:
    var 
      $navtree  = $('#navtree').jstree(true),
      doReplace = openFiles.hasOwnProperty( name ),
      navtreeContent = {
          'text': name,
          'type': 'file',
          'children': mapSub2Tree( content )
        };
    
    
    // take care of the navtree
    if( doReplace )
    {
      var id = openFiles[ name ]._id;
      $navtree.delete_node( $navtree.get_node( id ).children );
      mapSub2Tree( content ).forEach( function(node){ $navtree.create_node( id, node ); } );
      openFiles[ name ] = content;
      openFiles[ name ]._id = id; // keep _id property
    } else {
      var id = $navtree.create_node( '#', navtreeContent );
      openFiles[ name ] = content;
      openFiles[ name ]._id = id;
    }

    $navtree.deselect_all( true );
    $navtree.select_node( openFiles[ name ]._id, false ); // false === create selection event
//    editorSwitchContent( openFiles[ name ] );
  }
  
  /**
   * Add a new libraray to the available libraries.
   * Note: when the name is empty it is the system libraray, otherwise its a
   * custom one.
   */
  function addLib( name, content )
  {
    console.log( 'addLib', name, content );
    var $lib = $('#lib');
    
    for( var libName in content )
    {
      var blocks = [];
      for( var block in content[libName] )
        blocks += '<div class="libBlock" data-type="' + libName + '/' + block + '"><canvas class="libBlockCanvas" width="100" height="100" />' + block + '</div>';
        //blocks += '<div><canvas class="libBlock" data-type="' + libName + '/' + block + '"/>' + block + '</div>';
      
      var x = $lib.append( '<h3>'+libName+'</h3><div>'+blocks+'</div>' );
      
      libraray[ libName ] = content[ libName ];
    }
    $lib.accordion( "refresh" );
    $lib.find( '.libBlock' ).each( function(){
      var 
        $this = $(this),
        type  = $this.data('type'),
        ctx = $this.find('canvas')[0].getContext('2d');
      //console.log( this, this.dataset.type, type, ctx);
      ctx.beginPath(); // FIXME TODO - draw the real block here...
      ctx.moveTo( 0  , 0   );
      ctx.lineTo( 100, 0   );
      ctx.lineTo( 0  , 100 );
      ctx.lineTo( 100, 100 );
      ctx.lineTo( 100, 0   );
      ctx.moveTo( 0  , 100 );
      ctx.lineTo( 0  , 0   );
      ctx.lineTo( 100, 100 );
      ctx.stroke(); 
    });
    
    $('.libBlock').draggable( {
      cursor: "no-drop", //"copy",
      helper: function(){
        var 
          cnvSrc = $(this).find('canvas')[0],
          newDOM = $('<canvas class="libBlockCanvas" width="100" height="100" />'),
          ctx    = newDOM[0].getContext('2d');
        ctx.drawImage( cnvSrc, 0, 0 );
        return newDOM;
      }
    });
  }
  
  /**
   * Little helper function to get a library entry based on block type
   */
  function getFromLib( type )
  {
    var 
      path = type.split('/');
      
    if( libraray[ path[0] ] && libraray[ path[0] ][ path[1] ] )
      return libraray[ path[0] ][ path[1] ];
    
    if( 'subsystem' !== type )
      console.error( 'Library does not contain a block of type "' + type + '"!' );
    return {};
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
    $('#navtree')
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
    $('#lib').accordion( { heightStyle: "fill" } );
  }

  function setupFoot()
  {
    $('#foot').append('test text');
  }

  $(document).ready( function(){
    var 
      toggleNavArea = (function(){
        var isOpen = true;
        return function() {
          if( isOpen )
            $('#nav_area').animate( { left: 6-200 } );
          else
            $('#nav_area').animate( { left: 0     } );
          isOpen = !isOpen;
        };
      })(),
      toggleLibArea = (function(){
        var isOpen = true;
        return function() {
          if( isOpen )
            $('#lib_area').animate( { right: 6-200 } );
          else
            $('#lib_area').animate( { right: 0     } );
          isOpen = !isOpen;
        };
      })();
    $('#nav_handle').click( toggleNavArea );
    $('#lib_handle').click( toggleLibArea );
    var
      nop = function(){},
      col = function(a,b,c){console.log(this,a,b,c);},
      menubar = [
        ['File', col],
        ['Edit', col, {disable:true}],
        ['Struktur', toggleNavArea ],
        ['Bibliothek', toggleLibArea ],
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
    
    // setup droppable on main area
    $('#canvascontainer').droppable({ 
      accept: '.libBlock', 
      drop: dropBlock
    });
    
    // dummy data for demo
    $.getJSON( 'testLib.json', function(data) {
      //console.log('got lib');
      addLib( '', data );
    }).error( function(a,b,c,d){
      console.error( 'Libaray load error: "' + b + '": "' + c.message + '"' );
    });
    $.getJSON( 'demo_logic1.js', function(data) {
      //console.log('got file 1');
      addFile( 'demo_logic1.js', data );
    });
    //setTimeout( function(){
    $.getJSON( 'demo_logic1.js', function(data) {
      //console.log('got file 1 copy');
      addFile( 'demo_logic1.js copy', data );
    });
    //}, 1000 );
    setTimeout( function(){
    $.getJSON( 'demo_logic2.js', function(data) {
      //console.log('got file 2');
      addFile( 'demo_logic1.js', data );
    });
    }, 3000 );
    
    /////////////
    /*
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
  */
  });
});