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
#include <boost/concept_check.hpp>

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
      contentSize( metaSize ),
      size( metaSize ),
      data( new uint8_t[size] )
  {
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::UNKNOWN;
  }
  
  /**
   * Construct a LogicMessage with given destination and source out of a
   * ZMQ message.
   */
  LogicMessage( const std::string& destination_,
                const std::string& source_,
                const zmq::message_t& message )
    : destination( destination_ ),
      source( source_ ),
      contentSize( metaSize ),
      size( message.size() ),
      data( new uint8_t[size] )
  {
    memcpy( data, message.data(), size );
    fixContentSize();
  }

  /**
   * Construct a LogicMessage with given destination and dummy source out of a
   * ZMQ message.
   */
  LogicMessage( const std::string& destination_,
                const zmq::message_t& message )
    : destination( destination_ ),
      source( "NoSrc" ),
      contentSize( metaSize ),
      size( message.size() ),
      data( new uint8_t[size] )
  {
    memcpy( data, message.data(), size );
    fixContentSize();
  }
  
  /**
   * Construct a LogicMessage with given destination and source out of a
   * value of template type T.
   * An addition raw presentation of the value might optinally be added.
   */
  template<typename T>
  explicit LogicMessage( const std::string& destination_,
                         const std::string& source_,
                         const T& value,
                         const size_t& rawLength = 0,
                         void* raw = nullptr )
    : destination( destination_ ),
      source( source_ ),
      contentSize( metaSize + sizeof( T ) ),
      size( contentSize + rawLength ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::getType<T>();
    *reinterpret_cast<T*>( data + metaSize ) = value;
    
    memcpy( data + contentSize, raw, rawLength );
  }

  /**
   * Construct a LogicMessage with given destination and dummy source out of a
   * value of template type T.
   * An addition raw presentation of the value might optinally be added.
   */
  template<typename T>
  explicit LogicMessage( const std::string& destination_,
                         const T& value,
                         const size_t& rawLength = 0,
                         void* raw = nullptr )
    : destination( destination_ ),
      source( "NoSrc" ),
      contentSize( metaSize + sizeof( T ) ),
      size( contentSize + rawLength ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = variableType::getType<T>();
    *reinterpret_cast<T*>( data + metaSize ) = value;
    
    memcpy( data + contentSize, raw, rawLength );
  }
  
  /**
   * Construct a LogicMessage with given destination and source of type string.
   * An addition raw presentation of the value might optinally be added.
   */
  explicit LogicMessage( const std::string& destination_,
                         const std::string& source_,
                         const std::string& value,
                         const size_t& rawLength = 0,
                         void* raw = nullptr )
    : destination( destination_ ),
      source( source_ ),
      contentSize( metaSize + value.length() + 1 ),
      size( contentSize + rawLength ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::STRING;
    memcpy( data + metaSize   , value.c_str(), value.length() + 1 ); // copy including tailing \0
    memcpy( data + contentSize, raw          , rawLength          );
  }

  /**
   * Construct a LogicMessage with given destination and dummy source of type
   * string.
   * An addition raw presentation of the value might optinally be added.
   */
  explicit LogicMessage( const std::string& destination_,
                         const std::string& value,
                         const size_t& rawLength = 0,
                         void* raw = nullptr )
    : destination( destination_ ),
      source( "NoSrc" ),
      contentSize( metaSize + value.length() + 1 ),
      size( contentSize + rawLength ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = variableType::STRING;
    memcpy( data + metaSize   , value.c_str(), value.length() + 1 ); // copy including tailing \0
    memcpy( data + contentSize, raw          , rawLength          );
  }

  /**
   * Construct a LogicMessage with given destination and source of type string.
   * An addition raw presentation of the value might optinally be added.
   */
  explicit LogicMessage( const std::string& destination_,
                         const std::string& source_,
                         const char* value,
                         const size_t& rawLength = 0,
                         void* raw = nullptr )
    : destination( destination_ ),
      source( source_ ),
      contentSize( metaSize + std::string( value ).length() + 1 ),
      size( contentSize + rawLength ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>( data )->flags = 0;
    reinterpret_cast<messageType*>( data )->_rows = 0;
    reinterpret_cast<messageType*>( data )->_cols = 0;
    reinterpret_cast<messageType*>( data )->type = variableType::STRING;

    memcpy( data + metaSize   , value, contentSize - metaSize ); // copy including tailing \0
    memcpy( data + contentSize, raw  , rawLength              );
  }

  /**
   * Construct a LogicMessage with given destination and dummy source of type
   * string.
   * An addition raw presentation of the value might optinally be added.
   */
  explicit LogicMessage( const std::string& destination_,
                         const char* value,
                         const size_t& rawLength = 0,
                         void* raw = nullptr )
    : destination( destination_ ),
      source( "NoSrc" ),
      contentSize( metaSize + std::string( value ).length() + 1 ),
      size( contentSize + rawLength ),
      data( new uint8_t[size] )
  {
    assert( sizeof( messageType ) <= metaSize );
    
    reinterpret_cast<messageType*>(data)->flags = 0;
    reinterpret_cast<messageType*>(data)->_rows = 0;
    reinterpret_cast<messageType*>(data)->_cols = 0;
    reinterpret_cast<messageType*>(data)->type = variableType::STRING;

    memcpy( data + metaSize   , value, contentSize - metaSize ); // copy including tailing \0
    memcpy( data + contentSize, raw  , rawLength              );
  }

  explicit LogicMessage( const std::string& destination_,
                         const std::string& source_,
                         const variable_t& value,
                         const size_t& rawLength = 0,
                         void* raw = nullptr )
    : destination( destination_ ),
      source( source_ ),
      contentSize( metaSize + value.getSize(true) ),  // include tailing \0
      size( contentSize + rawLength ),
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
        *reinterpret_cast<int*>( data + metaSize ) = value.getInt();
        break;
        
      case variableType::FLOAT:
        *reinterpret_cast<float*>( data + metaSize ) = value.getFloat();
        break;
        
      case variableType::STRING:
        memcpy( data + metaSize, value.getString().c_str(), value.getSize(true) );
        break;
        
      case variableType::UNKNOWN:
      default:
        break;
    }
    memcpy( data + contentSize, raw  , rawLength );
  }
  
  ~LogicMessage()
  {
    delete [] data;
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
  void send( zmq::socket_t& socket, uint32_t index = invalidIndex, bool last = true ) const
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
  
  /**
   * @return destination of the LogicMessage.
   */
  std::string getDestination( void ) const
  {
    return destination;
  }
  
  /**
   * @return source of the LogicMessage.
   */
  std::string getSource( void ) const
  {
    return source;
  }
  
  /**
   * @return type of the LogicMessage.
   */
  variableType::type getType( void ) const
  {
    return reinterpret_cast<const messageType*>(data)->type;
  }
  
  /**
   * @return index of the LogicMessage.
   */
  size_t getIndex( void ) const
  {
    return reinterpret_cast<messageType*>( data )->index;
  }
  
  /**
   * Check if this message has an invalid index.
   */
  bool hasInvalidIndex( void ) const
  {
    return invalidIndex == reinterpret_cast<messageType*>( data )->index;
  }
  
  /**
   * @return the size of the data part of the message (including metaSize and raw).
   */
  size_t getSize( void ) const
  {
    return size;
  }
  
  /**
   * Return the variable of the message as variable_t.
   */
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
  
  /**
   * Return the value of the message as int.
   * It it's not of that type it will return 0.
   */
  int getInt( void ) const
  {
    if( variableType::INT == getType() )
      return *reinterpret_cast<int*>( reinterpret_cast<char*>(data) + metaSize );
    
    return 0;
  }
  
  /**
   * Return the value of the message as float.
   * It it's not of that type it will return 0.0f.
   */
  float getFloat( void ) const
  {
    if( variableType::FLOAT == getType() )
      return *reinterpret_cast<float*>( reinterpret_cast<char*>(data) + metaSize );
    
    return 0.0f;
  }
  
  /**
   * Return the value of the message as std::string.
   * It it's not of that type it will return an empty string.
   */
  std::string getString( void ) const
  {
    if( variableType::STRING == getType() )
      return std::string( reinterpret_cast<char*>(data) + metaSize );
    
    return "";
  }
  
  /**
   * @return the size of native data in the message
   */
  size_t nativeSize( void ) const
  {
    return size - contentSize;
  }
  
  /**
   * @return a pointer to the native data
   */
  void* getNative( void ) const
  {
    return data + contentSize;
  }
  
  /**
   * @return a pointer to the raw data that also contains meta information and
   * the value.
   */
  void* getRaw( void ) const
  {
    return data;
  }
  
private:
  /**
   * reconstruct the contentSize
   */
  void fixContentSize( void )
  {
    contentSize = metaSize + getVariable().getSize( true );
  }
  
  std::string destination;
  std::string source;
  struct messageType {
    uint8_t flags;
    uint8_t _rows; // currently unused
    uint8_t _cols; // currently unused
    variableType::type type;
    uint32_t index;
  };
  constexpr static size_t metaSize{ 8 }; // 64bit align to content
  constexpr static uint32_t invalidIndex{ std::numeric_limits<uint32_t>::max() };
  
  size_t contentSize; // the size of meta and the value
  size_t size;        // the size of the full message, i.e. of data[]
  uint8_t* data;
};

/**
 * Recieve a LogicMessage from the ZMQ socket.
 * @param multi if false (default) the transmision will be ended,
 *              if true one or more messages will be recieved afterwards.
 */
inline LogicMessage recieveMessage( zmq::socket_t& socket, bool multi = false )
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
 * @param multi if false (default) the transmision will be ended,
 *              if true one or more messages will be recieved afterwards.
 */
inline LogicMessage* new_recieveMessage( zmq::socket_t& socket, bool multi = false )
{
  return new LogicMessage( recieveMessage( socket, multi ) );
}

/**
 * Recieve a multi message and return it in a vector of shared_ptr.
 */
inline std::vector<LogicMessage::shared_ptr> recieveMultiMessage( zmq::socket_t& socket )
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
