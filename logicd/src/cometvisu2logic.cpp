/*
 *    Logic engine - CometVisu binding though SCGI
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
#include <set>

#include <boost/bind.hpp>
#include <boost/asio.hpp>

#include "zmq.hpp"

#include "netstring.hpp"
#include "message.hpp"
#include "hexdump.hpp"

using namespace std;
using boost::asio::ip::tcp;

void showHelp( void )
{
  cout << "Usage: cometvisu2logic [options]" << endl
       << endl
       << "Create a CometVisu backend (via SCGI) with the logic deamon." << endl
       << endl
       << "Parameters:" << endl
       << "    -h, --help              This help message" << endl
       << "    -v, --vebose            Verbose output - repeatable" << endl;
}

/**
 * Handle a SCGI request
 */
class SCGI_session
{
public:
  SCGI_session( boost::asio::io_service& io_service, zmq::socket_t& ZMQ_sender )
    : socket( io_service ),
      sender( ZMQ_sender )
  {}

  tcp::socket& getSocket()
  {
    return socket;
  }

  /**
   * Start revieving data
   */
  void start()
  {
    socket.async_read_some( boost::asio::buffer( data, max_length ),
                            boost::bind( &SCGI_session::handle_read, this,
                                         boost::asio::placeholders::error,
                                         boost::asio::placeholders::bytes_transferred ) );
  }

private:
  /**
   * Handle read request, i.e. new data has arrived and has to be processed
   */
  void handle_read( const boost::system::error_code& error,
                    size_t bytes_transferred )
  {
    if( !error )
    {
      bool goodRequest = false;
      string SCGI_result;
      string requestURI;
      
      for(;;) // dummy loop, to make error handling easier
      {
        size_t numberLength = 0; // the amount of bytes for the inital number,
                                 // i.e. header length
        while( '0' <= data[numberLength] && data[numberLength] <= '9' && 
                numberLength < bytes_transferred )
        {
          numberLength++;
        }

        if( numberLength == 0 || data[numberLength] != ':' )
        {
          SCGI_result = "Error, malformed netstring for header...";
          break;
        }
          
        if( numberLength == bytes_transferred )
        {
          SCGI_result = "Error, not even header size in first packet..."; // FIXME proper handling!
          break;
        }
        
        size_t headerLength = stoul( string( data, numberLength ) );
        if( numberLength + headerLength > bytes_transferred )
        {
          SCGI_result = "Error, not even header in first packet..."; // FIXME proper handling!
          break;
        }
        
        for( size_t currentHeaderIndex = numberLength+1; currentHeaderIndex <= headerLength; )
        {
          string key( data + currentHeaderIndex );
          currentHeaderIndex += key.length() + 1;

          string value( data + currentHeaderIndex );
          currentHeaderIndex += value.length() + 1;
          
          if( "REQUEST_URI" == key )
            requestURI = value;
        }

        cout << "SCGI Request: [" << requestURI << "]\n";
        break;
      }
      
      size_t parameterPos = requestURI.find_first_of( "?" );
      char command;
      if( parameterPos >= 2 && '/' == requestURI[ parameterPos - 2 ] )
        command = requestURI[ parameterPos - 1 ];
      parameterPos++; // preceed to first parameter
      
      cout << "params: [" << requestURI.substr( parameterPos ) << "]\n";
      set<string> addresses;
      string session;
      int timeout;
      string index;
      string value;
      while( parameterPos < requestURI.length() )
      {
        size_t next = requestURI.substr( parameterPos ).find_first_of( "&" );
        string parameter = requestURI.substr( parameterPos+2, next-2 );
        cout << "paramter [" << requestURI[ parameterPos ] << "] = [" << parameter << "] next: " << next << "\n";
        switch( requestURI[ parameterPos ] )
        {
          case 'a':
            addresses.insert( parameter );
            break;
            
          case 's':
          case 't':
          case 'i':
            break;
            
          case 'v':
            value = parameter;
            break;
        }
        
        if( string::npos == next || 0 == next ) // last parameter found
          break;
        
        parameterPos += next + 1;
      }
      
      switch( command )
      {
        case 'w':
          goodRequest = true;
          for( set<string>::const_iterator it = addresses.cbegin(); it != addresses.cend(); it++ )
          {
            cout << "WRITE [" << *it << "]=" << value << ";\n";
            LogicMessage msg( *it, "C2L", value );
            msg.send( sender );
            LogicMessage reply = recieveMessage( sender );
          }
          break;
          
        case 'l':
          goodRequest = true;
          SCGI_result = "{"
            "\"v\":\"0.0.1\","
            "\"s\":\"SESSION\""
          "}";
          break;
          
        case 'r':
          goodRequest = true;
          SCGI_result = "{}";
          break;
          
        default:
          SCGI_result = "Unknown CometVisu command";
          break;
      }

      if( goodRequest )
      {
        SCGI_result = "Status: 200 OK\x0d\x0a"
                      "Content-Type: text/plain\x0d\x0a"
                      "\x0d\x0a"
                      + SCGI_result;
      } else {
        SCGI_result = "Status: 400 Bad Request\x0d\x0a"
                      "Content-Type: text/plain\x0d\x0a"
                      "\x0d\x0a"
                      + SCGI_result;
      }

      boost::asio::async_write( socket,
                                boost::asio::buffer( SCGI_result ),
                                boost::bind( &SCGI_session::write_result, this,
                                             boost::asio::placeholders::error ) );
    }
    else // !error
    {
      delete this;  // -> close socket
    }
  }

  /**
   * Handler that's called after the SCGI request was answered
   */
  void write_result( const boost::system::error_code& error )
  {
    delete this; // close socket
  }

  tcp::socket socket;
  enum { max_length = 10240 };
  char data[max_length];
  zmq::socket_t& sender;
};

/**
 * Wait for new SCGI requests and start a new SCGI_session for each
 */
class SCGI_server
{
public:
  SCGI_server( boost::asio::io_service& io_service, short port, zmq::socket_t& ZMQ_sender )
    : io_service_( io_service ),
      acceptor( io_service, tcp::endpoint( tcp::v4(), port ) ),
      ZMQ_sender_( ZMQ_sender )
  {
    start_accept();
  }

private:
  void start_accept()
  {
    SCGI_session* new_session = new SCGI_session( io_service_, ZMQ_sender_ );
    acceptor.async_accept( new_session->getSocket(),
                           boost::bind( &SCGI_server::handle_accept, this, new_session,
                                        boost::asio::placeholders::error ) );
  }

  void handle_accept( SCGI_session* new_session,
                      const boost::system::error_code& error )
  {
    if( !error )
    {
      new_session->start();
    }
    else
    {
      delete new_session;
    }

    start_accept();
  }

  boost::asio::io_service& io_service_;
  tcp::acceptor acceptor;
  zmq::socket_t& ZMQ_sender_;
};

class ZMQ_server
{
public:
  ZMQ_server( boost::asio::io_service& io_service, zmq::context_t& context )
    : //io_service_( io_service ),
      subscriber( context, ZMQ_SUB ),
      subscriber_socket( io_service )
  {
    subscriber.connect( "ipc:///tmp/logicd.messages.ipc" );
    subscriber.setsockopt( ZMQ_SUBSCRIBE, "foo", 3 ); // Setup filter

    int subscriber_fd;
    size_t sizeof_fd = sizeof( subscriber_fd );
    subscriber.getsockopt( ZMQ_FD, ( void* )&subscriber_fd, &sizeof_fd ); // TODO check return value == 0

    subscriber_socket.assign( subscriber_fd );
    cout << "Subscriber FD: " << subscriber_fd << ", native: " << subscriber_socket.native() << "\n";

    // start_accept():
    subscriber_socket.async_read_some( boost::asio::null_buffers(),
                                       boost::bind( &ZMQ_server::handle_read, this,
                                                    boost::asio::placeholders::error ) );
  }

private:
   void handle_read( const boost::system::error_code& error )
   {
     if( !error )
     {
       
       cout << "handle_read -> recieveMessage\n";
       while(true)
       {
       uint32_t eventState;
       size_t   eventStateSize = sizeof( eventState );
       subscriber.getsockopt( ZMQ_EVENTS, ( void* )&eventState, &eventStateSize ); // TODO check return value == 0
       cout << "eventState: " << eventState << " (POLLIN: " << ZMQ_POLLIN << ", POLLOUT: " << ZMQ_POLLOUT << ")" << ", eventStateSize: " << eventStateSize << ", sizeof: " << sizeof( eventState ) << "\n";
       
       if( eventState & ZMQ_POLLIN )
       {
         cout << "ZMQ_POLLIN\n";
         LogicMessage msg   = recieveMessage( subscriber );
         cout << "got message type: " << msg.getType() << "\n";
       }
       else {
         cout << "no more to do\n";
         break;
       }
       }
       cout << "waiting for next ZMQ...\n";
       subscriber_socket.async_read_some( boost::asio::null_buffers(),
                               boost::bind( &ZMQ_server::handle_read, this,
                                            boost::asio::placeholders::error ) );
       
     }
     else
     {
       cout << " ZMQ_session handle_read ERROR! "<< error.message() << "\n";
       /*
        *      socket.async_read_some( boost::asio::null_buffers(),
        *                              boost::bind( &ZMQ_session::handle_read, this,
        *                                           boost::asio::placeholders::error,
        *                                           boost::asio::placeholders::bytes_transferred ) );
        *      /**/
     }
   }
   
  //boost::asio::io_service& io_service_;
  zmq::socket_t subscriber;
  boost::asio::posix::stream_descriptor subscriber_socket;
};


int main( int argc, char *argv[] )
{
  ///////////////////////////////////////////////////////////////////////////
  //
  //  Setup
  //
  for( int i = 1; i < argc; i++ )
  {
    string parameter( argv[ i ] );
    if( parameter == "-h" || parameter == "--help" )
    {
      showHelp();
      return 0;
    }
  }

  try
  {
    // Setup ASIO
    boost::asio::io_service io_service;
    
    // Setup ZMQ
    zmq::context_t context( 1 );
    zmq::socket_t sender( context, ZMQ_REQ );
    sender.connect( "ipc:///tmp/logicd.ipc" );
    ZMQ_server ZMQ( io_service, context );
    
    // Setup SCGI
    SCGI_server SCGI( io_service, 9999, sender );
    
    ///////////////////////////////////////////////////////////////////////////
    //
    //  Main loop
    //
    cout << "start main loop\n";
    io_service.run();
  }
  catch( std::exception& e )
  {
    std::cerr << e.what() << std::endl;
  }

  return 0;
}