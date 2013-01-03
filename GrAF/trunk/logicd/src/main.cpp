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

#include <array>
#include <iostream>
#include <csignal>

#include <boost/shared_ptr.hpp>
#include <boost/algorithm/string.hpp>

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Weffc++"
#pragma GCC diagnostic ignored "-Wold-style-cast"
#include "zmq.hpp"
#pragma GCC diagnostic pop

#include "message.hpp"
#include "hexdump.hpp"


using namespace std;
typedef boost::shared_ptr<LogicMessage> LogicMessage_ptr;


template<size_t container_size>
class messageCache
{
public:
  typedef array<LogicMessage_ptr, container_size> container_t;
  
  messageCache() :
    container(),
    end_element( 0 ),
    has_wrapped( false )
  {}
  
  size_t end( void ) const
  {
    return end_element;
  }
    
  /**
   * Insert a new message in the cache
   */
  size_t insert( const LogicMessage_ptr& msg )
  {
    const size_t last = has_wrapped ? container_size : end_element;
    
    // delete all older entries of the same destination
    for( size_t i = 0; i != last; i++ )
    {
      if( !container[i] ) // skip already deleted entries
        continue;
      
      if( container[i]->getDestination() == msg->getDestination() )
        container[i] = LogicMessage_ptr(); // delete entry
    }
    
    // and now add the new one
    if( end_element < container_size )
    {
      container[ end_element ] = msg;
      end_element++;
    } else { // wrap around
      container[ 0 ] = msg;
      end_element = 1;
      has_wrapped = true;
    }

    return end_element;
  }
  
  LogicMessage_ptr lookup( const string& dst, const size_t& firstIndex )
  {
    const size_t last = has_wrapped ? container_size : end_element;
    for( size_t i = ((firstIndex > container_size) ? 0 : firstIndex); i != last; i++ )
    {
      if( i == container_size )
        i = 0;
      
      if( !container[i] ) // skip deleted entries
        continue;
      
      if( dst == container[i]->getDestination() )
        return container[i];
    }
    return LogicMessage_ptr(); // nothing found
  }
  
private:
  container_t container;
  size_t      end_element;
  bool        has_wrapped;
};

// helpers for signal handling
static bool running = true;
static void signal_handler( int /*signal_value*/ )
{
  running = false;
}

int main( int /*argc*/, const char */*argv*/[] )
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
  
  // setup the message cache
  messageCache<200> mc;
  
  while( running )
  {
    LogicMessage_ptr msg( new_recieveMessage( socket ) );
    std::cout << "Received [" << msg->getSource() << " -> " << msg->getDestination() << ";" << msg->getIndex() << "] '" << msg->getType() << "' " << msg->getSize() << std::endl;
    std::cout << hexdump( msg->getRaw(), msg->getSize() );
    switch( msg->getType() )
    {
      case variableType::INT:
        std::cout << "INT: " << msg->getInt() << " 0x" << std::hex << msg->getInt() << std::dec << std::endl;
        break;
      case variableType::FLOAT:
        std::cout << "FLOAT: " << msg->getFloat() << std::endl;
        break;
      case variableType::STRING:
        std::cout << "STRING: " << msg->getString() << std::endl;
        break;
      default:
        std::cout << "unknown / default" << std::endl;
    }
    std::cout << std::endl;

    // Send reply back to client
    if( "meta:cacheread" == msg->getDestination() )
    {
      vector<string> addresses;
      string addresses_str = msg->getString();
      boost::split( addresses, addresses_str, boost::is_any_of(",") );
      
      string reply_values;
      bool found_any = false;
      LogicMessage_ptr found;

      for( vector<string>::const_iterator it = addresses.begin(); it != addresses.end(); it++ )
      {
        LogicMessage_ptr found_new = mc.lookup( *it, msg->getIndex() );

        if( nullptr != found_new )
        {
          if( found_any )
            found->send( socket, mc.end(), false );
          found_any = true;
          found = found_new;
        }
      }

      if( found_any )
        found->send( socket, mc.end(), true );
      else
      {
        LogicMessage reply( "NONE" );
        reply.send( socket, mc.end() );
      }
      
      continue; // nothing to broadcast...
    } else {
      LogicMessage reply( "DONE" );
      reply.send( socket );
    }
    
    msg->send( publisher, mc.insert( msg ) ); // broadcast
    //LogicMessage test( "test", "test" );
    //test.send( publisher );
  }
  
  return 0;
}