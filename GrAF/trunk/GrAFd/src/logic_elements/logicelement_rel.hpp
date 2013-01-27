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

#ifndef LOGICELEMENT_REL_HPP
#define LOGICELEMENT_REL_HPP

#include "logicelement_generic.hpp"

/**
 * A LogicElement that will do a relation operation.
 */
template <typename Tout, typename Tin>
class LogicElement_Rel : public LogicElement_Generic
{
public:
  /**
   * Enumerate the possible relations that can be checked for.
   */
  enum relType
  {
    EQUAL,
    NOTEQUAL,
    LESS,
    LESSEQUAL,
    GREATER,
    GREATEREQUAL
  };
  
  /**
   * Convert a std::string to a relation of type relType.
   */
  static relType string2type( const std::string& str )
  {
    if( str.compare( "EQUAL"        ) == 0 ) return EQUAL;
    if( str.compare( "NOTEQUAL"     ) == 0 ) return NOTEQUAL;
    if( str.compare( "LESS"         ) == 0 ) return LESS;
    if( str.compare( "LESSEQUAL"    ) == 0 ) return LESSEQUAL;
    if( str.compare( "GREATER"      ) == 0 ) return GREATER;
    if( str.compare( "GREATEREQUAL" ) == 0 ) return GREATEREQUAL;
    return EQUAL; // default
  }
  
  /**
   * Convert a relation of type relType to a std::string.
   */
  static std::string type2string( const relType& type )
  {
    switch( type )
    {
      case EQUAL:        return "EQUAL";
      case NOTEQUAL:     return "NOTEQUAL";
      case LESS:         return "LESS";
      case LESSEQUAL:    return "LESSEQUAL";
      case GREATER:      return "GREATER";
      case GREATEREQUAL: return "GREATEREQUAL";
    }
    return "EQUAL";
  }
  
private:
  const raw_offset_t out;
  const raw_offset_t in1;
  const raw_offset_t in2;
  const relType type;

public:
  /**
   * Constructor.
   */
  LogicElement_Rel( const raw_offset_t _out, const raw_offset_t _in1, 
                    const raw_offset_t _in2, const relType _type  ) : 
                    out(_out), in1(_in1), in2(_in2), type( _type )
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
    return new LogicElement_Rel<Tout, Tin>( lexical_cast<raw_offset_t>(p[0]),
                                            lexical_cast<raw_offset_t>(p[1]),
                                            lexical_cast<raw_offset_t>(p[2]),
                                            string2type(p[3]) ); 
  }
  
  /**
   * Do the real work
   */
  void calc( raw_t* const base ) const 
  {
    Tout &_out = *reinterpret_cast<Tout* const>( base + out );
    Tin  &_in1 = *reinterpret_cast<Tin * const>( base + in1 );
    Tin  &_in2 = *reinterpret_cast<Tin * const>( base + in2 );
    
    switch( type )
    {
      case EQUAL:
        _out = _in1 == _in2;
        break;
        
      case NOTEQUAL:
        _out = _in1 != _in2;
        break;
        
      case LESS:
        _out = _in1 < _in2;
        break;
        
      case LESSEQUAL:
        _out = _in1 <= _in2;
        break;
        
      case GREATER:
        _out = _in1 > _in2;
        break;
        
      case GREATEREQUAL:
        _out = _in1 >= _in2;
        break;
    }
    
    ++reinterpret_cast<iterator*>( base )[0]; // increase instruction pointer
  }
  
  /**
   * Export the content in noGrAF format.
   */
  void dump( std::ostream& stream_out ) const;
};

template <typename Tout, typename Tin>
const typename LogicElement_Rel<Tout,Tin>::signature_t LogicElement_Rel<Tout,Tin>::signature { OFFSET, OFFSET, OFFSET, VARIABLE_T };

template <typename Tout, typename Tin>
void LogicElement_Rel<Tout,Tin>::dump( std::ostream& stream_out ) const 
{
  stream_out << "rel<";
  stream_out << variableType::getTypeName(variableType::getType<Tout>());
  stream_out << ", ";
  stream_out << variableType::getTypeName(variableType::getType<Tin>());
  stream_out << ">( " << out << ", " << in1 << ", " << in2 << ", " << type2string(type) << " )" << std::endl; 
}

#endif // LOGICELEMENT_REL_HPP
