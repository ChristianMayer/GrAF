/*
 *    Logic engine
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

#ifndef HEXDUMP_HPP
#define HEXDUMP_HPP

#include <sstream>
#include <iomanip>

/**
 * Return a string containing a hexdump of data with the given length.
 */
inline std::string hexdump( const void* const data, const size_t& length, bool multipleLines = true )
{
  std::stringstream sstr;
 
  sstr << std::hex;       // switch to hex mode
  
  size_t i = 0;
  for( ; i < length; ++i )
  {
    sstr << std::setw(2) << std::setfill('0');
    sstr << (int)(reinterpret_cast<const unsigned char*>(data)[i]) << " ";
    
    if( i % 8 == 7 )      // every 8 numbers an extra space
      sstr << " ";
    
    if( i % 16 == 15 && multipleLines )
      sstr << std::endl;  // after 16 numbers the next line
  }
  
  if( i % 16 != 0 && multipleLines )
    sstr << std::endl;    // add endl if not already done in loop
  
  sstr << std::dec;       // clean up, switch to decimal again
  
  return sstr.str();
}

#endif // HEXDUMP_HPP
