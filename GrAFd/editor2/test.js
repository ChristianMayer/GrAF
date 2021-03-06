$(function(){
  
b1 = GLE.addBlock(); 
b1.setName( 'b1 viel Text üypIµ| viel Text b1' );
b1.setInPorts( ['in1', 'in2'] );

b2 = GLE.addBlock(); 
b2.setTopLeft( new Vec2D( 300, 350 ) );
b2.setName( 'b2' );
b2.setInPorts( ['in1', 'in2', 'in3'] );
b2.setOutPorts( ['out1', 'out2'] );

b3 = GLE.addBlock(); 
b3.setTopLeft( new Vec2D( 100, 350 ) );
b3.setName( 'b3' );

b4 = GLE.addBlock(); 
b4.setTopLeft( new Vec2D( 400, 50 ) );
b4.setName( 'b4' );

c1 = GLE.addConnection();
c1.insertWaypoint( new Vec2D( 300, 100 ) );
c1.insertWaypoint( new Vec2D( 200, 200 ) );
c1.insertWaypoint( new Vec2D( 300, 200 ), 1 );
c1.waypoints[1].protected = true;

c2 = GLE.addConnection();
c2.insertWaypoint( new Vec2D( 400, 400 ) );
c2.insertWaypoint( new Vec2D( 450, 420 ) );

c3 = GLE.addConnection();
c3.insertWaypoint( new Vec2D( 400, 400 ) );
c3.insertWaypoint( new Vec2D( 450, 400 ) );

c4 = GLE.addConnection();
c4.insertWaypoint( new Vec2D( 400, 400 ) );
c4.insertWaypoint( new Vec2D( 450, 450 ) );

c5 = GLE.addConnection();
c5.insertWaypoint( new Vec2D( 400, 400 ) );
c5.insertWaypoint( new Vec2D( 400, 450 ) );

c6 = GLE.addConnection(); // mark the middle...
c6.insertWaypoint( new Vec2D( 350/2, 250/2 ) );
c6.insertWaypoint( new Vec2D( 420/2, 320/2 ) );
c6.insertWaypoint( new Vec2D( 350/2, 320/2 ) );
c6.insertWaypoint( new Vec2D( 420/2, 250/2 ) );

GLE.updateContentSize();
});

function button1()
{
  //alert( 'b1' );
  jQuery.event.trigger({ type : 'keydown', keyCode : 82 });
  //GLE.zoomIn();
}
function button2()
{
  //alert( 'b2' );
  jQuery.event.trigger({ type : 'keydown', keyCode : 86 });
  //GLE.zoomOut();
}

function showProps( props )
{
  //return;
  var content = '<tr><th>Name</th><th>Value</th></tr>';
  for( var i = 0; i < props.length; i++ )
  {
    content += '<tr class="propRow'+(i%2)+'"><td>' + props[i][0] + '</td><td>' + props[i][1] + '</td></tr>';
  }
  $('#props').find('table').html( content );
}

//////////////////////////////////////////////////////////////////
var myWorker = {};//new Worker("lib/autorouter.js");
 
myWorker.onmessage = function (oEvent) {
  console.log("Called back by the worker! '" + oEvent.data + "'", oEvent.data );
  globalMsg = oEvent.data;
};
myWorker.onerror = function(event) {
  console.log(event);
};

//myWorker.postMessage(""); // start the worker.
//////////////////////////////////////////////////////////////////
if( undefined === console )
  console = {};
if( undefined === console.log )
  console.log = function() {};