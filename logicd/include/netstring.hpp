/*
 *    Logic engine - helper functions for netstrings 
 *                                        http://cr.yp.to/proto/netstrings.txt
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

#ifndef NETSTRING_HPP
#define NETSTRING_HPP

#include <string>

namespace Netstring
{
  /**
   * Convert a plain std::string to a netstring.
   */
  std::string encode( const std::string& str )
  {
    return std::to_string( str.length() ) + ":" + str + ","; 
  }
  
  /**
   * Convert a netstring to a std::string.
   */
  std::string decode( const std::string& str )
  {
    if( str[0] < '0' || str[0] > '9' )
      return ""; // invalid string - it should start with a number
      
      size_t sep = str.find_first_of( ":" );
    if( std::string::npos == sep ) 
      return ""; // invalid string - it should contain a colon
    
    size_t len = std::stoul( str.substr( 0, sep ) );
    if( str.length() < sep + len + 2 )
      return ""; // invalid string - length is incorrect
      
    return str.substr( sep + 1, len );
  }
}

#endif // NETSTRING_HPP
