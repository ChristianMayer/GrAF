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
  enum type
  {
    UNKNOWN,
    INT,
    FLOAT
  };
  
  template <typename T> inline type getType       () { return UNKNOWN; }
  template <>           inline type getType<int>  () { return INT;     }
  template <>           inline type getType<float>() { return FLOAT;   }
  inline std::string getTypeName( type T )
  {
    switch( T )
    {
      case INT:
        return "int";
      case FLOAT:
        return "float";
      case UNKNOWN:
      default:
        return "unknown";
    }
  }
}

#endif // VARIABLETYPE_HPP