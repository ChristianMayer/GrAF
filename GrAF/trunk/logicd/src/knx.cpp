/*
 *    Logic engine - helper functions for KNX
 *    Copyright (C) 2012  Christian Mayer <mail at ChristianMayer dot de>
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

#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <limits>

#include <cassert>

#include "knx.hpp"
#include "hexdump.hpp"

namespace KNX
{

  int32_t parseKNXAddr( const std::string& addr )
  {
    int32_t a, b, c;
    unsigned int d;
    if( sscanf( addr.c_str(), "%d/%d/%d", &a, &b, &c ) == 3 )
      return ( ( a & 0x01f ) << 11 ) | ( ( b & 0x07 ) << 8 ) | ( ( c & 0xff ) );
    if( sscanf( addr.c_str(), "%d/%d", &a, &b ) == 2 )
      return ( ( a & 0x01f ) << 11 ) | ( ( b & 0x7FF ) );
    if( sscanf( addr.c_str(), "%x", &d ) == 1 )
      return d & 0xffff;
    return -1; // invalid group address format
  }

  std::string printKNXGroupAddr( const eibaddr_t& addr )
  {
    std::ostringstream out;
    out << ( ( addr >> 11 ) & 0x1f ) << "/" << ( ( addr >> 8 ) & 0x07 ) << "/" << ( ( addr ) & 0xff );
    return out.str();
  }

  std::string printKNXPhysicalAddr( const eibaddr_t& addr )
  {
    std::ostringstream out;
    out << ( ( addr >> 12 ) & 0x0f ) << "." << ( ( addr >> 8 ) & 0x0f ) << "." << ( ( addr ) & 0xff );
    return out.str();
  }

  std::string DPT::toString( void ) const
  {
    std::ostringstream out;
    out << major << "." << std::setw(3) << std::setfill('0') << minor;
    return out.str();
  }
  
  variable_t DPT::getVariable( const size_t len, const uint8_t* data ) const
  {
    switch( major )
    {
      case 1:
      case 2:
      case 3:
        if( 2 == len )
          return variable_t( data[1] & 0x7f );
        break;
        
      case 5:
        if( 3 == len )
          return variable_t( data[2] * 100.f / 255.f );
        break;
        
      case 7:
        if( 4 == len )
          return variable_t( (int(data[2]) << 8) + data[3] );
        break;

      case 9:
        if( 4 == len )
        {
          if( data[2] == 0x7f && data[3] == 0xff ) return std::numeric_limits<float>::quiet_NaN();
          int sign =   data[2] & 0x80;
          int exp  =  (data[2] & 0x78) >> 3;
          int mant = ((data[2] & 0x07) << 8) | data[3];
          if( sign != 0 )
            mant = -(~(mant - 1) & 0x7ff);
          return (1 << exp) * 0.01f * mant;
        }
        break;
        
      case 8:
      case 12:
      case 13:
        return variable_t(); // will be int
        
      case 6:
      case 14:
        return variable_t(); // will be float
        
      case 4:
      case 16:
        return variable_t( "string" );

      // case 10: // time
      // case 11: // date
    }
    return variable_t();
  }
  
  std::string DPT::getVariableAsString( const size_t len, const uint8_t* data ) const
  {
    variable_t v = getVariable( len, data );
    
    switch( v.getType() )
    {
      case variableType::UNKNOWN:
      default:
        return "[unknown]";
        
      case variableType::INT:
        return std::to_string( v.getInt() );
        
      case variableType::FLOAT:
        return std::to_string( v.getFloat() );
        
      case variableType::STRING:
        return v.getString();
    }
  }
  
  GAconf::GAconf( const std::string& file )
  {
    std::string line;
    std::ifstream in( file );
    if( in.is_open() )
    {
      int32_t currentGA;
      while( in.good() )
      {
        std::getline( in, line );
        if( '[' == line[0] )
        {
          size_t pos = line.find_first_of( "]" ); // check if GA is between "[]"
          if( std::string::npos == pos ||
              -1 == ( currentGA = parseKNXAddr( line.substr( 1, pos - 1 ) ) ) )
            std::cerr << "Invalid file format!" << std::endl;
        }
        else if( "name" == line.substr( 0, 4 ) )
        {
          db[ currentGA ].name = line.substr( 7 );
        }
        else if( "DPTSubId" == line.substr( 0, 8 ) )
        {
          std::istringstream parse( line.substr( 11 ) );
          char point;
          parse >> db[ currentGA ].dpt.major >> point >> db[ currentGA ].dpt.minor;
          if( '.' != point )
            std::cerr << "Invalid file format!" << std::endl;
        }
      }
      in.close();
    }
    else
      std::cerr << "Unable to open GA database file at '" << file << '"' << std::endl;
  }

} // end: namespace KNX
