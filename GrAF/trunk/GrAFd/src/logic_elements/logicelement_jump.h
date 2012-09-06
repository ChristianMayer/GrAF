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


#ifndef LOGICELEMENT_JUMP_H
#define LOGICELEMENT_JUMP_H

#include "logicelement_generic.h"

class LogicElement_Jump : public LogicElement_Generic
{
private:
  const long int offset;
  
public:
  LogicElement_Jump( const long int _offset ) 
  : offset( _offset )
  {}
  
  /**
   * Factory
   */
  static LogicElement_Generic* create( const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_Jump( lexical_cast<long int>(p[0]) ); 
  }
  
  void calc( raw_t*const base ) const
  {
    reinterpret_cast<iterator*>( base )[0] += offset; // jump instruction pointer
  }
  
  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "jump( " << offset << " )" << std::endl; 
  }
};

template <typename T>
class LogicElement_JumpTrue : public LogicElement_Generic
{
private:
  const long int offset;
  const raw_offset_t in1;
  
public:
  LogicElement_JumpTrue( const long int _offset, const raw_offset_t _in1 ) 
  : offset( _offset ), in1( _in1 )
  {}
  
  /**
   * Factory
   */
  static LogicElement_Generic* create( const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_JumpTrue<T>( lexical_cast<long int>(p[0]), 
                                         lexical_cast<raw_offset_t>(p[1]) ); 
  }
  
  void calc( raw_t*const base ) const
  {
    if( *reinterpret_cast<T* const>( base + in1 ) > 0 )
      reinterpret_cast<iterator*>( base )[0] += offset; // jump instruction pointer
    else
      ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "jumptrue<";
    stream_out << variableType::getTypeName(variableType::getType<T>());
    stream_out << ">( " << offset << ", " << in1 << " )" << std::endl; 
  }
};

template <typename T>
class LogicElement_JumpZero : public LogicElement_Generic
{
private:
  const long int offset;
  const raw_offset_t in1;
  
public:
  LogicElement_JumpZero( const long int _offset, const raw_offset_t _in1 ) 
  : offset( _offset ), in1( _in1 )
  {}
  
  /**
   * Factory
   */
  static LogicElement_Generic* create( const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_JumpZero<T>( lexical_cast<long int>(p[0]), 
                                         lexical_cast<raw_offset_t>(p[1]) ); 
  }
  
  void calc( raw_t*const base ) const
  {
    if( *reinterpret_cast<T* const>( base + in1 ) == 0 )
      reinterpret_cast<iterator*>( base )[0] += offset; // jump instruction pointer
    else
      ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "jumpzero<";
    stream_out << variableType::getTypeName(variableType::getType<T>());
    stream_out << ">( " << offset << ", " << in1 << " )" << std::endl; 
  }
};

template <typename T>
class LogicElement_JumpEqual : public LogicElement_Generic
{
private:
  const long int offset;
  const raw_offset_t in1;
  const raw_offset_t in2;
  
public:
  LogicElement_JumpEqual( const long int _offset,
                     const raw_offset_t _in1, const raw_offset_t _in2 ) 
  : offset( _offset ), in1( _in1 ), in2( _in2 )
  {}
  
  /**
   * Factory
   */
  static LogicElement_Generic* create( const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_JumpEqual<T>( lexical_cast<long int>(p[0]), 
                                          lexical_cast<raw_offset_t>(p[1]),
                                          lexical_cast<raw_offset_t>(p[2]) ); 
  }
  
  void calc( raw_t*const base ) const
  {
    if( *reinterpret_cast<T* const>( base + in1 ) == *reinterpret_cast<T* const>( base + in2 ) )
      reinterpret_cast<iterator*>( base )[0] += offset; // jump instruction pointer
    else
      ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "jumpequal<";
    stream_out << variableType::getTypeName(variableType::getType<T>());
    stream_out << ">( " << offset << ", " << in1 << ", " << in2 << " )" << std::endl; 
  }
};

template <typename T>
class LogicElement_JumpNotEqual : public LogicElement_Generic
{
private:
  const long int offset;
  const raw_offset_t in1;
  const raw_offset_t in2;
  
public:
  LogicElement_JumpNotEqual( const long int _offset,
                     const raw_offset_t _in1, const raw_offset_t _in2 ) 
  : offset( _offset ), in1( _in1 ), in2( _in2 )
  {}
  
  /**
   * Factory
   */
  static LogicElement_Generic* create( const params_t& p ) 
  { 
    using boost::lexical_cast;
    return new LogicElement_JumpNotEqual<T>( lexical_cast<long int>(p[0]), 
                                             lexical_cast<raw_offset_t>(p[1]),
                                             lexical_cast<raw_offset_t>(p[2]) ); 
  }
  
  void calc( raw_t*const base ) const
  {
    if( (*reinterpret_cast<T* const>( base + in1 )) != (*reinterpret_cast<T* const>( base + in2 )) )
      reinterpret_cast<iterator*>( base )[0] += offset; // jump instruction pointer
    else
      ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "jumpnotequal<";
    stream_out << variableType::getTypeName(variableType::getType<T>());
    stream_out << ">( " << offset << ", " << in1 << ", " << in2 << " )" << std::endl; 
  }
};

#endif // LOGICELEMENT_JUMP_H
