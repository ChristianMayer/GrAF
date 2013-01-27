/*
 *    <one line to give the program's name and a brief idea of what it does.>
 *    Copyright (C) 2012, 2013  Christian Mayer <email>
 * 
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation, either version 3 of the License, or
 *    (at your option) any later version.
 * 
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 * 
 *    You should have received a copy of the GNU General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


#ifndef VARIABLETYPE_HPP
#define VARIABLETYPE_HPP

#include <cassert>
#include <string>

namespace variableType {
  enum type : uint8_t
  {
    UNKNOWN = 0,
    BOOL    = 1,
    INT     = 2,
    FLOAT   = 3,
    STRING  = 4
  };
  constexpr const char* names[] = 
  { 
    "unknown", 
    "bool", 
    "int", 
    "float", 
    "string"
  };
  constexpr const size_t size[] =
  {
    0,   // unknown
    sizeof( bool         ),
    sizeof( int          ),
    sizeof( float        ),
    sizeof( std::string* )
  };

  template <typename T> constexpr type getType             () { return UNKNOWN; }
  template <>           constexpr type getType<bool>       () { return BOOL;    }
  template <>           constexpr type getType<int>        () { return INT;     }
  template <>           constexpr type getType<float>      () { return FLOAT;   }
  template <>           constexpr type getType<std::string>() { return STRING;  }
  constexpr const char* getTypeName( type T )
  {
    return names[ T ];
  }
  
  template <type T> struct typeOf {};
  template <> struct typeOf<BOOL>
  {
    typedef bool type;
  };
  template <> struct typeOf<INT>
  {
    typedef int type;
  };
  template <> struct typeOf<FLOAT>
  {
    typedef float type;
  };
  
  constexpr size_t sizeOf( type T )
  {
    return size[ T ];
  }
}

class variable_t
{
  variableType::type type;
  union 
  {
    bool boolValue;
    int intValue;
    float floatValue;
    std::string* stringValue;
  };
  
public:
  /**
   * Default constructor.
   */
  variable_t()
  : type( variableType::UNKNOWN ),
    intValue( 0 )
  {}
  
  /**
   * Destructor.
   */
  ~variable_t()
  {
    if( variableType::STRING == type )
      delete stringValue;
  }
  
  /**
   * Copy operator
   */
  variable_t( const variable_t& other );
  
  /**
   * Move operator
   */
  variable_t( variable_t&& other );
  
  /**
   * Copy Assignment operator
   */
  variable_t& operator=( const variable_t& other );
  
  /**
   * Move assignment.
   */
  variable_t& operator=( variable_t&& other );
  
  explicit variable_t( bool b ) 
  : type( variableType::BOOL ), boolValue( b )
  {}
  explicit variable_t( int i ) 
  : type( variableType::INT ), intValue( i )
  {}
  explicit variable_t( float f ) 
  : type( variableType::FLOAT ), floatValue( f )
  {}
  explicit variable_t( double f ) 
  : type( variableType::FLOAT ), floatValue( f )
  {}
  explicit variable_t( const std::string& s ) 
  : type( variableType::STRING ), stringValue( new std::string( s ) )
  {}
  
  variableType::type getType( void ) const 
  { return type; }
  
  std::string getTypeName( void ) const 
  { return variableType::getTypeName( type ); }
  
  /**
   * Return number of bytes needed to represent that type.
   * @param internalLength if set to true the size contains the tailing \0 for a
   * string.
   */
  size_t getSize( bool internalLength = false ) const;
  
  bool        getBool  ( void ) const 
  { assert( variableType::BOOL   == type ); return boolValue;    }
  int         getInt   ( void ) const 
  { assert( variableType::INT    == type ); return intValue;     }
  float       getFloat ( void ) const 
  { assert( variableType::FLOAT  == type ); return floatValue;   }
  std::string getString( void ) const 
  { assert( variableType::STRING == type ); return *stringValue; }
  
  /**
   * Return the value printed to a string.
   * @param JSON When true, format the output as a JSON object, i.e. a pure
   *             number or an escaped string
   */
  std::string getAsString( bool JSON = false ) const;
  
  /**
   * Write the value to raw memory.
   */
  void getRaw( void* raw ) const;
};

inline variable_t::variable_t( const variable_t& other )
: type( other.type )
{
  switch( type )
  {
    case variableType::UNKNOWN:
    default:
      return;
      
    case variableType::BOOL:
      boolValue = other.boolValue;
      return;
      
    case variableType::INT:
      intValue = other.intValue;
      return;
      
    case variableType::FLOAT:
      floatValue = other.floatValue;
      return;
      
    case variableType::STRING:
      stringValue = new std::string( *other.stringValue );
      return;
  }
}

inline variable_t::variable_t( variable_t&& other )
: type( other.type )
{
  switch( type )
  {
    case variableType::UNKNOWN:
    default:
      return;
      
    case variableType::BOOL:
      boolValue = other.boolValue;
      return;
      
    case variableType::INT:
      intValue = other.intValue;
      return;
      
    case variableType::FLOAT:
      floatValue = other.floatValue;
      return;
      
    case variableType::STRING:
      stringValue = new std::string;
      stringValue->swap( *other.stringValue );
      return;
  }
}

inline variable_t& variable_t::operator=( const variable_t& other ) 
{
  if( variableType::STRING == type )
    delete stringValue;
  
  type = other.getType();
  switch( type )
  {
    case variableType::UNKNOWN:
    default:
      break;
      
    case variableType::BOOL:
      boolValue = other.getBool();
      break;
      
    case variableType::INT:
      intValue = other.getInt();
      break;
      
    case variableType::FLOAT:
      floatValue = other.getFloat();
      break;
      
    case variableType::STRING:
      stringValue = new std::string( other.getString() );
      break;
  }
  return *this;
}

inline variable_t& variable_t::operator=( variable_t&& other )
{
  type = other.type;
  switch( type )
  {
    case variableType::UNKNOWN:
    default:
      break;
      
    case variableType::BOOL:
      boolValue = other.boolValue;
      break;
      
    case variableType::INT:
      intValue = other.intValue;
      break;
      
    case variableType::FLOAT:
      floatValue = other.floatValue;
      break;
      
    case variableType::STRING:
      stringValue = new std::string;
      stringValue->swap( *other.stringValue );
      break;
  }
  return *this;
}

inline size_t variable_t::getSize( bool internalLength ) const
{
  return variableType::STRING == type 
  ? ( stringValue->length() + ( internalLength ? 1 : 0) ) 
  : variableType::sizeOf( type );
}

inline std::string variable_t::getAsString( bool JSON ) const 
{
  std::string retVal;
  switch( type )
  {
    case variableType::UNKNOWN:
    default:
      retVal = "<UNKNOWN>";
      break;
      
    case variableType::BOOL:
      retVal = boolValue ? "true" : "false";
      break;
      
    case variableType::INT:
      retVal = std::to_string( intValue );
      break;
      
    case variableType::FLOAT:
      retVal = std::to_string( floatValue );
      break;
      
    case variableType::STRING:
      if( JSON )
        retVal = "\"" + *stringValue + "\"";
      else
        retVal = *stringValue;
      break;
  }
  return retVal;
}

inline void variable_t::getRaw( void* raw ) const
{
  switch( type )
  {
    case variableType::UNKNOWN:
    case variableType::STRING:
      return;
      
    case variableType::BOOL:
      *reinterpret_cast<bool*>( raw ) = boolValue;
      return;
      
    case variableType::INT:
      *reinterpret_cast<int*>( raw ) = intValue;
      return;
      
    case variableType::FLOAT:
      *reinterpret_cast<float*>( raw ) = floatValue;
      return;
  }
}

namespace variableType {
  template <typename T> inline 
  T get( const variable_t& v ) { return T(); }
  template <>           inline 
  bool        get<bool>        ( const variable_t& v ) { return v.getBool();   }
  template <>           inline 
  int         get<int>         ( const variable_t& v ) { return v.getInt();    }
  template <>           inline 
  float       get<float>       ( const variable_t& v ) { return v.getFloat();  }
  template <>           inline 
  std::string get<std::string> ( const variable_t& v ) { return v.getString(); }
}

#endif // VARIABLETYPE_HPP