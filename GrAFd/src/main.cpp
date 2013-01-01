/*
 * The Graphic Automation Framework deamon
 * Copyright (C) 2012  Christian Mayer - mail (at) ChristianMayer (dot) de
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#include <iostream>
#include <fstream>
#include <deque>
#include <thread>
#include <mutex>
#include <condition_variable>

#include <boost/shared_ptr.hpp>

#include "globals.h"

#include "message.hpp"
#include "graph.hpp"
#include "graphlib.hpp"
#include "logicengine.hpp"
#include "logic_elements.hpp"
#include "json.hpp"
#include "asyncsocket.hpp"
#include "editorhandler.hpp"

using namespace std;

Logger logger;
MessageRegister registry;
zmq::socket_t *sender;
std::map<std::string, class Graph> graphs;

void setupLogic1( LogicEngine& le ); // FIXME - remove
void setupLogic2( LogicEngine& le ); // FIXME - remove
void setupLogic3( LogicEngine& le ); // FIXME - remove
void setupLogic4( LogicEngine& le ); // FIXME - remove

void showHelp( void )
{
  cout << "Usage: GrAFd [options]\n"
  "\n"
  "The Graphic Automation Framework deamon.\n"
  "\n"
  "Parameters:\n"
  "    -h, --help           This help message\n"
  "    -v, --vebose         Verbose output - repeatable" << endl;
}


int main( int argc, const char *argv[] )
{
  string logicNamespace = "logic";
  int verbose = 0;
  while( argc-- > 1 )
  {
    string parameter( argv[ argc ] );
    
    if     ( parameter == "-h" || parameter == "--help"    )
    {
      showHelp();
      return 0;
    } 
    else if( parameter == "-v" || parameter == "--verbose" )
    {
      verbose++;
    } 
  }
  logger.setLogLevel( static_cast<Logger::logLevels>( verbose ) );
  
  // Setup ASIO
  boost::asio::io_service io_service;
  
  // Setup ZMQ
  zmq::context_t context( 1 );
  zmq::socket_t subscriber( context, ZMQ_SUB );
  subscriber.connect("ipc:///tmp/logicd.messages.ipc");
  subscriber.setsockopt( ZMQ_SUBSCRIBE, "", 0 ); // get all messages
  sender = new zmq::socket_t( context, ZMQ_REQ );
  sender->connect( "ipc:///tmp/logicd.ipc" );
  
  typedef boost::shared_ptr<LogicEngine> LogicEngine_ptr;
  vector<LogicEngine_ptr> scriptPool;
  
  // Setup the thread pool
  vector<thread> workers;                // list of the workers
  deque<int> tasks;                      // deque of the tasks to do
  mutex queue_mutex;
  condition_variable condition;
  bool stop = false;
  const size_t poolSize = 5;
  for( size_t i = 0; i < poolSize; ++i ) // fill thread pool
  {
    workers.push_back( thread( [&,i]()   // create worker thread by a Lambda
    {
      logger( Logger::ALL ) << "thread #" << i << " created;\n";
      logger.show();
      
      while(true)
      {
        int task;
        {
          // acquire lock
          unique_lock<mutex> lock( queue_mutex );

          // look for a work item
          while( !stop && tasks.empty() )
          {
            // if there are none wait for notification
            condition.wait( lock );
          }

          if( stop ) // exit if the pool is stopped
            return;

          // get the task from the queue
          task = tasks.front();
          tasks.pop_front();

        }   // release lock

        // execute the task
        logger << "Task: " << task << "; state: " << scriptPool[ task ]->getStateName() << ";\n"; logger.show();
        scriptPool[ task ]->startLogic();
        logger( Logger::INFO ) << "Task: " << task << "; state: " << scriptPool[ task ]->getStateName() << ";\n"; logger.show();
        scriptPool[ task ]->scheduleRun();
        //scriptPool[ task ]->dump( "Task " + to_string( task ) + ": " ); 
        scriptPool[ task ]->stopLogic();
        logger << "Task: " << task << "; state: " << scriptPool[ task ]->getStateName() << ";\n"; logger.show();
      }
    } ) );
  }
  
  ///////////////////////////////////////////////////////////////////////////
  //
  //  Main loop
  //
  //###################################

  Graph::lib.addPath( "../lib/" );
  ifstream test1( "../test/test1.graf" );
  ifstream test2( "../test/test2.graf" );
  try {
  logger << "---------------------------------------\n";
  logger << "test1:" << endl; logger.show();
  scriptPool.push_back( LogicEngine_ptr( new LogicEngine( 200, scriptPool.size() ) ) );
  auto leG1 = scriptPool.back();
  //Graph G1( *leG1, test1 ); 
  graphs.insert( make_pair( "G1", Graph( *leG1, test1 ) ) ); 
  //(*leG1).dump();
  graphs.at("G1").dump();
  logger << "---------------------------------------\n";
  logger << "test2:" << endl; logger.show();
  scriptPool.push_back( LogicEngine_ptr( new LogicEngine( 200, scriptPool.size() ) ) );
  auto leG2 = scriptPool.back();
  graphs.insert( make_pair( "G2", Graph( *leG2, test2 ) ) ); 
  //(*leG2).dump();
  graphs.at("G2").dump();
}
catch( JSON::parseError e )
{
  int lineNo, errorPos;
  string wrongLine = e.getErrorLine( lineNo, errorPos ) ;
  logger << "!!! caugt error \"" << e.text << "\" in line " << lineNo << " at postion " << errorPos << ":\n";
  logger << "!!! " << wrongLine << "\n";
  logger << "!!!";
  while( 1 < errorPos-- )
    logger << " ";
  logger << "-^-" << endl;
  logger.show();
}


logger << "fin ---------------------------------------\n";logger.show();
  /**/
  scriptPool.push_back( LogicEngine_ptr( new LogicEngine( 200, scriptPool.size() ) ) );
  auto le1 = scriptPool.back();
  setupLogic1( *le1 );
  logger << "LE1:\n" << (*le1).export_noGrAF() << endl; logger.show();
  (*le1).dump();
  logger << "---------------------------------------\n";
  scriptPool.push_back( LogicEngine_ptr( new LogicEngine( 200, scriptPool.size() ) ) );
  auto le2 = scriptPool.back();
  setupLogic2( *le2 );
  logger << "LE2:\n" << (*le2).export_noGrAF() << endl; logger.show();
  (*le2).dump();
  logger << "---------------------------------------\n";
  /**/
  //###################################
  int subscriber_fd;
  size_t sizeof_fd = sizeof( subscriber_fd );
  subscriber.getsockopt( ZMQ_FD, ( void* )&subscriber_fd, &sizeof_fd ); // TODO check return value == 0
  
  AsyncSocket zmq_handler( io_service, subscriber_fd, [&](){
    while( true )
    {
      uint32_t eventState;
      size_t   eventStateSize = sizeof( eventState );
      subscriber.getsockopt( ZMQ_EVENTS, ( void* )&eventState, &eventStateSize ); // TODO check return value == 0
      //DEBUG// cout << "eventState: " << eventState << " (POLLIN: " << ZMQ_POLLIN << ", POLLOUT: " << ZMQ_POLLOUT << ")" << ", eventStateSize: " << eventStateSize << ", sizeof: " << sizeof( eventState ) << "\n";
      
      if( eventState & ZMQ_POLLIN )
      {
        
        LogicMessage msg = recieveMessage( subscriber );
        
        // prevent echo loops by ignoring all packets originating form our namespace
        if( logicNamespace + ":" == msg.getSource().substr( 0, logicNamespace.length()+1 ) )
          return;
        
        //string fullAddress = msg.getDestination();
        logger << "Got message from [" << msg.getDestination() << "]\n"; logger.show();
        logger << "src: '" << msg.getSource() << "' => '" << msg.getVariable().getAsString() << "'\n";logger.show();
        auto message = registry.update( msg.getDestination(), msg.getVariable() );
        if( registry.is_valid( message ) )
        {
          for( auto script = message->second.subscribers.cbegin(); script != message->second.subscribers.cend(); ++script )
          {
            logger << "Running script #" << *script << ";\n"; logger.show();
            string prefix = "Task " + to_string( *script ) + ": ";
            logger << "script #" << *script << "; state: " << scriptPool[ *script ]->getState() << ";\n"; logger.show();
            if( !scriptPool[ *script ]->enableVariables() )
            {
              logger << "enableVariables() failed -> scheduleRerun()\n"; logger.show();
              scriptPool[ *script ]->scheduleRerun();
              //scriptPool[ *script ]->dump( prefix );
              return;
            }
            logger << "script #" << *script << "; state: " << scriptPool[ *script ]->getState() << ";\n"; logger.show();
            scriptPool[ *script ]->scheduleRun( message->second.timestamp );
            //scriptPool[ *script ]->copyImportedVariables( message->second.timestamp );
            //scriptPool[ *script ]->dump( prefix ); 
            
            // add script to task que
            { 
              // acquire lock
              unique_lock<mutex> lock( queue_mutex );
              
              // add the task
              tasks.push_back( *script );
            } // release lock
            
            // wake up one thread
            condition.notify_one();
            
          }
        } else {
          logger << "not valid\n"; logger.show();
        }
      }
    //}
    else
    {
      break;
    }
  }
  logger << "Message from ZMQ handled. Callback ende.\n"; logger.show();  
  });
  
  EditorHandler editor_handler( io_service, 9998 );
  logger << "!!!!! start main loop\n"; logger.show();

  try {
    io_service.run();
  }
  catch( std::exception& e )
  {
    std::cerr << "Exception in io_service: '" << e.what() << "'" << std::endl;
  }

  ///////////////////////////////////////////////////////////////////////////
  //
  //  clean up
  //
  
  // stop all threads
  stop = true;
  condition.notify_all();
  
  // and join them
  for( size_t i = 0; i < workers.size(); ++i )
    workers[ i ].join();
  
  delete sender;
  
  return 0;
}

// $ ./GrAFd | egrep "pos_x|pos_y|cnt|totCnt|curd 's/(.*: //' | tr -d '\n' | sed 's/pos_x/\n/g' | sed 's/pos_y/,/' | sed 's/totCnt/,/' | sed 's/cnt/ ->/' | sed 's/cur_x/ (/' | sed 's/cur_y/,/'

void setupLogic1( LogicEngine& le )
{
  raw_offset_t bar = le.importVariable<int>( "bar" );
  raw_offset_t baz = le.importVariable<int>( "baz" );
  
  raw_offset_t one    = le.registerVariable<int>( "one"    );
  raw_offset_t two    = le.registerVariable<int>( "two"    );
  raw_offset_t tmp    = le.registerVariable<int>( "tmp"    );
  le.addElement( new LogicElement_Const<int>( one   ,  1   ) );
  le.addElement( new LogicElement_Const<int>( two   ,  2   ) );
  le.addElement( new LogicElement_Mul<int>( tmp, bar, two ) ); // x*y
  le.addElement( new LogicElement_Sleep( baz ) );
  le.addElement( new LogicElement_Send<int>( tmp, "blub" ) );
}

void setupLogic2( LogicEngine& le )
{
  le.importVariable< variableType::typeOf<variableType::INT>::type >( "baz" );
}

void setupLogic4( LogicEngine& le )
{
  /*
   *  int *to    = (int*)le.globVar + sizeof(int*);
   *  int *from1 = (int*)(le.globVar + sizeof(int*) + sizeof(int));
   *  int *from2 = (int*)(le.globVar + sizeof(int*) + 2*sizeof(int));
   *  cout << "g:" << ((int*)le.globVar) << ", t:" << to << ", f1:" << from1 << ", f2:" << from2 << " (s(int):" << sizeof(int) << ")" << endl;
   */
  typedef float flt;
  raw_offset_t min_x  = le.registerVariable<flt>( "min_x"  );
  raw_offset_t max_x  = le.registerVariable<flt>( "max_x"  );
  raw_offset_t step_x = le.registerVariable<flt>( "step_x" );
  raw_offset_t pos_x  = le.registerVariable<flt>( "pos_x"  );
  raw_offset_t cur_x  = le.registerVariable<flt>( "cur_x"  );
  raw_offset_t tmp_x  = le.registerVariable<flt>( "tmp_x"  );
  raw_offset_t min_y  = le.registerVariable<flt>( "min_y"  );
  raw_offset_t max_y  = le.registerVariable<flt>( "max_y"  );
  raw_offset_t step_y = le.registerVariable<flt>( "step_y" );
  raw_offset_t pos_y  = le.registerVariable<flt>( "pos_y"  );
  raw_offset_t cur_y  = le.registerVariable<flt>( "cur_y"  );
  raw_offset_t tmp_y  = le.registerVariable<flt>( "tmp_y"  );
  raw_offset_t totCnt = le.registerVariable<int>( "totCnt" );
  raw_offset_t cnt    = le.registerVariable<int>( "cnt"    );
  raw_offset_t maxCnt = le.registerVariable<int>( "maxCnt" );
  raw_offset_t one    = le.registerVariable<int>( "one"    );
  raw_offset_t two    = le.registerVariable<flt>( "two"    );
  raw_offset_t four   = le.registerVariable<flt>( "four"   );
  raw_offset_t tmpRel = le.registerVariable<int>( "tmpRel" );
  raw_offset_t tmp    = le.registerVariable<flt>( "tmp"    );
  
  le.addElement( new LogicElement_Const<flt>( min_x , -2.0 ) );
  le.addElement( new LogicElement_Const<flt>( max_x ,  1.0 ) );
  le.addElement( new LogicElement_Const<flt>( step_x,  0.01f ) );
  le.addElement( new LogicElement_Const<flt>( min_y , -1.0 ) );
  le.addElement( new LogicElement_Const<flt>( max_y ,  1.0 ) );
  le.addElement( new LogicElement_Const<flt>( step_y,  0.01f ) );
  le.addElement( new LogicElement_Const<int>( totCnt,  0   ) ); // number of pixels within
  le.addElement( new LogicElement_Const<int>( maxCnt,  100 ) );
  le.addElement( new LogicElement_Const<int>( one   ,  1   ) );
  le.addElement( new LogicElement_Const<flt>( two   ,  2.0 ) );
  le.addElement( new LogicElement_Const<flt>( four  ,  4.0 ) );
  
  //LogicElement_Generic** startPoint = le.nextElementPosition();
  
  le.addElement( new LogicElement_Move<flt>( pos_x, min_x ) ); // init for(x)
  LogicElement_Generic** x_LoopStart = le.nextElementPosition();
  le.addElement( new LogicElement_Move<flt>( pos_y, min_y ) ); // init for(y)
  LogicElement_Generic** y_LoopStart = le.nextElementPosition();
  
  le.addElement( new LogicElement_Move<flt>( cur_x, le.ground() ) );
  le.addElement( new LogicElement_Move<flt>( cur_y, le.ground() ) );
  le.addElement( new LogicElement_Move<int>( cnt, le.ground() ) ); // init for(inner)
  LogicElement_Generic** cnt_LoopStart = le.nextElementPosition();
  
  /*
   *  xt = x * x - y * y + cx
   *  yt = 2 * x * y + cy
   *  x = xt
   *  y = yt
   *  iter = iter + 1
   *  betrag_quadrat = x * x + y * y
   */
  le.addElement( new LogicElement_Move<flt>( tmp_x, pos_x ) );
  le.addElement( new LogicElement_MulAdd<flt>( tmp_x, cur_x, cur_x ) ); // +x*x
  le.addElement( new LogicElement_MulSub<flt>( tmp_x, cur_y, cur_y ) ); // -y*y
  le.addElement( new LogicElement_Move<flt>( tmp_y, pos_y ) );
  le.addElement( new LogicElement_Mul<flt>( tmp, cur_x, cur_y ) ); // x*y
  le.addElement( new LogicElement_MulAdd<flt>( tmp_y, two, tmp ) ); // +2*tmp
  le.addElement( new LogicElement_Move<flt>( cur_x, tmp_x ) );
  le.addElement( new LogicElement_Move<flt>( cur_y, tmp_y ) );
  le.addElement( new LogicElement_Mul<flt>( tmp, cur_x, cur_x ) ); // x*x
  le.addElement( new LogicElement_MulAdd<flt>( tmp, cur_y, cur_y ) ); // +y*y
  
  //le.addElement( new LogicElement_Dump( le ) );
  
  le.addElement( new LogicElement_Rel<int, flt>( tmpRel, tmp, four, LogicElement_Rel<int, flt>::GREATER ) );
  le.addElement( new LogicElement_JumpTrue<int>( 6, tmpRel ) ); // if x*x+y*y > 4.0 => jump after totCnt++
  le.addElement( new LogicElement_Rel<int, flt>( tmpRel, cnt, maxCnt, LogicElement_Rel<int, flt>::GREATER ) );
  le.addElement( new LogicElement_JumpTrue<int>( 3, tmpRel ) ); // if cnt > maxCnt => jump to totCnt++
  
  le.addElement( new LogicElement_Sum<int>( cnt, cnt, one ) ); // step for inner
  int offsetTostartForLoops = le.nextElementPosition() - cnt_LoopStart;
  le.addElement( new LogicElement_Jump( -offsetTostartForLoops ) ); // for(inner)
  
  le.addElement( new LogicElement_Sum<int>( totCnt, totCnt, one ) ); // increase final result counter
  
  le.addElement( new LogicElement_Sum<flt>( pos_y, pos_y, step_y ) ); // step for y
  le.addElement( new LogicElement_Rel<int, flt>( tmpRel, pos_y, max_y, LogicElement_Rel<int, flt>::LESSEQUAL ) );
  offsetTostartForLoops = le.nextElementPosition() - y_LoopStart;
  le.addElement( new LogicElement_JumpTrue<int>( -offsetTostartForLoops, tmpRel ) ); // if y <= max_y continung for(y)
  
  le.addElement( new LogicElement_Sum<flt>( pos_x, pos_x, step_x ) ); // step for x
  le.addElement( new LogicElement_Rel<int, flt>( tmpRel, pos_x, max_x, LogicElement_Rel<int, flt>::LESSEQUAL ) );
  offsetTostartForLoops = le.nextElementPosition() - x_LoopStart;
  le.addElement( new LogicElement_JumpTrue<int>( -offsetTostartForLoops, tmpRel ) ); // if x <= max_x continung for(x)
  
  //le.addElement( new LogicElement_Const<int>( to, 0 ) );
  /*
   *  le.addElement( new LogicElement_Sum<int>( to, from1, from2 ) );
   *  le.addElement( new LogicElement_Sum<float>( tof, from1f, from2f ) );
   *  le.addElement( new LogicElement_Jump( 2 ) );
   *  le.addElement( new LogicElement_Stop() );
   *  le.addElement( new LogicElement_Mul<int>( from1, to, from2 ) );
   *  le.addElement( new LogicElement_Jump( -2 ) );
   */
  
  //le.addElement( new LogicElement_Sum<int>( to, to, from1 ) );
  //le.addElement( new LogicElement_JumpNotEqual<int>( -1, to, from2 ) );
  //le.addElement( new LogicElement_Rel<int, float>( to, from1f, from2f, LogicElement_Rel<int, float>::GREATER ) );
  //*from1 = 1;
  //*from2 = 2;
  //cout << "MAIN: to: " << le.read<int>(to) << ", from1: " << le.read<int>(from1) << ", from2: " << le.read<int>(from2) << endl;
  //le.dump();
  
  le.run();
  
  /*
   *  //cout << "MAIN: to: " << le.read<int>(to) << ", from1: " << le.read<int>(from1) << ", from2: " << le.read<int>(from2) << endl;
   *  le.dump();
   *  
   *  le.run( startPoint );
   *  
   *  cout << "MAIN: to: " << le.read<int>(to) << ", from1: " << le.read<int>(from1) << ", from2: " << le.read<int>(from2) << endl;
   *  le.dump();
   *  
   *  cout << le.readString<int  >(to) << endl;
   *  cout << le.readString<float>(to) << endl;
   *  cout << le.readString<char >(to) << endl;
   *  cout << le.readString(to) << endl;
   *  cout << "sizeof(float): " << sizeof(float) << endl;
   */
  /*
   *  std::cout << "Hello, 2 w orld!" << std::endl;
   *  std::cout << "sizeof: " << sizeof( Message ) 
   *  << "; total: " << Message::messageSize
   *  << "; dataLength: " << Message::dataLength
   *  << "; Header: " << Message::messageSize-Message::dataLength
   *  << "; Header: " << Message::fixedSegmentLength
   *  << "; timeeval: " << sizeof(timeval)
   *  << "; time_t: " << sizeof(time_t)
   *  << "; suseconds_t: " << sizeof(suseconds_t)
   *  << std::endl;
   */
  /*
   *  suseconds_t usmax = 0;
   *  for( int i = 0; i < 1 ; i++)
   *  {
   *    //struct timezone {
   *    //  int tz_minuteswest;     // minutes west of Greenwich 
   *    //  int tz_dsttime;         // type of DST correction 
   *    //};
   *    
   *    timeval t;
   *    //timezone tz;
   *    gettimeofday( &t, NULL );
   *    if( usmax < t.tv_usec ) usmax = t.tv_usec;
   *    std::cout << i << ": " << t.tv_usec << " (" << usmax << ")" <<std::endl;
   *    for( int j=0;j<1000000;j++) ;
   }
   */
  
  //cout << le.export_noGrAF();
  
  ofstream myofile;
  myofile.open ("/tmp/example.nograf");
  myofile << le.export_noGrAF();
  myofile.close();
  
  ifstream myifile;
  myifile.open ("/tmp/example.nograf");
  le.import_noGrAF( myifile );
  myifile.close();
  
  cout << le.export_noGrAF();
  cout << le.readString<int  >(totCnt) << endl;
  
  le.run();
  cout << le.readString<int  >(totCnt) << endl;
}