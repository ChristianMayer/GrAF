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

#include "logger.hpp"

void Logger::setLogLevel( logLevels l )
{
  if( l < ERROR || l > ALL )
    globalLogLevel = ALL;
  else    
    globalLogLevel = l;
  
  if( l >= INFO )
  {
    *this << "Set log level to " << getLogLevelName() << std::endl;
    show();
  }
}

std::ostream& Logger::operator()( logLevels l )
{
  auto it = thisStream();
  
  it->second.logLevel = l;
  if( it->second.logLevel <= globalLogLevel )
    return *it->second.stream;
  
  return nullstream;
}

std::ostream& Logger::operator<<( std::ostream& (*func)(std::ostream&) )
{
  auto it = thisStream();
  
  if( it->second.logLevel <= globalLogLevel )
    return func(*it->second.stream);
  
  return nullstream;
}

Logger::map_t::iterator Logger::createStream( void )
{
  // Lock already done in thisStream()!
  //std::lock_guard<std::mutex> lock( map_mutex ); // RAII
  auto res = streams.insert( 
    map_t::value_type(
      std::this_thread::get_id(), 
      { new std::ostringstream(), ALL, currentReadableID++ } 
    )
  );
  if( !res.second )
    throw "Creation of new thread logger failed!";
  
  return res.first;
}

Logger::map_t::iterator Logger::thisStream( void )
{
  std::lock_guard<std::mutex> lock( map_mutex ); // RAII
  auto it = streams.find( std::this_thread::get_id() );
  if( streams.end() == it )
    it = createStream();
  
  return it;
}

void Logger::showThread( const map_t::const_iterator& it )
{
  std::lock_guard<std::mutex> lock( cout_mutex ); // RAII
  
  const std::string& str = it->second.stream->str();
  std::string::size_type start = 0;
  std::string::size_type end;
  
  while( (end = str.find( '\n', start )) != std::string::npos )
  {
    if( showTimestamp )
      printTimestamp();
    std::cout << it->second.readableID << ": " << str.substr( start, end - start ) << "\n";
    start = end + 1;            // new start is right after the '\n'
  }
  it->second.stream->str( "" ); // clear stringstream buffer
}

void Logger::printTimestamp( void ) const
{
  timeval currentTime;
  gettimeofday(&currentTime, NULL);
  int milli = currentTime.tv_usec / 1000;
  
  char buffer[80];
  strftime( buffer, 80, "%Y-%m-%d %H:%M:%S", localtime( &currentTime.tv_sec ) );
  
  std::cout << "[" << buffer << "." << std::setw(3) << std::setfill('0') << milli << "] ";
}
