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
#include <sstream>

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Weffc++"
#pragma GCC diagnostic ignored "-Wold-style-cast"
#include "zmq.hpp"
#pragma GCC diagnostic pop

#include "message.hpp"
#include "hexdump.hpp"

int main( int /*argc*/, char */*argv*/[] )
{
  zmq::context_t context( 1 );
  
  // Socket to talk to server
  zmq::socket_t subscriber( context, ZMQ_SUB );
  subscriber.connect("ipc:///tmp/logicd.messages.ipc");
  
  const char filter[] = "s2l:3";
  subscriber.setsockopt( ZMQ_SUBSCRIBE, filter, strlen(filter) );
  
  // Process 10 updates
  for( int update_nbr = 0; update_nbr < 10; update_nbr++ ) 
  {
    LogicMessage msg = recieveMessage( subscriber );
    std::cout << "Received [" << msg.getDestination() << "] '" << msg.getType() << "' " << msg.getSize() << std::endl;
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
  }

  return 0;
}
