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

#ifndef LOGICELEMENT_SEND_HPP
#define LOGICELEMENT_SEND_HPP

#include "message.hpp"

#include "logicelement_generic.hpp"

/**
 * A LogicElement that will send a value to the bus.
 */
template <typename T>
class LogicElement_Send : public LogicElement_Generic
{
private:
  const raw_offset_t in1;
  const std::string target;
  
public:
  /**
   * Constructor.
   */
  LogicElement_Send( const raw_offset_t _in1, const std::string& _target ) 
  : in1( _in1 ), target( _target )
  {}
  
  /**
   * Signature.
   */
  const static signature_t signature;
  
  /**
   * Factory
   */
  static LogicElement_Generic* create( const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_Send<T>( lexical_cast<raw_offset_t>(p[0]), 
                                     p[1] ); 
  }
  
  /**
   * Do the real work
   */
  void calc( raw_t*const base ) const
  {
    logger( Logger::ALL ) << "sending to '" << target << "' the value '" << *reinterpret_cast<T* const>( base + in1 ) << "';\n";
    logger.show();
    
    LogicMessage msg( target, *reinterpret_cast<T* const>( base + in1 ) );
    msg.send( *sender );
  
    // clean up - catch the reply
    LogicMessage reply = recieveMessage( *sender );
    
    ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  /**
   * Export the content in noGrAF format.
   */
  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "send<";
    stream_out << variableType::getTypeName(variableType::getType<T>());
    stream_out << ">( " << in1 << ", " << target << " )" << std::endl; 
  }
};

template <typename T>
const typename LogicElement_Send<T>::signature_t LogicElement_Send<T>::signature { OFFSET, VARIABLE_T };

#endif // LOGICELEMENT_SEND_HPP
