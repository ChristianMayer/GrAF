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
graphs_t graphs;

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
  
  //typedef boost::shared_ptr<LogicEngine> LogicEngine_ptr;
  //vector<LogicEngine_ptr> scriptPool;
  
  // Setup the thread pool
  vector<thread> workers;                // list of the workers
  typedef deque<graphs_t::iterator> tasks_t;
  tasks_t tasks;                         // deque of the tasks to do
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
        //int task;
        tasks_t::value_type task;
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
        logger << "Task: " << task->first << "; state: " << task->second.le->getStateName() << ";\n"; logger.show();
        task->second.le->startLogic();
        logger( Logger::INFO ) << "Task: " << task->first << "; state: " << task->second.le->getStateName() << ";\n"; logger.show();
        task->second.le->scheduleRun();
        //scrstartLogic();iptPool[ task ]->dump( "Task " + to_string( task ) + ": " ); 
        task->second.le->stopLogic();
        logger << "Task: " << task->first << "; state: " << task->second.le->getStateName() << ";\n"; logger.show();
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
    //scriptPool.push_back( LogicEngine_ptr( new LogicEngine( 200, scriptPool.size() ) ) );
    //auto leG1 = scriptPool.back();
    //graphs.insert( make_pair( "G1", Graph( *leG1, test1 ) ) );
    //graphs.insert( make_pair( "G1", move( Graph( test1 ) ) ) ); 
    graphs.insert( make_pair( "G1", Graph( test1 ) ) ); 
    //graphs["G1"] = move( Graph( test1 ) );
    //graphs.insert( { string("G1"), Graph( test1 ) } ); 
    //graphs.emplace( make_pair( "G1", Graph( test1 ) ) ); 
    graphs.at("G1").dump();
    logger << "---------------------------------------\n";
    logger << "test2:" << endl; logger.show();
    //scriptPool.push_back( LogicEngine_ptr( new LogicEngine( 200, scriptPool.size() ) ) );
    //auto leG2 = scriptPool.back();
    //graphs.insert( make_pair( "G2", Graph( *leG2, test2 ) ) ); 
    graphs.insert( make_pair( "G2", Graph( test2 ) ) );
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
        
        logger << "Got message from [" << msg.getDestination() << "]\n"; logger.show();
        logger << "src: '" << msg.getSource() << "' => '" << msg.getVariable().getAsString() << "'\n";logger.show();
        auto message = registry.update( msg.getDestination(), msg.getVariable() );
        if( registry.is_valid( message ) )
        {
          for( auto script = message->second.subscribers.cbegin(); script != message->second.subscribers.cend(); ++script )
          {
            logger << "Running script #" << (*script)->first << ";\n"; logger.show();
            string prefix = "Task " + (*script)->first + ": ";
            //logger << "script #" << (*script)->first << "; state: " << scriptPool[ *script ]->getState() << ";\n"; logger.show();
            logger << "script #" << (*script)->first << "; state: " << (*script)->second.le->getState() << ";\n"; logger.show();
            if( !(*script)->second.le->enableVariables() )
            {
              logger << "enableVariables() failed -> scheduleRerun()\n"; logger.show();
              (*script)->second.le->scheduleRerun();
              return;
            }
            logger << "script #" << (*script)->first << "; state: " << (*script)->second.le->getState() << ";\n"; logger.show();
            (*script)->second.le->scheduleRun( message->second.timestamp );
            
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
      } else {
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