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

#ifndef LOGICELEMENT_SLEEP_HPP
#define LOGICELEMENT_SLEEP_HPP

#include "logicelement_generic.hpp"

/**
 * A LogicElement that will sleep for some time.
 */
class LogicElement_Sleep : public LogicElement_Generic
{
private:
  const raw_offset_t in1;
  
public:
  /**
   * Constructor.
   */
  LogicElement_Sleep( const raw_offset_t _in1 ) 
  : in1( _in1 )
  {}
  
  /**
   * Signature.
   */
  const static signature_t signature;
  
  /**
   * Factory
   */
  static LogicElement_Generic* create( ownerPtr_t, const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_Sleep( lexical_cast<raw_offset_t>(p[0]) ); 
  }
  
  /**
   * Do the real work
   */
  void calc( raw_t*const base ) const
  {
    int duration = *reinterpret_cast<int* const>( base + in1 );
    if( duration >= 0 )
    {
      logger( Logger::ALL ) << "sleeping for '" << duration << "' ms;\n"; logger.show();
      timespec ts = { duration / 1000, 1000 * (duration % 1000) };
      logger( Logger::ALL ) << "ts: " << ts.tv_sec << " / " << ts.tv_nsec << ";\n"; logger.show();
      nanosleep( &ts, &ts );
    } else {
      logger( Logger::ERROR ) << "Error during LogicElement_Sleep: duration has to be a"
        "positive number, but it is '" << duration << "'" << std::endl; 
      logger.show();
    }
    ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  /**
   * Export the content in noGrAF format.
   */
  void dump( std::ostream& stream_out ) const;
};

inline void LogicElement_Sleep::dump( std::ostream& stream_out ) const 
{
  stream_out << "sleep( " << in1 << " )" << std::endl; 
}

#endif // LOGICELEMENT_SLEEP_HPP
