/*
 *    <one line to give the program's name and a brief idea of what it does.>
 *    Copyright (C) 2012  Christian Mayer <email>
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

namespace variableType {
  enum type : uint8_t
  {
    UNKNOWN = 0,
    INT     = 1,
    FLOAT   = 2,
    STRING  = 3
  };
  
  template <typename T> inline type getType             () { return UNKNOWN; }
  template <>           inline type getType<int>        () { return INT;     }
  template <>           inline type getType<float>      () { return FLOAT;   }
  template <>           inline type getType<std::string>() { return STRING;  }
  inline std::string getTypeName( type T )
  {
    switch( T )
    {
      case UNKNOWN:
      default:
        return "unknown";
      case INT:
        return "int";
      case FLOAT:
        return "float";
      case STRING:
        return "string";
    }
  }

  template <type T> struct typeOf {};
  template <> struct typeOf<INT>
  {
    typedef int type;
  };
  template <> struct typeOf<FLOAT>
  {
    typedef float type;
  };
  
  inline size_t sizeOf( type T )
  {
    switch( T )
    {
      case UNKNOWN:
      default:
      case STRING: // FIXME
        return 0;
      case INT:
        return sizeof(int);
      case FLOAT:
        return sizeof(float);
    }
  }
}

class variable_t
{
  variableType::type type;
  union 
  {
    int intValue;
    float floatValue;
    std::string* stringValue;
  };
  
public:
  variable_t() : type( variableType::UNKNOWN ), intValue( 0 )
  {}
  ~variable_t()
  {
    if( variableType::STRING == type )
      delete stringValue;
  }
  /**
   * Assignment operator
   */
  variable_t& operator=(const variable_t& rhs) 
  {
    if( variableType::STRING == type )
      delete stringValue;
    
    type = rhs.getType();
    switch( type )
    {
      case variableType::UNKNOWN:
      default:
        break;
        
      case variableType::INT:
        intValue = rhs.getInt();
        break;
        
      case variableType::FLOAT:
        floatValue = rhs.getFloat();
        break;
        
      case variableType::STRING:
        stringValue = new std::string( rhs.getString() );
        break;
    }
    return *this;
  }
  
  variable_t( int i ) : type( variableType::INT ), intValue( i )
  {}
  variable_t( float f ) : type( variableType::FLOAT ), floatValue( f )
  {}
  variable_t( double f ) : type( variableType::FLOAT ), floatValue( f )
  {}
  variable_t( const std::string& s ) : type( variableType::STRING ), stringValue( new std::string( s ) )
  {}
  
  variableType::type getType( void ) const { return type; }
  std::string getTypeName( void ) const { return variableType::getTypeName( type ); }
  
  /**
   * Return number of bytes needed to represent that type.
   * @param internalLength if set to true the size contains the tailing \0 for a string
   */
  size_t getSize( bool internalLength = false ) const
  {
    switch( type )
    {
      case variableType::UNKNOWN:
      default:
        return 0;
        
      case variableType::INT:
        return sizeof( int );
        
      case variableType::FLOAT:
        return sizeof( float );
        
      case variableType::STRING:
        return stringValue->length() + ( internalLength ? 1 : 0);
    }
  }
  
  int         getInt   ( void ) const { return intValue;     }
  float       getFloat ( void ) const { return floatValue;   }
  std::string getString( void ) const { return *stringValue; }
  
  /**
   * Return the value printed to a string.
   */
  std::string getAsString( void ) const 
  {
    switch( type )
    {
      case variableType::UNKNOWN:
      default:
        return "<UNKNOWN>";
        
      case variableType::INT:
        return std::to_string( intValue );
        
      case variableType::FLOAT:
        return std::to_string( floatValue );
        
      case variableType::STRING:
        return *stringValue;
    }
  }
};

#endif // VARIABLETYPE_HPP