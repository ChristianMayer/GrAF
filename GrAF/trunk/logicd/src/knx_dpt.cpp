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
#include <sstream>
#include <iomanip>
#include <limits>

#include "knx_dpt.hpp"

using namespace KNX;

std::string DPT::toString( void ) const
{
  std::ostringstream out;
  out << major << "." << std::setw( 3 ) << std::setfill( '0' ) << minor;
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
        switch( minor )
        {
          case 1:
            return variable_t( data[2] * 100.f / 255.f );

          case 10:
          default:
            return variable_t( data[2] );
        }
      break;

    case 7:
      if( 4 == len )
        return variable_t( ( int( data[2] ) << 8 ) + data[3] );
      break;

    case 9:
      if( 4 == len )
      {
        if( data[2] == 0x7f && data[3] == 0xff ) return std::numeric_limits<float>::quiet_NaN();
        int sign =   data[2] & 0x80;
        int exp  = ( data[2] & 0x78 ) >> 3;
        int mant = ( ( data[2] & 0x07 ) << 8 ) | data[3];
        if( sign != 0 )
          mant = -( ~( mant - 1 ) & 0x7ff );
        return ( 1 << exp ) * 0.01f * mant;
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

size_t DPT::setVariable( const size_t max_len, uint8_t* buf, const variable_t& data ) const
{
  switch( major )
  {
    case 1:
    case 2:
    case 3:
      if( 1 <= max_len )
      {
        buf[0] = 0x80 | ( data.getInt() & 0x7f );
        return 1;
      }
      break;

    case 5:
      if( 2 <= max_len )
        switch( minor )
        {
          case 1:
            buf[0] = 0x80;
            buf[1] = uint8_t( data.getFloat() * 255.f / 100.f + 0.5f );
            return 2;

          case 10:
          default:
            buf[0] = 0x80;
            buf[1] = uint8_t( data.getInt() );
            return 2;
        }
      break;

    case 7:
      if( 3 <= max_len )
      {
        int d = data.getInt();
        buf[0] = 0x80;
        buf[1] = d >> 8;
        buf[2] = d & 0xff;
        return 3;
      }
      break;

    case 9:
      return 0; // not implemented, so no bytes changed... will be float
      
    case 8:
    case 12:
    case 13:
      return 0; // not implemented, so no bytes changed... will be int

    case 6:
    case 14:
      return 0; // not implemented, so no bytes changed... will be float

    case 4:
    case 16:
      return 0; // not implemented, so no bytes changed... will be string

      // case 10: // time
      // case 11: // date
  }

  return 0; // no bytes changed...
}