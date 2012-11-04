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

#include <string>

#include "variabletype.hpp"

namespace KNX
{
  struct DPT
  {
    int major;
    int minor;
    
    /**
     * Return string represenation of DPT.
     */
    std::string toString( void ) const;
    
    /**
     * Return float represenation of DPT.
     */
    float toFloat( void ) const
    {
      return major + 0.001 * minor;
    }
    
    /**
     * Convert data according to current DPT into a variable_t variable.
     */
    variable_t getVariable( const size_t len, const uint8_t* data ) const;
    
    /**
     * Convert data according to current DPT into a string representing the value.
     */
    std::string getVariableAsString( const size_t len, const uint8_t* data ) const;
    
    /**
     * Convert variable in data into a raw representation in the buf according 
     * to the current DPT.
     * @return The number ob bytes written in the buf.
     */
    size_t setVariable( const size_t max_len, uint8_t* buf, const variable_t& data ) const;
  };
}