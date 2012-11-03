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

#include <vector>

#include <boost/shared_ptr.hpp>

#include "zmq.hpp"

#include "variabletype.hpp"

class LogicMessage
{
public:
  typedef boost::shared_ptr<LogicMessage> shared_ptr;
  
  /**
   * Default constructor - creates a neutral message that also could mean "ACK"
   */
  LogicMessage( const std::string& info = "" )
    : destination( info ),
      source( "" ),
      size( metaSize ),
      data( new uint8_t[size] )
  {
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::UNKNOWN;
  }
  
  LogicMessage( const std::string& destination_,
                const std::string& source_,
                const zmq::message_t& message )
    : destination( destination_ ),
      source( source_ ),
      size( message.size() ),
      data( new uint8_t[size] )
  {
    memcpy( data, message.data(), size );
  }

  LogicMessage( const std::string& destination_,
                const zmq::message_t& message )
    : destination( destination_ ),
      source( "NoSrc" ),
      size( message.size() ),
      data( new uint8_t[size] )
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
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::getType<T>();
    *reinterpret_cast<T*>( reinterpret_cast<uint8_t*>( data ) + metaSize ) = value;
  }

  template<typename T>
  explicit LogicMessage( const std::string& destination_,
                         const T& value )
    : destination( destination_ ),
      source( "NoSrc" ),
      size( metaSize + sizeof( T ) ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = variableType::getType<T>();
    *reinterpret_cast<T*>( reinterpret_cast<uint8_t*>(data) + metaSize ) = value;
  }
  
  explicit LogicMessage( const std::string& destination_,
                         const std::string& source_,
                         const std::string& value )
    : destination( destination_ ),
      source( source_ ),
      size( metaSize + value.length() + 1 ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::STRING;
    memcpy( reinterpret_cast<uint8_t*>( data ) + metaSize, value.c_str(), size - metaSize );
  }

  explicit LogicMessage( const std::string& destination_,
                         const std::string& value )
    : destination( destination_ ),
      source( "NoSrc" ),
      size( metaSize + value.length() + 1 ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = variableType::STRING;
    memcpy( reinterpret_cast<uint8_t*>(data) + metaSize, value.c_str(), size - metaSize );
  }

  explicit LogicMessage( const std::string& destination_,
                         const std::string& source_,
                         const char* value )
    : destination( destination_ ),
      source( source_ ),
      size( metaSize + std::string( value ).length() + 1 ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::STRING;
    memcpy( reinterpret_cast<uint8_t*>( data ) + metaSize, value, size - metaSize );
  }

  explicit LogicMessage( const std::string& destination_,
                         const char* value )
    : destination( destination_ ),
      source( "NoSrc" ),
      size( metaSize + std::string( value ).length() + 1 ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = variableType::STRING;
    memcpy( reinterpret_cast<uint8_t*>(data) + metaSize, value, size - metaSize );
  }

  explicit LogicMessage( const std::string& destination_,
                         const std::string& source_,
                         const variable_t& value )
    : destination( destination_ ),
      source( source_ ),
      size( metaSize + value.getSize () ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = value.getType();
    switch( value.getType() )
    {
      case variableType::INT:
        *reinterpret_cast<int*>( reinterpret_cast<uint8_t*>( data ) + metaSize ) = value.getInt();
        break;
        
      case variableType::FLOAT:
        *reinterpret_cast<float*>( reinterpret_cast<uint8_t*>( data ) + metaSize ) = value.getFloat();
        break;
        
      case variableType::STRING:
        memcpy( reinterpret_cast<uint8_t*>( data ) + metaSize, value.getString().c_str(), size - metaSize );
        break;
        
      case variableType::UNKNOWN:
      default:
        *reinterpret_cast<int*>( reinterpret_cast<uint8_t*>( data ) + metaSize ) = 0;
        break;
    }
  }
  
  ~LogicMessage()
  {
    delete [] (uint8_t*)data;
    data = nullptr;
  }
  
  /**
   * Check if it is an empty message, e.g. an ACK
   */
  bool isEmpty( void ) const
  {
    return ("" == destination) && (size == metaSize);
  }
  
  /**
   * Send message over the socket.
   */
  void send( zmq::socket_t& socket, const size_t& index = invalidIndex, bool last = true ) const
  {
    reinterpret_cast<messageType*>( data )->index = index;
    
    zmq::message_t dst( destination.length()+1 );
    memcpy((void *) dst.data(), destination.c_str(), destination.length()+1 );
    
    socket.send( dst, ZMQ_SNDMORE );
    
    zmq::message_t src( source.length()+1 );
    memcpy((void *) src.data(), source.c_str(), source.length()+1 );
    
    socket.send( src, ZMQ_SNDMORE );
    
    zmq::message_t request( size );
    memcpy((void *) request.data(), data, size );
    
    socket.send( request, last ? 0 : ZMQ_SNDMORE );
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
  
  size_t getIndex( void ) const
  {
    return reinterpret_cast<messageType*>( data )->index;
  }
  
  bool hasInvalidIndex( void ) const
  {
    return invalidIndex == reinterpret_cast<messageType*>( data )->index;
  }
  
  size_t getSize( void ) const
  {
    return size;
  }
  
  variable_t getVariable( void ) const
  {
    switch( getType() )
    {
      case variableType::INT:
        return variable_t( getInt() );
        
      case variableType::FLOAT:
        return variable_t( getFloat() );
        
      case variableType::STRING:
        return variable_t( getString() );
        
      default:
      case variableType::UNKNOWN:
        return variable_t();
    }
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
    uint8_t flags;
    uint8_t _rows; // currently unused
    uint8_t _cols; // currently unused
    variableType::type type;
    uint32_t index;
  };
  const static size_t metaSize = 8; // 64bit align to content
  const static uint32_t invalidIndex = std::numeric_limits<uint32_t>::max();
  
  size_t size;
  void* data;
};

LogicMessage recieveMessage( zmq::socket_t& socket, bool multi = false )
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
  assert( 0 == more || multi );

  return LogicMessage( dst, src, content );
}

/**
 * Recieve a mesage and store it on the heap.
 * The caller is responsibe to delete the returned pointer!
 */
LogicMessage* new_recieveMessage( zmq::socket_t& socket, bool multi = false )
{
  return new LogicMessage( recieveMessage( socket, multi ) );
}

std::vector<LogicMessage::shared_ptr> recieveMultiMessage( zmq::socket_t& socket )
{
  std::vector<LogicMessage::shared_ptr> container;
  int more;
  size_t more_size = sizeof( more );
  
  for(;;)
  {
    container.push_back( LogicMessage::shared_ptr( new_recieveMessage( socket, true ) ) );
    
    zmq_getsockopt( socket, ZMQ_RCVMORE, &more, &more_size );
    if( 0 == more )
      break;
  }
  
  return container;
}

#endif // MESSAGE_HPP
