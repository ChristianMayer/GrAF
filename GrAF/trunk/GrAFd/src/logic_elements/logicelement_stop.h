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

#ifndef LOGICELEMENT_STOP_H
#define LOGICELEMENT_STOP_H

#include "logicelement_generic.h"

class LogicElement_Stop : public LogicElement_Generic
{
public:
  void calc( raw_t* const base ) const 
  {
    // end execution by seting LogicElement instruction point to end position
    reinterpret_cast<iterator*>( base )[0] = reinterpret_cast<iterator>SIZE_MAX;
  }
  
  /**
   * Factory
   */
  static LogicElement_Generic* create() 
  { 
    return new LogicElement_Stop; 
  }
  
  void dump( std::ostream& stream_out ) const 
  {
    stream_out << "stop" << std::endl; 
  }
};

#endif // LOGICELEMENT_STOP_H
