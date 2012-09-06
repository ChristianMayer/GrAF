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


#ifndef MESSAGE_HPP
#define MESSAGE_HPP

#include "zmq.hpp"

class LogicMessage
{
public:
  enum message_t
  {
    UNKOWN = 0,
    INT    = 1,
    FLOAT  = 2,
    STRING = 3
  };
  
  LogicMessage( const std::string& address_, const zmq::message_t& message ) : address( address_ ), size( message.size() ), data( new char[size] )
  {
    memcpy( data, message.data(), size );
  }
  
  explicit LogicMessage( const std::string& address_, const int& value ) : address( address_ ), size( metaSize + sizeof( int ) ), data( new char[size] )
  {
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = INT;
    *reinterpret_cast<int*>( reinterpret_cast<char*>(data) + metaSize ) = value;
  }
  
  explicit LogicMessage( const std::string& address_, const float& value ) : address( address_ ), size( metaSize + sizeof( float ) ), data( new char[size] )
  {
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = FLOAT;
    *reinterpret_cast<float*>( reinterpret_cast<char*>(data) + metaSize ) = value;
  }
  
  explicit LogicMessage( const std::string& address_, std::string value ) : address( address_ ), size( metaSize + value.length()+1 ), data( new char[size] )
  {
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = STRING;
    memcpy( reinterpret_cast<char*>(data) + metaSize, value.c_str(), value.length()+1 );
  }
  
  ~LogicMessage()
  {
    delete [] (char*)data;
    data = nullptr;
  }
  
  void send( zmq::socket_t& socket ) const
  {
    zmq::message_t addr( address.length()+1 );
    memcpy((void *) addr.data(), address.c_str(), address.length()+1 );
    socket.send( addr, ZMQ_SNDMORE );
    zmq::message_t request( size );
    memcpy((void *) request.data(), data, size );
    socket.send( request );
  }
  
  std::string getAddress( void ) const
  {
    return address;
  }
  
  message_t getType( void ) const
  {
    return reinterpret_cast<const messageType*>(data)->type;
  }
  
  size_t getSize( void ) const
  {
    return size;
  }
  
  int getInt( void ) const
  {
    if( INT == getType() )
      return *reinterpret_cast<int*>( reinterpret_cast<char*>(data) + metaSize );
    
    return 0;
  }
  
  float getFloat( void ) const
  {
    if( FLOAT == getType() )
      return *reinterpret_cast<float*>( reinterpret_cast<char*>(data) + metaSize );
    
    return 0.0f;
  }
  
  std::string getString( void ) const
  {
    if( STRING == getType() )
      return std::string( reinterpret_cast<char*>(data) + metaSize );
    
    return "";
  }
  
  void* getRaw( void ) const
  {
    return data;
  }
  
private:
  std::string address;
  struct messageType {
    int flags : 8;
    int _rows : 8; // currently unused
    int _cols : 8; // currently unused
    message_t type : 8;
  };
  const static size_t metaSize = 8; // 64bit align to content
  
  size_t size;
  void* data;
};

LogicMessage recieveMessage( zmq::socket_t& socket )
{
  zmq::message_t request;
  
  // Wait for next request from client
  socket.recv( &request );
  
  std::string address = (const char*)request.data();
  int64_t more;
  size_t more_size = sizeof( more );
  zmq_getsockopt( socket, ZMQ_RCVMORE, &more, &more_size );
  assert( more );
  
  zmq::message_t request2;
  socket.recv( &request2 );
  return LogicMessage( address, request2 );
}
  
#endif // MESSAGE_HPP
