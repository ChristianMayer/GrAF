/*
 * The Graphic Automation Framework deamon
 * Copyright (C) 2012, 2013  Christian Mayer - mail (at) ChristianMayer (dot) de
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#ifndef EDITORHANDLER_HPP
#define EDITORHANDLER_HPP

#include <list>
#include <boost/asio.hpp>
#include <boost/bind.hpp>

typedef boost::shared_ptr<class SCGI_session> SCGI_session_ptr;
typedef std::list<SCGI_session_ptr> sessionsList_t;

/**
 * Handle the SCGI based connection to the editor.
 * 
 * Wait asynchron for a request, but answer it synchron (i.e. blocking) as the
 * reply should be fast.
 */
class SCGI_session
{
public:
  SCGI_session( boost::asio::io_service& io_service )
  : socket( io_service ),
    data( nullptr )
  {}
  
  ~SCGI_session()
  {
    if( nullptr != data )
      delete[] data;
  }
  
  boost::asio::ip::tcp::socket& getSocket()
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
  

private:
  /**
   * Handle first read request, i.e. new data has arrived and has to be 
   * processed. The read handler is split up in two parts: the first is 
   * basically trying to read the size of the following data
   */
  void handle_read_start( const boost::system::error_code& error,
                          size_t bytes_transferred );
  
  /**
   * Handle read request, i.e. new data has arrived and has to be processed
   */
  void handle_read( const boost::system::error_code& error,
                    size_t bytes_transferred );
  
  /**
   * Send the result, depending on @p ok as HTTP 200 or 400 and with a 
   * JSON ḾIME type, the session will automatically close afterwards.
   */
  void send_result( const std::string& result, bool ok );
  
  /**
  * Handler that's called after the SCGI request was answered
  */
  void close_session( void );
  void close_session( const boost::system::error_code& )
  {
    close_session(); 
  }

  boost::asio::ip::tcp::socket socket;
  enum { max_length = 10 }; // the decimal representation of the header length
                            // should fit and be less than ":CONTENT_LENGTH"...
  char headerLengthString[max_length];
  char *data;
  size_t numberLength;
  size_t headerLength;

  sessionsList_t::iterator self;
};

/**
* Wait for new SCGI requests and start a new SCGI_session for each
*/
class EditorHandler
{
public:
  EditorHandler( boost::asio::io_service& io_service, short port )
  : io_service_( io_service ),
    acceptor( io_service, boost::asio::ip::tcp::endpoint( boost::asio::ip::tcp::v4(), port ) )
  {
    start_accept();
  }
  
  static void close_session( const sessionsList_t::iterator& session )
  {
    sessionsList.erase( session );
  }
  
private:
  void start_accept()
  {
    sessionsList.push_front( SCGI_session_ptr( new SCGI_session( io_service_ ) ) );
    acceptor.async_accept( sessionsList.front()->getSocket(),
                           boost::bind( &EditorHandler::handle_accept, this, sessionsList.begin(),
                                        boost::asio::placeholders::error ) );
  }
  
  void handle_accept( sessionsList_t::iterator new_session,
                      const boost::system::error_code& error )
  {
    if( !error )
    {
      (*new_session)->start( new_session );
    }
    else
    {
      sessionsList.erase( new_session );
    }
    
    start_accept();
  }
  
  boost::asio::io_service& io_service_;
  boost::asio::ip::tcp::acceptor acceptor;
  static sessionsList_t sessionsList;
};

inline void SCGI_session::close_session( void )
{
  EditorHandler::close_session( self );
}

#endif // EDITORHANDLER_HPP
