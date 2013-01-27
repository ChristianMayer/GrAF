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

#ifndef LOGGER_HPP
#define LOGGER_HPP

#include <iostream>
#include <iomanip>
#include <sstream>
#include <map>
#include <thread>
#include <mutex>
#include <atomic>

#include <sys/time.h>

/**
 * Create logging infrastructure that allows log leves as well as thread
 * safety
 */
class Logger
{
public:
  /**
   * All known log levels.
   */
  enum logLevels
  {
    ERROR = 0,
    WARN  = 1,
    INFO  = 2,
    ALL   = 3
  };
  
private:
  struct stream_t
  {
    std::ostringstream* stream;
    logLevels logLevel;
    int readableID;
  };
  typedef std::map<std::thread::id, stream_t> map_t;
  map_t streams;
  logLevels globalLogLevel;
  bool showTimestamp;
  std::atomic<int> currentReadableID;
  std::mutex cout_mutex;
  std::mutex map_mutex; // FIXME: should be a read/write lock...
  
  /**
   * nullstream_t is an ostream that does nothing
   */
  struct nullstream_t : std::ostream {
    nullstream_t() : std::ios( 0 ), std::ostream( 0 ) 
    {}
  } nullstream;
  
public:
  Logger() : streams(), globalLogLevel( ERROR ), showTimestamp( true ), currentReadableID( 0 ), cout_mutex(), map_mutex(), nullstream() 
  {}
  
  ~Logger()
  {
    for( auto it = streams.begin(); it != streams.end(); it++ )
    {
      showThread( it );
      delete it->second.stream;
    }
  }
  
  /**
   * Set the global log level.
   */
  void setLogLevel( logLevels l );
  
  /**
   * @return a const char pointer to the current log level.
   */
  const char* getLogLevelName( void ) const
  {
    static const char* names[] = { "ERROR", "WARN", "INFO", "ALL" };
    return names[ globalLogLevel ];
  }
  
  /**
   * @return an ostream that the logging information can be written to and that
   * will output it when the logLevel l is high enough.
   */
  std::ostream& operator()( logLevels l );
  
  /**
   * Stream t to the current logger.
   */
  template<typename T>
  std::ostream& operator<<( const T &t );

  /**
   * Stream t to the current logger:
   * handle stuff like std::endl
   */
  std::ostream& operator<<( std::ostream& (*func)(std::ostream&) );
  
  /**
   * Output the buffered current logger to the user.
   */
  void show( void )
  {
    auto it = thisStream();
    
    showThread( it );
  }
  
  /**
   * Return reference to cout mutex to synchronise with non-Logger output
   * (e.g. for using an assert)
   */
  std::mutex& getOutputLock( void )
  {
    return cout_mutex;
  }
   
private:
  /**
   * Create a new logger stream for the current thread.
   */
  map_t::iterator createStream( void );
  
  /**
   * @return the current stream for this thread.
   */
  map_t::iterator thisStream( void );
  
  /**
   * Show the stream belonging to it to the user.
   */
  void showThread( const map_t::const_iterator& it );
  
  /**
   * Print the a timestamp to std::cout.
   */
  void printTimestamp( void ) const;
};

template<typename T>
std::ostream& Logger::operator<<( const T &t )
{
  auto it = thisStream();
  
  if( it->second.logLevel <= globalLogLevel )
    return *it->second.stream << t;
  
  return nullstream;
}

extern class Logger logger;

#endif // LOGGER_HPP