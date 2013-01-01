/*
 * The Graphic Automation Framework deamon
 * Copyright (C) 2012  Christian Mayer - mail (at) ChristianMayer (dot) de
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

#include "editorhandler.hpp"

#include <sstream>

#include "logger.hpp"
#include "graph.hpp"

void SCGI_session::handle_read_start( const boost::system::error_code& error,
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
    
    headerLength = std::stoul( std::string( headerLengthString, numberLength ) );
    
    if( 15 > headerLength )
    {
      return send_result( "Error, header size not plausible...", false );
    }
    
    data = new char[ headerLength + 10 ];
    memcpy( data, "CONTENT_LENGTH", 14 );
    
    size_t offset = bytes_transferred - numberLength - 1;
    size_t bufSize = headerLength - offset+1;
    boost::asio::async_read( socket, 
                             boost::asio::buffer( data + offset, bufSize ),
                             boost::bind( &SCGI_session::handle_read, this,
                                          boost::asio::placeholders::error,
                                          boost::asio::placeholders::bytes_transferred ) );
  }
  else // !error
  {
    close_session();
  }
}

void SCGI_session::handle_read( const boost::system::error_code& error,
                  size_t bytes_transferred )
{
  
  if( !error )
  {
    bool goodRequest = false;
    std::string SCGI_result;
    std::string requestURI;
    for( size_t currentHeaderIndex = numberLength + 1; currentHeaderIndex <= headerLength; )
    {
      std::string key( data + currentHeaderIndex );
      currentHeaderIndex += key.length() + 1;
      
      std::string value( data + currentHeaderIndex );
      currentHeaderIndex += value.length() + 1;
      
      if( "REQUEST_URI" == key )
        requestURI = value;
    }
    
    size_t parameterPos = requestURI.find_first_of( "?" );
    if( parameterPos == std::string::npos )  // no '?' found?
      parameterPos = (requestURI.size()>1) ? requestURI.size() : 0;  // => try last
        
    char command;
    if( parameterPos >= 2 && '/' == requestURI[ parameterPos - 2 ] )
      command = requestURI[ parameterPos - 1 ];
    logger << "Editor: requestURI = '" << requestURI << "', parameterPos: " << parameterPos << ", left: '" << requestURI[ parameterPos - 2 ] << "'\n"; logger.show();
    parameterPos++; // preceed to first parameter
    
    std::string parameter = (parameterPos>requestURI.size()) ? "" : requestURI.substr(parameterPos);
    logger << "Editor: Command = '" << command << "', Parameter = '" << parameter << "'\n"; logger.show();
    
    switch( command )
    {
      case 'g': // return a specific graph
        {
          auto graphIt = graphs.find(parameter);
          if( graphs.end() != graphIt )
          {
            goodRequest = true;
            std::stringstream out;
            out << graphIt->second;
            SCGI_result = out.str();
          } else {
            SCGI_result = "{error: \"Graph '" + parameter + "' not known\"}";
          }
        }
        break;
        
      case 'l': // return the library
        goodRequest = true;
        {
          std::stringstream out;
          out << Graph::lib;
          SCGI_result = out.str();
        }
        break;
        
      default:
        SCGI_result = "Unknown GrAFd editor command";
    }
    send_result( SCGI_result, goodRequest );
  }
  else // !error
  {
    send_result( "Error '" + error.message() + "'!", false );
  }
}

void SCGI_session::send_result( const std::string& result, bool ok )
{
  boost::asio::async_write( 
    socket,
    boost::asio::buffer( 
      "Status: " + std::string(ok ? "200 OK" : "400 Bad Request") + "\x0d\x0a"
      "Content-Type: application/json\x0d\x0a"
#ifndef NDEBUG
      "Access-Control-Allow-Origin: *\x0d\x0a"
#endif
      "\x0d\x0a"
      + result
    ),
    boost::bind( &SCGI_session::close_session, this,
                boost::asio::placeholders::error ) 
  );
}

sessionsList_t EditorHandler::sessionsList;
