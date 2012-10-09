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
