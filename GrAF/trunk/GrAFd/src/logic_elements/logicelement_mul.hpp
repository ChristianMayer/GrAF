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

#ifndef LOGICELEMENT_MUL_HPP
#define LOGICELEMENT_MUL_HPP

#include "logicelement_generic.hpp"

template <typename T>
class LogicElement_Mul : public LogicElement_Generic
{
  const raw_offset_t out;
  const raw_offset_t in1;
  const raw_offset_t in2;
public:
  LogicElement_Mul( const raw_offset_t _out, const raw_offset_t _in1, const raw_offset_t _in2 ) : out(_out), in1(_in1), in2(_in2)
  {}
  
  /**
   * Factory
   */
  static LogicElement_Generic* create( const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_Mul<T>( lexical_cast<raw_offset_t>(p[0]), 
                                    lexical_cast<raw_offset_t>(p[1]), 
                                    lexical_cast<raw_offset_t>(p[2]) ); 
  }
  
  void calc( raw_t* const base ) const 
  {
    T &_out = *reinterpret_cast<T* const>( base + out );
    T &_in1 = *reinterpret_cast<T* const>( base + in1 );
    T &_in2 = *reinterpret_cast<T* const>( base + in2 );
    
    _out = _in1 * _in2;
    
    ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "mul<";
    stream_out << variableType::getTypeName(variableType::getType<T>());
    stream_out << ">( " << out << ", " << in1 << ", " << in2 << " )" << std::endl; 
  }
};

template <typename T>
class LogicElement_MulAdd : public LogicElement_Generic
{
  const raw_offset_t out;
  const raw_offset_t in1;
  const raw_offset_t in2;
public:
  LogicElement_MulAdd( const raw_offset_t _out, const raw_offset_t _in1, const raw_offset_t _in2 ) : out(_out), in1(_in1), in2(_in2)
  {}
  
  /**
   * Factory
   */
  static LogicElement_Generic* create( const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_MulAdd<T>( lexical_cast<raw_offset_t>(p[0]), 
                                       lexical_cast<raw_offset_t>(p[1]), 
                                       lexical_cast<raw_offset_t>(p[2]) ); 
  }
  
  void calc( raw_t* const base ) const 
  {
    T &_out = *reinterpret_cast<T* const>( base + out );
    T &_in1 = *reinterpret_cast<T* const>( base + in1 );
    T &_in2 = *reinterpret_cast<T* const>( base + in2 );
    
    _out += _in1 * _in2;
    
    ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "muladd<";
    stream_out << variableType::getTypeName(variableType::getType<T>());
    stream_out << ">( " << out << ", " << in1 << ", " << in2 << " )" << std::endl; 
  }
};

template <typename T>
class LogicElement_MulSub : public LogicElement_Generic
{
  const raw_offset_t out;
  const raw_offset_t in1;
  const raw_offset_t in2;
public:
  LogicElement_MulSub( const raw_offset_t _out, const raw_offset_t _in1, const raw_offset_t _in2 ) : out(_out), in1(_in1), in2(_in2)
  {}
  
  /**
   * Factory
   */
  static LogicElement_Generic* create( const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_MulSub<T>( lexical_cast<raw_offset_t>(p[0]), 
                                       lexical_cast<raw_offset_t>(p[1]), 
                                       lexical_cast<raw_offset_t>(p[2]) ); 
  }
  
  void calc( raw_t* const base ) const 
  {
    T &_out = *reinterpret_cast<T* const>( base + out );
    T &_in1 = *reinterpret_cast<T* const>( base + in1 );
    T &_in2 = *reinterpret_cast<T* const>( base + in2 );
    
    _out -= _in1 * _in2;
    
    ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }

  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "mulsub<";
    stream_out << variableType::getTypeName(variableType::getType<T>());
    stream_out << ">( " << out << ", " << in1 << ", " << in2 << " )" << std::endl; 
  }
};

#endif // LOGICELEMENT_MUL_HPP
