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
/*
#include <deque>
#include <thread>
#include <mutex>
#include <condition_variable>
*/

#include <boost/shared_ptr.hpp>

#include "globals.h"
#include "utilities.hpp"

#include "message.hpp"
#include "graph.hpp"
#include "graphlib.hpp"
#include "logicengine.hpp"
#include "logic_elements.hpp"
#include "json.hpp"
#include "asyncsocket.hpp"
#include "editorhandler.hpp"
#include "worker.hpp"

using namespace std;

Logger logger;
MessageRegister registry;
zmq::socket_t *sender;
graphs_t graphs;
Worker* worker;

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
  size_t poolSize = 5;
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
  
  // Setup the thread pool
  assert_main_thread( true ); // initalize assert
  worker = new Worker( poolSize );
  
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
    //scriptPool.push_back( LogicEngine_ptr( new LogicEngine( 200, scriptPool.size() ) ) );
    //auto leG1 = scriptPool.back();
    //graphs.insert( make_pair( "G1", Graph( *leG1, test1 ) ) );
    //graphs.insert( make_pair( "G1", move( Graph( test1 ) ) ) ); 
    auto G1 = graphs.insert( make_pair( "G1", Graph( test1 ) ) ); 
    //graphs["G1"] = move( Graph( test1 ) );
    //graphs.insert( { string("G1"), Graph( test1 ) } ); 
    //graphs.emplace( make_pair( "G1", Graph( test1 ) ) ); 
    graphs.at("G1").dump();
    graphs.at("G1").init( io_service );
    logger << "---------------------------------------\n";
    logger << "test2:" << endl; logger.show();
    //scriptPool.push_back( LogicEngine_ptr( new LogicEngine( 200, scriptPool.size() ) ) );
    //auto leG2 = scriptPool.back();
    //graphs.insert( make_pair( "G2", Graph( *leG2, test2 ) ) ); 
    graphs.insert( make_pair( "G2", Graph( test2 ) ) );
    graphs.at("G2").dump();
    graphs.at("G2").init( io_service );
  }
  catch( JSON::parseError e )
  {
    int lineNo, errorPos;
    string wrongLine = e.getErrorLine( lineNo, errorPos ) ;
    logger << "!!! caugt error \"" << e.text << "\" in line " << lineNo << " at postion " << errorPos << " (" << e.sourceFile << ":" << e.sourceLineNo << "):\n";
    logger << "!!! " << wrongLine << "\n";
    logger << "!!!";
    while( 1 < errorPos-- )
      logger << " ";
    logger << "-^-" << endl;
    logger.show();
  }
  logger << "fin ---------------------------------------\n";logger.show();
 //###################################
  int subscriber_fd;
  size_t sizeof_fd = sizeof( subscriber_fd );
  subscriber.getsockopt( ZMQ_FD, static_cast<void *>(&subscriber_fd), &sizeof_fd ); // TODO check return value == 0
  
  AsyncSocket zmq_handler( io_service, subscriber_fd, [&](){
    while( true )
    {
      uint32_t eventState;
      size_t   eventStateSize = sizeof( eventState );
      subscriber.getsockopt( ZMQ_EVENTS, static_cast<void *>(&eventState), &eventStateSize ); // TODO check return value == 0
      
      if( eventState & ZMQ_POLLIN )
      {
        
        LogicMessage msg = recieveMessage( subscriber );
        
        // prevent echo loops by ignoring all packets originating form our namespace
        if( logicNamespace + ":" == msg.getSource().substr( 0, logicNamespace.length()+1 ) )
          return;
        
        logger << "ZMQ - Got message from [" << msg.getDestination() << "]\n"; logger.show();
        logger << "ZMQ - src: '" << msg.getSource() << "' => '" << msg.getVariable().getAsString() << "'\n";logger.show();
        auto message = registry.update( msg.getDestination(), msg.getVariable() );
        if( registry.is_valid( message ) )
        {
          for( auto script = message->second.subscribers.cbegin(); script != message->second.subscribers.cend(); ++script )
          {
            //logger << "Running script #" << (*script)->first << ";\n"; logger.show();
            //string prefix = "Task " + (*script)->first + ": ";
            //logger << "script #" << (*script)->first << "; state: " << scriptPool[ *script ]->getState() << ";\n"; logger.show();
            logger << "ZMQ - 1: script #" << (*script).first << "; state: " << (*script).first->getStateName() << ";\n"; logger.show();
            if( !(*script).first->enableVariables() || !(*script).first->startLogic() )
            {
              logger << "ZMQ - enableVariables() failed -> scheduleRerun()\n"; logger.show();
              (*script).first->scheduleRerun();
              return;
            }
            logger << "ZMQ - 2: script #" << script->first << "; state: " << (*script).first->getStateName() << ";\n"; logger.show();
            (*script).first->scheduleRun( message->second.timestamp );
            logger << "ZMQ - 3: script #" << script->first << "; state: " << (*script).first->getStateName() << ";\n"; logger.show();
            
            worker->enque_task( script->first );
          }
        } else {
          logger << "ZMQ - not valid\n"; logger.show();
        }
      } else {
        break;
      }
    }
    logger << "ZMQ - Message from ZMQ handled. Callback ende.\n"; logger.show();  
  });
  
  EditorHandler editor_handler( io_service, 9998 );
  logger << 
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
    "!!!!!!!!!! start main loop !!!!!!!!!!\n"
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"; logger.show();

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
  
  // stop all threads and join them:
  delete worker; // the destructor does all of that for us
  
  delete sender;

  
  return 0;
}