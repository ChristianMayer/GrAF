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

#include "variabletype.hpp"

class LogicMessage
{
public:
  LogicMessage( const std::string& destination_,
                const std::string& source_,
                const zmq::message_t& message )
    : destination( destination_ ),
      source( source_ ),
      size( message.size() ),
      data( new char[size] )
  {
    memcpy( data, message.data(), size );
  }

  LogicMessage( const std::string& destination_,
                const zmq::message_t& message )
    : destination( destination_ ),
      source( "NoSrc" ),
      size( message.size() ),
      data( new char[size] )
  {
    memcpy( data, message.data(), size );
  }
  
  template<typename T>
  explicit LogicMessage( const std::string& destination_,
                         const std::string& source_,
                         const T& value )
    : destination( destination_ ),
      source( source_ ),
      size( metaSize + sizeof( T ) ),
      data( new char[size] )
  {
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::getType<T>();
    *reinterpret_cast<T*>( reinterpret_cast<char*>( data ) + metaSize ) = value;
  }

  template<typename T>
  explicit LogicMessage( const std::string& destination_,
                         const T& value )
    : destination( destination_ ),
      source( "NoSrc" ),
      size( metaSize + sizeof( T ) ),
      data( new char[size] )
  {
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = variableType::getType<T>();
    *reinterpret_cast<T*>( reinterpret_cast<char*>(data) + metaSize ) = value;
  }
  
  explicit LogicMessage( const std::string& destination_,
                         const std::string& source_,
                         const std::string& value )
    : destination( destination_ ),
      source( source_ ),
      size( metaSize + value.length() + 1 ),
      data( new char[size] )
  {
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::STRING;
    memcpy( reinterpret_cast<char*>( data ) + metaSize, value.c_str(), size - metaSize );
  }

  explicit LogicMessage( const std::string& destination_,
                         const std::string& value )
    : destination( destination_ ),
      source( "NoSrc" ),
      size( metaSize + value.length() + 1 ),
      data( new char[size] )
  {
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = variableType::STRING;
    memcpy( reinterpret_cast<char*>(data) + metaSize, value.c_str(), size - metaSize );
  }

  explicit LogicMessage( const std::string& destination_,
                         const std::string& source_,
                         const char* value )
    : destination( destination_ ),
      source( source_ ),
      size( metaSize + std::string( value ).length() + 1 ),
      data( new char[size] )
  {
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::STRING;
    memcpy( reinterpret_cast<char*>( data ) + metaSize, value, size - metaSize );
  }

  explicit LogicMessage( const std::string& destination_,
                         const char* value )
    : destination( destination_ ),
      source( "NoSrc" ),
      size( metaSize + std::string( value ).length() + 1 ),
      data( new char[size] )
  {
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = variableType::STRING;
    memcpy( reinterpret_cast<char*>(data) + metaSize, value, size - metaSize );
  }
  
  ~LogicMessage()
  {
    delete [] (char*)data;
    data = nullptr;
  }
  
  void send( zmq::socket_t& socket ) const
  {
    zmq::message_t dst( destination.length()+1 );
    memcpy((void *) dst.data(), destination.c_str(), destination.length()+1 );
    
    socket.send( dst, ZMQ_SNDMORE );
    
    zmq::message_t src( source.length()+1 );
    memcpy((void *) src.data(), source.c_str(), source.length()+1 );
    
    socket.send( src, ZMQ_SNDMORE );
    
    zmq::message_t request( size );
    memcpy((void *) request.data(), data, size );
    
    socket.send( request );
  }
  
  std::string getDestination( void ) const
  {
    return destination;
  }
  
  std::string getSource( void ) const
  {
    return source;
  }
  
  variableType::type getType( void ) const
  {
    return reinterpret_cast<const messageType*>(data)->type;
  }
  
  size_t getSize( void ) const
  {
    return size;
  }
  
  int getInt( void ) const
  {
    if( variableType::INT == getType() )
      return *reinterpret_cast<int*>( reinterpret_cast<char*>(data) + metaSize );
    
    return 0;
  }
  
  float getFloat( void ) const
  {
    if( variableType::FLOAT == getType() )
      return *reinterpret_cast<float*>( reinterpret_cast<char*>(data) + metaSize );
    
    return 0.0f;
  }
  
  std::string getString( void ) const
  {
    if( variableType::STRING == getType() )
      return std::string( reinterpret_cast<char*>(data) + metaSize );
    
    return "";
  }
  
  void* getRaw( void ) const
  {
    return data;
  }
  
private:
  std::string destination;
  std::string source;
  struct messageType {
    int flags : 8;
    int _rows : 8; // currently unused
    int _cols : 8; // currently unused
    variableType::type type : 8;
  };
  const static size_t metaSize = 8; // 64bit align to content
  
  size_t size;
  void* data;
};

LogicMessage recieveMessage( zmq::socket_t& socket )
{
  int more;
  size_t more_size = sizeof( more );
  
  zmq::message_t destination;
  socket.recv( &destination ); // Wait for next request from client
  std::string dst = (const char*)destination.data();

  zmq_getsockopt( socket, ZMQ_RCVMORE, &more, &more_size );
  assert( 1 == more );

  zmq::message_t source;
  socket.recv( &source );
  std::string src = (const char*)source.data();
  
  zmq_getsockopt( socket, ZMQ_RCVMORE, &more, &more_size );
  assert( 1 == more );

  zmq::message_t content;
  socket.recv( &content );
 
  zmq_getsockopt( socket, ZMQ_RCVMORE, &more, &more_size );
  assert( 0 == more );

  return LogicMessage( dst, src, content );
}
  
#endif // MESSAGE_HPP
