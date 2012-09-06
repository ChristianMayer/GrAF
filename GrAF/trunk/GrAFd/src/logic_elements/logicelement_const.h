/*
    <one line to give the program's name and a brief idea of what it does.>
    Copyright (C) 2012  Christian Mayer <email>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


#ifndef LOGICELEMENT_CONST_H
#define LOGICELEMENT_CONST_H

#include "logicelement_generic.h"

#include <boost/lexical_cast.hpp>


template <typename T>
class LogicElement_Const : public LogicElement_Generic
{
  const raw_offset_t out;
  const T value;
  
public:
  LogicElement_Const( const raw_offset_t _out, const T _value ) : out(_out), value( _value )
  {}

  /**
   * Factory
   */
  static LogicElement_Generic* create( const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_Const<T>( lexical_cast<raw_offset_t>(p[0]), lexical_cast<T>(p[1]) ); 
  }
  
  void calc( raw_t* const base ) const 
  {
    T &_out = *reinterpret_cast<T* const>( base + out );
    
    _out = value;
    
    ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "const<";
    stream_out << variableType::getTypeName(variableType::getType<T>());
    stream_out << ">( " << out << ", " << value << " )" << std::endl; 
  }
};

#endif // LOGICELEMENT_CONST_H
