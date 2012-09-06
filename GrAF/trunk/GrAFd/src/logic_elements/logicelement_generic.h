/*
    <one line to give the program's name and a brief idea of what it does.>
    Copyright (C) 2012  Christian Mayer <email>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


#ifndef LOGICELEMENT_GENERIC_H
#define LOGICELEMENT_GENERIC_H

#include <vector>
#include <string>

#include "../globals.h"

#include "variabletype.hpp"

class LogicElement_Generic
{
public:
  typedef LogicElement_Generic** iterator;
  typedef const iterator const_iterator;
  
  typedef std::vector< std::string > params_t;
  typedef LogicElement_Generic* (*FactoryType)( const params_t& );
  
  static const raw_offset_t ground = sizeof( LogicElement_Generic* );
  
  virtual ~LogicElement_Generic() {}
  virtual void calc( raw_t* const base ) const = 0;
  virtual void dump( std::ostream& out ) const { out << "<unknown element>" << std::endl; }
};

#endif // LOGICELEMENT_GENERIC_H
