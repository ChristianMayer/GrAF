/*
 *    Logic engine
 *    Copyright (C) 2012  Christian Mayer <mail at ChristianMayer dot de>
 * 
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 * 
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 * 
 *    You should have received a copy of the GNU General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


#include <iostream>
#include <csignal>

#include "zmq.hpp"

#include "message.hpp"
#include "hexdump.hpp"


using namespace std;

// helpers for signal handling
static bool running = true;
static void signal_handler( int /*signal_value*/ )
{
  running = false;
}

int main ( int argc, const char *argv[] )
{
  // catch signals
  struct sigaction action;
  action.sa_handler = signal_handler;
  action.sa_flags = 0;
  sigemptyset( &action.sa_mask );
  sigaction( SIGINT, &action, NULL );
  sigaction( SIGTERM, &action, NULL );
  
  // Prepare our context and publisher
  zmq::context_t context( 1 ); // one thead is enough
  zmq::socket_t publisher( context, ZMQ_PUB ); // the broadcast
  publisher.bind( "ipc:///tmp/logicd.messages.ipc" );
  zmq::socket_t socket( context, ZMQ_REP );    // the 1:1
  socket.bind( "ipc:///tmp/logicd.ipc" );
  
  while( running )
  {
    LogicMessage msg = recieveMessage( socket );
    std::cout << "Received [" << msg.getSource() << " -> " << msg.getDestination() << "] '" << msg.getType() << "' " << msg.getSize() << std::endl;
    std::cout << hexdump( msg.getRaw(), msg.getSize() );
    switch( msg.getType() )
    {
      case variableType::INT:
        std::cout << "INT: " << msg.getInt() << " 0x" << std::hex << msg.getInt() << std::dec << std::endl;
        break;
      case variableType::FLOAT:
        std::cout << "FLOAT: " << msg.getFloat() << std::endl;
        break;
      case variableType::STRING:
        std::cout << "STRING: " << msg.getString() << std::endl;
        break;
      default:
        std::cout << "unknown / default" << std::endl;
    }
    std::cout << std::endl;

    // Do some 'work'
    //sleep( 1 );
    
    // Send reply back to client
    LogicMessage reply( "LE", "DONE" );
    reply.send( socket );
    
    msg.send( publisher ); // broadcast
    //LogicMessage test( "test", "test" );
    //test.send( publisher );
  }
  
  return 0;
}