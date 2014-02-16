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
});

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