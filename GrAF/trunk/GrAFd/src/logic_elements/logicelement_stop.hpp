/*
 * The Graphic Automation Framework deamon
 * Copyright (C) 2012, 2013  Christian Mayer - mail (at) ChristianMayer (dot) de
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

#ifndef LOGICELEMENT_STOP_HPP
#define LOGICELEMENT_STOP_HPP

#include "logicelement_generic.hpp"

/**
 * A LogicElement that will stop the current calculations.
 */
class LogicElement_Stop : public LogicElement_Generic
{
public:
  /**
   * Do the real work
   */
  void calc( raw_t* const base ) const 
  {
    // end execution by seting LogicElement instruction point to end position
    reinterpret_cast<iterator*>( base )[0] = reinterpret_cast<iterator>SIZE_MAX;
  }
  
  /**
   * Signature.
   */
  const static signature_t signature;
  
  /**
   * Factory
   */
  static LogicElement_Generic* create() 
  { 
    return new LogicElement_Stop; 
  }
  
  /**
   * Export the content in noGrAF format.
   */
  void dump( std::ostream& stream_out ) const;
};

inline void LogicElement_Stop::dump( std::ostream& stream_out ) const 
{
  stream_out << "stop" << std::endl; 
}

#endif // LOGICELEMENT_STOP_HPP
