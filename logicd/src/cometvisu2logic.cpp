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
#include <list>

#include <boost/shared_ptr.hpp>
#include <boost/bind.hpp>
#include <boost/asio.hpp>
#include <boost/algorithm/string.hpp>

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
       << "    -n, --namespace [nsp]   Set namespace to transparently use for messages" << endl 
       << "                            (optional and only usefull in exisiting" << endl
       << "                            installations)" << endl
       << "    -v, --vebose            Verbose output - repeatable" << endl;
}

/**
 * Globals
 */
string logicNamespace;
int lastIndex;
//DEBUG// int globalCnt = 0; // FIXME REMOVE

/**
 * Handle a SCGI request
 */
class SCGI_session;
typedef boost::shared_ptr<SCGI_session> SCGI_session_ptr;
typedef list<SCGI_session_ptr> sessionsList_t;
sessionsList_t sessionsList;

class SCGI_session
{
public:
  SCGI_session( boost::asio::io_service& io_service, zmq::socket_t& ZMQ_sender )
    : socket( io_service ),
      timer( io_service ),
      data( nullptr ),
      sender( ZMQ_sender )
  {
    //DEBUG// localCnt = globalCnt++;
    //DEBUG// cout << "======= NEW SCGI_session: " << localCnt << " =======\n";
  }

  ~SCGI_session()
  {
    //DEBUG// cout << localCnt << ": DEBUG: destructor for 'data' at " << (void*)data << ".\n";
    if( nullptr != data )
      delete data;
  }
  
  tcp::socket& getSocket()
  {
    return socket;
  }

  /**
   * Start revieving data
   */
  void start( sessionsList_t::iterator _self )
  {
    self = _self;
    socket.async_read_some( boost::asio::buffer( headerLengthString, max_length ),
                            boost::bind( &SCGI_session::handle_read_start, this,
                                         boost::asio::placeholders::error,
                                         boost::asio::placeholders::bytes_transferred ) );
  }

  void handleLogicMessage( const LogicMessage& msg )
  {
    //DEBUG// cout << localCnt << ": got message type: " << msg.getType() << "; " << msg.getDestination() << "; v=" << msg.getString()<< "\n";
    for( set<string>::const_iterator it = addresses.cbegin(); it != addresses.cend(); it++ )
    {
      if( msg.getDestination() == *it )
      {
        //DEBUG// cout  << localCnt << ": Address FOUND!\n";
        string dest = *it;
        if( "" != logicNamespace && logicNamespace == dest.substr( 0, logicNamespace.length() ))
          dest = dest.substr( logicNamespace.length() );

        std::stringstream sstr;
        sstr << std::hex;       // switch to hex mode
        uint8_t *native = reinterpret_cast<uint8_t*>( msg.getNative() );
        for( size_t i = 0; i < msg.nativeSize(); ++i )
        {
          sstr << std::setw( 2 ) << std::setfill( '0' );
          sstr << (int)native[i];
        }

        return send_result(
          "{"
            "\"d\":{"
            "\"" + dest + "\": \"" + sstr.str() + "\""
            "},"
            + ( msg.hasInvalidIndex() ? string("") : ("\"i\": \"" + to_string(msg.getIndex()) + "\"") ) +
          "}",
          true 
        );
      }
    }
    //DEBUG// cout  << localCnt << ": Address not found!\n";
  }
  
private:
  /**
   * Handle first read request, i.e. new data has arrived and has to be 
   * processed. The read handler is split up in two parts: the first is 
   * basically trying to read the size of the following data
   */
  void handle_read_start( const boost::system::error_code& error,
                          size_t bytes_transferred )
  {
    if( !error )
    {
      numberLength = 0; // the amount of bytes for the inital number,
      // i.e. header length
      while( '0' <= headerLengthString[numberLength] && headerLengthString[numberLength] <= '9' && 
        numberLength < bytes_transferred )
      {
        numberLength++;
      }
      
      if( numberLength == 0 || headerLengthString[numberLength] != ':' )
      {
        return send_result( "Error, malformed netstring for header...", false );
      }
      
      if( numberLength == bytes_transferred )
      {
        return send_result( "Error, not even header size in first packet...", false );
      }
      
      headerLength = stoul( string( headerLengthString, numberLength ) );
      
      if( 15 > headerLength )
      {
        return send_result( "Error, header size not plausible...", false );
      }
      
      data = new char[ headerLength +10];
      memcpy( data, "CONTENT_LENGTH", 14 );

      //DEBUG// cout << localCnt << ": DEBUG: allocated " << (headerLength) << " bytes for 'data' at " << (void*)data << ".\n";
      size_t offset = bytes_transferred - numberLength - 1;
      size_t bufSize = headerLength - offset+1;
      //DEBUG// cout << localCnt << ": offset: " << offset << "; buffer length: " << (headerLength +10) << "; bufSize: " << bufSize << ";\n";
      boost::asio::async_read( socket, 
                               boost::asio::buffer( data + offset, bufSize ),
                               boost::bind( &SCGI_session::handle_read, this,
                                            boost::asio::placeholders::error,
                                            boost::asio::placeholders::bytes_transferred ) );
    }
    else // !error
    {
      //DEBUG// cout << localCnt << ": error oben -> delete this\n";
      sessionsList.erase( self ); cout << localCnt << ": sessionsList.erase( self );\n";
    }
    //DEBUG// cout << localCnt << ": handle_read_start e\n";
  }
  
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
      //DEBUG// cout << localCnt << ": -------------\n";
      //DEBUG// cout << localCnt << ": [" << headerLengthString << "]";
      //DEBUG// cout << "[" << data << "]\n" << localCnt << ": [";
      //DEBUG// for( int i = 0; i < headerLength; i++ )
      //DEBUG//   cout << (data[i]==0?'|':data[i]);
      //DEBUG// cout << "]\n";
      //DEBUG// cout << localCnt << ": headerLength: " << headerLength << "; bytes_transferred: " << bytes_transferred << "\n";
      for( size_t currentHeaderIndex = numberLength + 1; currentHeaderIndex <= headerLength; )
      {
        string key( data + currentHeaderIndex );
        currentHeaderIndex += key.length() + 1;

        string value( data + currentHeaderIndex );
        currentHeaderIndex += value.length() + 1;

        if( "REQUEST_URI" == key )
          requestURI = value;
      }

      //DEBUG// cout << localCnt << ": SCGI Request: [" << requestURI << "]\n";
      //DEBUG// cout << localCnt << ": {" << SCGI_result << "}\n";
      size_t parameterPos = requestURI.find_first_of( "?" );
      char command;
      if( parameterPos >= 2 && '/' == requestURI[ parameterPos - 2 ] )
        command = requestURI[ parameterPos - 1 ];
      parameterPos++; // preceed to first parameter
      
      //DEBUG// cout << localCnt << ": cmd: '" << command << "', [" << requestURI.substr( parameterPos ) << "]\n";
      string session;
      int timeout = 60;
      string index;
      string value;
      while( parameterPos < requestURI.length() )
      {
        size_t next = requestURI.substr( parameterPos ).find_first_of( "&" );
        
        if( '=' == requestURI[ parameterPos+1 ] )
        {
          string parameter = requestURI.substr( parameterPos + 2, next - 2 );
          //cout << localCnt << ": paramter [" << requestURI[ parameterPos ] << "] = [" << parameter << "] next: " << next << "\n";
          switch( requestURI[ parameterPos ] )
          {
            case 'a':
              addresses.insert( logicNamespace + parameter );
              break;

            case 's':
              session = parameter;
              break;

            case 't':
              if( '0' <= parameter[0] && parameter[0] <= '9' )
                timeout = stoi( parameter );
              break;

            case 'i':
              index = parameter;
              break;

            case 'v':
              value = parameter;
              break;
          }
        } else {
          //cout << localCnt << ": not compatible parameter [" << requestURI.substr( parameterPos, next ) << "]\n";
        }

        if( string::npos == next || 0 == next ) // last parameter found
          break;

        parameterPos += next + 1;
      }
 
      ////////
      //DEBUG// cout << localCnt << ": addresses: ";
      //DEBUG// for( set<string>::const_iterator it = addresses.cbegin(); it != addresses.cend(); it++ )
      //DEBUG// {
      //DEBUG//   cout << "[" << *it << "]";
      //DEBUG// }
      //DEBUG// cout << "\n";
      //DEBUG// cout << localCnt << ": session: [" << session << "], ";
      //DEBUG// cout << "timeout: [" << timeout << "], ";
      //DEBUG// cout << "index: [" << index << "], ";
      //DEBUG// cout << "value: [" << value << "]";
      //DEBUG// cout << " - command: '" << command << "'\n";
      ////////
      switch( command )
      {
        case 'w': // write
          goodRequest = true;
          for( set<string>::const_iterator it = addresses.cbegin(); it != addresses.cend(); it++ )
          {
            cout << "VALUE: " << value << ";";
            size_t dataLength = value.length()/2;
            uint8_t *data = new uint8_t[ dataLength ];
            for( size_t pos = 0; pos < dataLength; pos++ )
            {
              size_t startPos = pos*2;
              cout << "[" << pos << "/" << startPos << "=";
              data[ pos ] = stoul( value.substr( startPos, 2 ), 0, 16 );
              cout << startPos << "]:" << hex << (int)data[ pos ];
            }
            cout << ";\n";
            LogicMessage msg( *it, "C2L", variable_t(), dataLength, data );
            delete [] data;
            msg.send( sender );
            LogicMessage reply = recieveMessage( sender );
          }
          SCGI_result = "{'success':1}";
          break;
          
        case 'l': // login
          goodRequest = true;
          SCGI_result = "{"
            "\"v\":\"0.0.1\","
            "\"s\":\"SESSION\""
          "}";
          break;
          
        case 'r': // read
          {
            if( 0 == timeout || lastIndex != stol( index ) )
            { // read all messages (i.e. CometVisu start) or there were some messages after the last reply
              goodRequest = true;
              LogicMessage msg( "meta:cacheread", boost::algorithm::join( addresses, "," ) );
              if( 0 == timeout )
                msg.send( sender );
              else
                msg.send( sender, stoul(index) );
              vector<LogicMessage::shared_ptr> msgs( recieveMultiMessage( sender ) );

              if( 0 == timeout || (msgs.front() != msgs.back()) || !msgs.front()->isEmpty() )
              { // read all messages or at least one message was returned
                SCGI_result = "{\"d\":{";
                bool after_first = false;
                for( vector<LogicMessage::shared_ptr>::iterator it = msgs.begin(); it != msgs.end(); it++ )
                {
                  string dest = ( *it )->getDestination();
                  if( "" != logicNamespace && logicNamespace == dest.substr( 0, logicNamespace.length() ) )
                    dest = dest.substr( logicNamespace.length() );

                  if( after_first )
                    SCGI_result += ",";
                  
                  std::stringstream sstr;
                  sstr << std::hex;       // switch to hex mode
                  uint8_t *native = reinterpret_cast<uint8_t*>( (*it)->getNative() );
                  for( size_t i = 0; i < (*it)->nativeSize(); ++i )
                  {
                    sstr << std::setw(2) << std::setfill('0');
                    sstr << (int)native[i];
                  }
                  SCGI_result += "\"" + dest + "\":\"" + sstr.str() + "\"";

                  after_first = true;
                }
                SCGI_result += "},\"i\":\"" + to_string( ( *msgs.begin() )->getIndex() ) + "\"}";
                break;
              }
            } 
            // when we get here:
            // - we are NOT in an initial read
            // - although there were message after the last reply, none were of any interest
            // => wait for new messages

            timer.expires_from_now( boost::posix_time::seconds( timeout ) );
            timer.async_wait( boost::bind( &SCGI_session::timeout, this,
                                           boost::asio::placeholders::error ) );
            return;
          }
          
        default:
          SCGI_result = "Unknown CometVisu command";
          break;
      }

      send_result( SCGI_result, goodRequest );
    }
    else // !error
    {
      //DEBUG// cout << localCnt << ": error -> delete this\n";
      sessionsList.erase( self ); 
      //DEBUG// cout << localCnt << ": sessionsList.erase( self );\n";
    }
  }

  void send_result( const string& result, bool ok )
  {
    timer.cancel();
    boost::asio::async_write( 
      socket,
      boost::asio::buffer( 
        "Status: " + string(ok ? "200 OK" : "400 Bad Request") + "\x0d\x0a"
        "Content-Type: text/plain\x0d\x0a"
        "\x0d\x0a"
        + result
      ),
      boost::bind( &SCGI_session::close_session, this,
                   boost::asio::placeholders::error ) 
    );
  }
  
  /**
   * Handler that's called after the SCGI request was answered
   */
  void close_session( const boost::system::error_code& error )
  {
    //DEBUG// cout << localCnt << ": write_result -> delete this\n";
    sessionsList.erase( self ); 
    //DEBUG// cout << localCnt << ": sessionsList.erase( self );\n";
  }

  
  /**
   * Handler that's called when the read request times out
   */
  void timeout( const boost::system::error_code& error )
  {
    if( boost::asio::error::operation_aborted != error )
    {
      //DEBUG// cout << localCnt << ": TIMEOUT\n";
      send_result( "", true ); // timeout = successful, empty result
    } 
  }
  
  tcp::socket socket;
  boost::asio::deadline_timer timer;
  enum { max_length = 10 }; // the decimal representation of the header length
                            // should fit and be less than ":CONTENT_LENGTH"...
  char headerLengthString[max_length];
  char *data;
  zmq::socket_t& sender;
  size_t numberLength;
  size_t headerLength;
  set<string> addresses;
  
  sessionsList_t::iterator self;
  int localCnt; // FIXME remove
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
    sessionsList.push_front( SCGI_session_ptr( new SCGI_session( io_service_, ZMQ_sender_ ) ) );
    //DEBUG// cout << "SCGI_server - created new SCGI_session: " << &(*(sessionsList.begin())) << ";\n";
    acceptor.async_accept( sessionsList.front()->getSocket(),
                           boost::bind( &SCGI_server::handle_accept, this, sessionsList.begin(),
                                        boost::asio::placeholders::error ) );
  }

  void handle_accept( sessionsList_t::iterator new_session,
                      const boost::system::error_code& error )
  {
    if( !error )
    {
      //DEBUG// cout << "SCGI_server - start new session: " << &(*new_session) << ";\n";
      (*new_session)->start( new_session );
    }
    else
    {
      //DEBUG// cout << "SCGI_server - erase session: " << &(*new_session) << ";\n";
      sessionsList.erase( new_session );
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
    subscriber.setsockopt( ZMQ_SUBSCRIBE, "", 0 ); // Setup filter - take all possible messages

    int subscriber_fd;
    size_t sizeof_fd = sizeof( subscriber_fd );
    subscriber.getsockopt( ZMQ_FD, ( void* )&subscriber_fd, &sizeof_fd ); // TODO check return value == 0

    subscriber_socket.assign( subscriber_fd );
    //DEBUG// cout << "Subscriber FD: " << subscriber_fd << ", native: " << subscriber_socket.native() << "\n";

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
      //DEBUG// cout << "handle_read -> recieveMessage\n";
      while( true )
      {
        uint32_t eventState;
        size_t   eventStateSize = sizeof( eventState );
        subscriber.getsockopt( ZMQ_EVENTS, ( void* )&eventState, &eventStateSize ); // TODO check return value == 0
        //DEBUG// cout << "eventState: " << eventState << " (POLLIN: " << ZMQ_POLLIN << ", POLLOUT: " << ZMQ_POLLOUT << ")" << ", eventStateSize: " << eventStateSize << ", sizeof: " << sizeof( eventState ) << "\n";

        if( eventState & ZMQ_POLLIN )
        {
          //DEBUG// cout << "ZMQ_POLLIN\n";
          LogicMessage msg   = recieveMessage( subscriber );
          lastIndex = msg.getIndex();
          //DEBUG// cout << "got message type: " << msg.getType() << "\n";

          // Passing message to all waiting SCGI connections
          int FIXME_tmp = 0;
          for( sessionsList_t::iterator it = sessionsList.begin(); it != sessionsList.end(); it++ )
          {
            //DEBUG// cout << "sessionsList_t::iterator FIXME_tmp: " << ( FIXME_tmp++ ) << ";\n";
            ( *it )->handleLogicMessage( msg );
          }
        }
        else
        {
          //DEBUG// cout << "no more to do\n";
          break;
        }
      }
      //DEBUG// cout << "waiting for next ZMQ...\n";
      subscriber_socket.async_read_some( boost::asio::null_buffers(),
                                         boost::bind( &ZMQ_server::handle_read, this,
                                                      boost::asio::placeholders::error ) );

    }
    else
    {
      //DEBUG// cout << " ZMQ_session handle_read ERROR! " << error.message() << "\n";
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
    if     ( parameter == "-n" || parameter == "--namespace" )
    {
      if( ++i == argc )
      {
        cout << "Error: namespace not specified!" << endl;
        return -1;
      }
      logicNamespace = argv[ i ];
    }
    else if( parameter == "-h" || parameter == "--help" )
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
    //DEBUG// cout << "start main loop\n";
    io_service.run();
  }
  catch( std::exception& e )
  {
    std::cerr << e.what() << std::endl;
  }

  return 0;
}