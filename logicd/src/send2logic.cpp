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

#include <string>
#include <iostream>

#include "zmq.hpp"

#include "message.hpp"
#include "hexdump.hpp"

int main( int argc, const char *argv[] )
{
  // Prepare our context and socket
  zmq::context_t context( 1 );
  zmq::socket_t socket( context, ZMQ_REQ );
  
  std::cout << "Connecting to loigc server..." << std::endl;
  socket.connect( "ipc:///tmp/logicd.ipc" );
  
  {
    LogicMessage msg( "s2l:1", 0x4711 );
    std::cout << "Sending INT " << std::endl << hexdump( msg.getRaw(), msg.getSize() );
    msg.send( socket );
    // Get the reply.
    std::cout << "..." << std::endl;
    LogicMessage reply = recieveMessage( socket );
    std::cout << "Received reply " << std::endl;
  }
  
  {
    LogicMessage msg( "s2l:2", 0.4711f );
    std::cout << "Sending FLOAT…" << std::endl << hexdump( msg.getRaw(), msg.getSize() );
    msg.send( socket );
    std::cout << "..." << std::endl;
    LogicMessage reply = recieveMessage( socket );
    std::cout << "Received reply " << std::endl;
  }
  
  {
    LogicMessage msg( "s2l:30", "abc" );
    std::cout << "Sending STRING…" << std::endl << hexdump( msg.getRaw(), msg.getSize() );
    msg.send( socket );
    std::cout << "..." << std::endl;
    LogicMessage reply = recieveMessage( socket );
    std::cout << "Received reply " << std::endl;
  }
  
  {
    LogicMessage msg( "s2l:31", "abc345" );
    std::cout << "Sending STRING…" << std::endl << hexdump( msg.getRaw(), msg.getSize() );
    msg.send( socket );
    std::cout << "..." << std::endl;
    LogicMessage reply = recieveMessage( socket );
    std::cout << "Received reply " << std::endl;
  }
  
  {
    LogicMessage msg( "s2l:32", "abc345d7abc345d7" );
    std::cout << "Sending STRING…" << std::endl << hexdump( msg.getRaw(), msg.getSize() );
    msg.send( socket );
    std::cout << "..." << std::endl;
    LogicMessage reply = recieveMessage( socket );
    std::cout << "Received reply " << std::endl;
  }

  return 0;
}
