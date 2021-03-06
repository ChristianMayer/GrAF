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

#ifndef LOGICELEMENT_MOVE_HPP
#define LOGICELEMENT_MOVE_HPP

#include "logicelement_generic.hpp"

/**
 * A LogicElement that will copy one value over an other.
 */
template <typename T>
class LogicElement_Move : public LogicElement_Generic
{
  const raw_offset_t out;
  const raw_offset_t in;
  
public:
  /**
   * Constructor.
   */
  LogicElement_Move( const raw_offset_t _out, const raw_offset_t _in ) : out(_out), in(_in)
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
    return new LogicElement_Move<T>( lexical_cast<raw_offset_t>(p[0]), lexical_cast<raw_offset_t>(p[1]) ); 
  }
  
  /**
   * Do the real work
   */
  void calc ( raw_t*const base ) const
  {
    T &_out = *reinterpret_cast<T* const>( base + out );
    T &_in  = *reinterpret_cast<T* const>( base + in  );
    
    _out = _in;
    
    ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  /**
   * Export the content in noGrAF format.
   */
  void dump( std::ostream& stream_out ) const;
};

template <typename T>
const typename LogicElement_Move<T>::signature_t LogicElement_Move<T>::signature { OFFSET, OFFSET };

template <typename T>
void LogicElement_Move<T>::dump( std::ostream& stream_out ) const 
{
  stream_out << "move<";
  stream_out << variableType::getTypeName(variableType::getType<T>());
  stream_out << ">( " << out  << ", " << in << " )" << std::endl; 
}

#endif // LOGICELEMENT_MOVE_HPP
